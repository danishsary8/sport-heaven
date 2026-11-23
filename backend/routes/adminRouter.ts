import { Router } from 'express';
import type { NextFunction, Response } from 'express';
import { ZodError } from 'zod';
import { MOCK_STORE_CATALOG } from '../../src/lib/mock-store/catalog.ts';
import {
  createRequireAdminMiddleware,
  createRequireAuthMiddleware,
  type AuthRequest,
  type CheckAdminRoleFn,
  type VerifyIdTokenFn,
} from '../middleware/auth.ts';
import { dispatchOrderNotifications } from '../notifications/notificationService.ts';
import {
  deleteInventoryOverride,
  getAdminOverviewStats,
  listAllOrdersForAdmin,
  listInventoryOverrides,
  listNotificationLogs,
  listPaymentWebhookEvents,
  mergeInventoryOverridesIntoCatalog,
  updateOrderStatusAsAdmin,
  upsertInventoryOverride,
  type AdminInventoryItem,
} from '../repositories/adminRepository.ts';
import {
  adminInventoryUpsertSchema,
  adminOrderStatusUpdateSchema,
  adminTestNotificationSchema,
} from '../validators/schemas.ts';

export interface AdminRouterDeps {
  verifyToken?: VerifyIdTokenFn;
  checkAdminRole?: CheckAdminRoleFn;
  getOverviewStats?: typeof getAdminOverviewStats;
  listOrders?: typeof listAllOrdersForAdmin;
  updateOrderStatus?: typeof updateOrderStatusAsAdmin;
  listOverrides?: typeof listInventoryOverrides;
  upsertOverride?: typeof upsertInventoryOverride;
  deleteOverride?: typeof deleteInventoryOverride;
  listWebhooks?: typeof listPaymentWebhookEvents;
  listNotifications?: typeof listNotificationLogs;
  dispatchNotifications?: typeof dispatchOrderNotifications;
}

function handleAdminError(
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

export function createAdminRouter(deps?: AdminRouterDeps) {
  const router = Router();

  const authGuard = createRequireAuthMiddleware(deps?.verifyToken);
  const adminGuard = createRequireAdminMiddleware(deps?.checkAdminRole);

  const getOverview = deps?.getOverviewStats ?? getAdminOverviewStats;
  const listOrders = deps?.listOrders ?? listAllOrdersForAdmin;
  const updateOrderStatus =
    deps?.updateOrderStatus ?? updateOrderStatusAsAdmin;
  const listOverrides = deps?.listOverrides ?? listInventoryOverrides;
  const upsertOverride = deps?.upsertOverride ?? upsertInventoryOverride;
  const deleteOverride = deps?.deleteOverride ?? deleteInventoryOverride;
  const listWebhooks = deps?.listWebhooks ?? listPaymentWebhookEvents;
  const listNotifications = deps?.listNotifications ?? listNotificationLogs;
  const dispatchNotifications =
    deps?.dispatchNotifications ?? dispatchOrderNotifications;

  // Enforce server-side authentication + administrator RBAC on every /api/admin/* route
  router.use(authGuard, adminGuard);

  router.get(
    '/overview',
    async (_req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const stats = await getOverview();
        res.json({ overview: stats });
      } catch (error) {
        handleAdminError(error, res, next);
      }
    },
  );

  router.get(
    '/orders',
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const status =
          typeof req.query.status === 'string' && req.query.status.trim()
            ? req.query.status.trim()
            : undefined;
        const paymentStatus =
          typeof req.query.paymentStatus === 'string' &&
          req.query.paymentStatus.trim()
            ? req.query.paymentStatus.trim()
            : undefined;
        const rawLimit =
          typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
        const limit =
          Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 50;

        const orders = await listOrders({ status, paymentStatus, limit });
        res.json({ orders, total: orders.length });
      } catch (error) {
        handleAdminError(error, res, next);
      }
    },
  );

  router.patch(
    '/orders/:id/status',
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const orderId = String(req.params.id ?? '').trim();
        if (!orderId) {
          res.status(400).json({ error: 'Order ID is required' });
          return;
        }

        const parsed = adminOrderStatusUpdateSchema.parse(req.body);
        const updated = await updateOrderStatus(orderId, parsed);
        if (!updated) {
          res.status(404).json({ error: 'Order not found' });
          return;
        }

        void dispatchNotifications({
          eventType: 'status_updated',
          order: updated,
          paymentReference: updated.paymentReference,
        }).catch((err) => {
          console.error(
            '[AdminRouter] Failed dispatching status_updated notification:',
            err,
          );
        });

        res.json({ order: updated });
      } catch (error) {
        handleAdminError(error, res, next);
      }
    },
  );

  router.get(
    '/inventory',
    async (_req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const overrides = await listOverrides();
        const overrideMap = new Map(overrides.map((o) => [o.productId, o]));
        const mergedCatalog = mergeInventoryOverridesIntoCatalog(
          MOCK_STORE_CATALOG,
          overrides,
          { includeArchived: true },
        );

        const items: AdminInventoryItem[] = mergedCatalog.map((product) => {
          const override = overrideMap.get(product.id) ?? null;
          return {
            product,
            override,
            unitsAvailable: override?.unitsAvailable ?? null,
            isArchived: override?.isArchived ?? false,
          };
        });

        res.json({
          items,
          total: items.length,
          overridesCount: overrides.length,
          archivedCount: overrides.filter((o) => o.isArchived).length,
        });
      } catch (error) {
        handleAdminError(error, res, next);
      }
    },
  );

  router.put(
    '/inventory/:productId',
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const productId = String(req.params.productId ?? '').trim();
        const baseProduct = MOCK_STORE_CATALOG.find((p) => p.id === productId);
        if (!baseProduct) {
          res.status(404).json({ error: 'Catalog product not found' });
          return;
        }

        const parsed = adminInventoryUpsertSchema.parse(req.body);
        const override = await upsertOverride(
          productId,
          parsed,
          req.user!.uid,
        );
        const [mergedProduct] = mergeInventoryOverridesIntoCatalog(
          [baseProduct],
          [override],
          { includeArchived: true },
        );

        res.json({
          override,
          product: mergedProduct,
        });
      } catch (error) {
        handleAdminError(error, res, next);
      }
    },
  );

  router.delete(
    '/inventory/:productId',
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const productId = String(req.params.productId ?? '').trim();
        const deleted = await deleteOverride(productId);
        if (!deleted) {
          res.status(404).json({ error: 'Inventory override not found' });
          return;
        }
        res.json({ deleted: true, productId });
      } catch (error) {
        handleAdminError(error, res, next);
      }
    },
  );

  router.get(
    '/webhooks',
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const rawLimit =
          typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
        const limit =
          Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 50;
        const events = await listWebhooks(limit);
        res.json({ events, total: events.length });
      } catch (error) {
        handleAdminError(error, res, next);
      }
    },
  );

  router.get(
    '/notifications',
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const rawLimit =
          typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
        const limit =
          Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 50;
        const logs = await listNotifications(limit);
        res.json({ notifications: logs, total: logs.length });
      } catch (error) {
        handleAdminError(error, res, next);
      }
    },
  );

  router.post(
    '/notifications/test',
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const parsed = adminTestNotificationSchema.parse(req.body ?? {});
        const deliveries = await dispatchNotifications({
          eventType: 'admin_test',
          recipientEmailOverride: parsed.recipientEmail ?? req.user?.email ?? null,
          customMessage: parsed.message,
        });
        res.json({ deliveries });
      } catch (error) {
        handleAdminError(error, res, next);
      }
    },
  );

  return router;
}
