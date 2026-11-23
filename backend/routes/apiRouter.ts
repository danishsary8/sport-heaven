import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  CATEGORY_DIRECTORY,
  MOCK_STORE_CATALOG,
  STORE_BRANCHES,
  getCatalogProductBySlug,
} from '../../src/lib/mock-store/catalog.ts';
import { calculateProMemberProgress } from '../../src/utils/loyaltyTier.ts';
import { calculatePurchaseInsights } from '../../src/utils/purchaseInsights.ts';
import {
  optionalAuth,
  requireAuth,
  type AuthRequest,
} from '../middleware/auth.ts';
import { dispatchOrderNotifications } from '../notifications/notificationService.ts';
import {
  listInventoryOverrides,
  mergeInventoryOverridesIntoCatalog,
} from '../repositories/adminRepository.ts';
import {
  createOrderRecord,
  createProductQuestion,
  createUserAddress,
  createUserPaymentMethod,
  createUserRmaRequest,
  deleteUserAddress,
  deleteUserPaymentMethod,
  findOrderForTracking,
  getOrCreateUser,
  listProductQuestions,
  listUserAddresses,
  listUserOrders,
  listUserPaymentMethods,
  listUserRmaRequests,
  listUserWishlist,
  replaceUserWishlist,
  setDefaultUserPaymentMethod,
  updateUserAddress,
  updateUserProfile,
} from '../repositories/storeRepository.ts';
import {
  addressCreateSchema,
  addressPatchSchema,
  createOrderSchema,
  paymentCreateSchema,
  productQuestionCreateSchema,
  profileUpdateSchema,
  rmaCreateSchema,
  trackOrderSchema,
  wishlistSyncSchema,
} from '../validators/schemas.ts';

export const apiRouter = Router();

function handleRouteError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }
  next(error);
}

// ---------------------------------------------------------------------------
// Public Storefront & Health Endpoints
// ---------------------------------------------------------------------------

apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'sport-castle-backend',
    timestamp: new Date().toISOString(),
  });
});

apiRouter.get('/catalog', async (req: Request, res: Response) => {
  const category =
    typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const brand =
    typeof req.query.brand === 'string' ? req.query.brand.trim().toLowerCase() : '';
  const query =
    typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

  let overrides: Awaited<ReturnType<typeof listInventoryOverrides>> = [];
  try {
    overrides = await listInventoryOverrides();
  } catch (error) {
    console.warn(
      '[Catalog] Falling back to base catalog without DB inventory overrides:',
      error instanceof Error ? error.message : 'unknown error',
    );
  }

  let items = mergeInventoryOverridesIntoCatalog(MOCK_STORE_CATALOG, overrides);
  if (category && category !== 'all') {
    items = items.filter((p) => p.category === category);
  }
  if (brand) {
    items = items.filter((p) => p.brand.toLowerCase() === brand);
  }
  if (query) {
    items = items.filter((p) =>
      `${p.name} ${p.brand} ${p.club ?? ''} ${p.colorway} ${p.category}`
        .toLowerCase()
        .includes(query),
    );
  }

  res.json({
    products: items,
    total: items.length,
    categories: CATEGORY_DIRECTORY,
    branches: STORE_BRANCHES,
  });
});

apiRouter.get('/catalog/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug ?? '').trim();
  const baseProduct = getCatalogProductBySlug(slug);
  if (!baseProduct) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  let overrides: Awaited<ReturnType<typeof listInventoryOverrides>> = [];
  try {
    overrides = await listInventoryOverrides();
  } catch {
    overrides = [];
  }

  const [product] = mergeInventoryOverridesIntoCatalog([baseProduct], overrides);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  res.json({ product });
});

apiRouter.get('/questions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId =
      typeof req.query.productId === 'string' && req.query.productId.trim()
        ? req.query.productId.trim()
        : undefined;
    const questions = await listProductQuestions(productId);
    res.json({ questions });
  } catch (error) {
    handleRouteError(error, res, next);
  }
});

apiRouter.post(
  '/questions',
  optionalAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = productQuestionCreateSchema.parse(req.body);
      const question = await createProductQuestion(parsed, req.user?.uid ?? null);
      res.status(201).json({ question });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

// ---------------------------------------------------------------------------
// Orders & Public Order Tracking
// ---------------------------------------------------------------------------

apiRouter.post(
  '/orders',
  optionalAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createOrderSchema.parse(req.body);
      if (req.user) {
        await getOrCreateUser({
          uid: req.user.uid,
          email: req.user.email ?? parsed.customer.email ?? 'member@sportcastle.kh',
          fullName: req.user.name ?? parsed.customer.fullName,
          photoUrl: req.user.picture,
        });
      }
      const order = await createOrderRecord(parsed, req.user?.uid ?? null);
      void dispatchOrderNotifications({
        eventType: 'order_created',
        order,
      }).catch((err) => {
        console.error(
          '[Orders] Failed dispatching order_created notification:',
          err,
        );
      });
      res.status(201).json({ order });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.post(
  '/orders/track',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId, email } = trackOrderSchema.parse(req.body);
      const order = await findOrderForTracking(orderId, email);
      if (!order) {
        res.status(404).json({
          error: 'No order matching that Order ID and email address was found.',
        });
        return;
      }
      res.json({ order });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

// ---------------------------------------------------------------------------
// Authenticated Member Endpoints (Firebase ID Token + PostgreSQL)
// ---------------------------------------------------------------------------

apiRouter.get(
  '/account/bootstrap',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const uid = req.user!.uid;
      const profile = await getOrCreateUser({
        uid,
        email: req.user!.email ?? `${uid}@sportcastle.kh`,
        fullName: req.user!.name,
        photoUrl: req.user!.picture,
      });

      const [addresses, savedPayments, wishlist, orders, rmaRequests] =
        await Promise.all([
          listUserAddresses(uid),
          listUserPaymentMethods(uid),
          listUserWishlist(uid),
          listUserOrders(uid),
          listUserRmaRequests(uid),
        ]);

      const loyalty = calculateProMemberProgress(orders);
      const purchaseInsights = calculatePurchaseInsights(orders);

      res.json({
        profile,
        addresses,
        savedPayments,
        wishlist,
        orders,
        rmaRequests,
        loyalty,
        purchaseInsights,
      });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.get(
  '/account/profile',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const uid = req.user!.uid;
      const profile = await getOrCreateUser({
        uid,
        email: req.user!.email ?? `${uid}@sportcastle.kh`,
        fullName: req.user!.name,
        photoUrl: req.user!.picture,
      });
      res.json({ profile });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.put(
  '/account/profile',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const uid = req.user!.uid;
      await getOrCreateUser({
        uid,
        email: req.user!.email ?? `${uid}@sportcastle.kh`,
        fullName: req.user!.name,
        photoUrl: req.user!.picture,
      });
      const parsed = profileUpdateSchema.parse(req.body);
      const profile = await updateUserProfile(uid, parsed);
      res.json({ profile });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.get(
  '/account/addresses',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const addresses = await listUserAddresses(req.user!.uid);
      res.json({ addresses });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.post(
  '/account/addresses',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const uid = req.user!.uid;
      await getOrCreateUser({
        uid,
        email: req.user!.email ?? `${uid}@sportcastle.kh`,
        fullName: req.user!.name,
        photoUrl: req.user!.picture,
      });
      const parsed = addressCreateSchema.parse(req.body);
      const address = await createUserAddress(uid, parsed);
      res.status(201).json({ address });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.patch(
  '/account/addresses/:id',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = addressPatchSchema.parse(req.body);
      const addressId = String(req.params.id ?? '').trim();
      const updated = await updateUserAddress(req.user!.uid, addressId, parsed);
      if (!updated) {
        res.status(404).json({ error: 'Address not found' });
        return;
      }
      res.json({ address: updated });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.delete(
  '/account/addresses/:id',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const addressId = String(req.params.id ?? '').trim();
      const deleted = await deleteUserAddress(req.user!.uid, addressId);
      if (!deleted) {
        res.status(404).json({ error: 'Address not found' });
        return;
      }
      res.json({ deleted: true });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.get(
  '/account/payments',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const payments = await listUserPaymentMethods(req.user!.uid);
      res.json({ payments });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.post(
  '/account/payments',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const uid = req.user!.uid;
      await getOrCreateUser({
        uid,
        email: req.user!.email ?? `${uid}@sportcastle.kh`,
        fullName: req.user!.name,
        photoUrl: req.user!.picture,
      });
      const parsed = paymentCreateSchema.parse(req.body);
      const payment = await createUserPaymentMethod(uid, parsed);
      res.status(201).json({ payment });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.patch(
  '/account/payments/:id/default',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const paymentId = String(req.params.id ?? '').trim();
      const updated = await setDefaultUserPaymentMethod(req.user!.uid, paymentId);
      if (!updated) {
        res.status(404).json({ error: 'Payment method not found' });
        return;
      }
      res.json({ updated: true });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.delete(
  '/account/payments/:id',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const paymentId = String(req.params.id ?? '').trim();
      const deleted = await deleteUserPaymentMethod(req.user!.uid, paymentId);
      if (!deleted) {
        res.status(404).json({ error: 'Payment method not found' });
        return;
      }
      res.json({ deleted: true });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.get(
  '/account/wishlist',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const productIds = await listUserWishlist(req.user!.uid);
      res.json({ productIds });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.put(
  '/account/wishlist',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const uid = req.user!.uid;
      await getOrCreateUser({
        uid,
        email: req.user!.email ?? `${uid}@sportcastle.kh`,
        fullName: req.user!.name,
        photoUrl: req.user!.picture,
      });
      const { productIds } = wishlistSyncSchema.parse(req.body);
      const saved = await replaceUserWishlist(uid, productIds);
      res.json({ productIds: saved });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.get(
  '/orders',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orders = await listUserOrders(req.user!.uid);
      res.json({ orders });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.get(
  '/rma',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const rmaRequests = await listUserRmaRequests(req.user!.uid);
      res.json({ rmaRequests });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

apiRouter.post(
  '/rma',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const uid = req.user!.uid;
      await getOrCreateUser({
        uid,
        email: req.user!.email ?? `${uid}@sportcastle.kh`,
        fullName: req.user!.name,
        photoUrl: req.user!.picture,
      });
      const parsed = rmaCreateSchema.parse(req.body);
      const rmaRequest = await createUserRmaRequest(uid, parsed);
      void dispatchOrderNotifications({
        eventType: 'rma_created',
        rma: rmaRequest,
        recipientEmailOverride: req.user!.email ?? null,
      }).catch((err) => {
        console.error(
          '[RMA] Failed dispatching rma_created notification:',
          err,
        );
      });
      res.status(201).json({ rmaRequest });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);
