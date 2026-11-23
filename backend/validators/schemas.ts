import { z } from 'zod';

const branchIdSchema = z.enum(['sonthormuk', 'sensok', 'chomkadong']);
const fulfillmentMethodSchema = z.enum(['delivery', 'pickup']);
const paymentMethodSchema = z.enum([
  'aba-khqr',
  'wing-acleda',
  'apple-pay',
  'google-pay',
  'paypal',
  'card',
  'cod',
]);
const productCategorySchema = z.enum([
  'boots',
  'jerseys',
  'f1',
  'balls',
  'essentials',
]);

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(180).optional(),
  phone: z.string().trim().max(40).optional(),
  telegram: z.string().trim().max(64).optional(),
  preferredBootSize: z.string().trim().max(24).optional(),
  preferredJerseySize: z.string().trim().max(16).optional(),
  homeBranch: branchIdSchema.optional(),
  savedKhan: z.string().trim().max(80).optional(),
  savedAddress: z.string().trim().max(240).optional(),
});

export const addressCreateSchema = z.object({
  label: z.string().trim().min(1).max(80),
  type: z.enum(['shipping', 'billing']).default('shipping'),
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(4).max(40),
  khan: z.string().trim().min(1).max(80),
  sangkat: z.string().trim().max(80).default(''),
  streetAddress: z.string().trim().min(2).max(240),
  coordinates: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  isDefault: z.boolean().default(false),
});

export const addressPatchSchema = addressCreateSchema.partial();

export const paymentCreateSchema = z.object({
  type: z.enum(['card', 'aba-khqr', 'wing']),
  brand: z.string().trim().min(1).max(60),
  last4: z.string().regex(/^\d{4}$/, 'Last 4 digits must be numeric'),
  expiry: z.string().trim().max(12).optional(),
  holderName: z.string().trim().min(1).max(120),
  isDefault: z.boolean().default(false),
});

export const wishlistSyncSchema = z.object({
  productIds: z.array(z.string().trim().min(1).max(100)).max(200),
});

const customPrintSchema = z
  .object({
    enabled: z.boolean(),
    playerName: z.string().max(24),
    squadNumber: z.string().max(4),
    patch: z.enum(['none', 'ucl', 'cpl', 'aff', 'champions', 'f1-paddock']),
    fontStyle: z
      .enum(['pro-condensed', 'classic-block', 'motorsport-aero'])
      .optional(),
  })
  .optional();

const orderItemSchema = z.object({
  lineId: z.string().trim().min(1).max(160),
  productId: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(160),
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().min(1).max(80),
  category: productCategorySchema,
  colorway: z.string().trim().max(120).default(''),
  image: z.string().trim().max(400).default(''),
  size: z.string().trim().min(1).max(40),
  basePrice: z.number().min(0).max(50000),
  unitPrice: z.number().min(0).max(50000),
  quantity: z.number().int().min(1).max(100),
  customPrint: customPrintSchema,
  giftCardMeta: z
    .object({
      format: z.enum(['digital', 'physical']),
      recipientEmail: z.string().max(180),
      recipientName: z.string().max(120),
      message: z.string().max(500),
      deliveryDate: z.string().max(40),
    })
    .optional(),
});

export const createOrderSchema = z.object({
  id: z.string().trim().min(3).max(40).optional(),
  status: z
    .enum(['Confirmed', 'Heat-Press Printing', 'Rider Dispatched', 'Delivered'])
    .optional(),
  fulfillmentMethod: fulfillmentMethodSchema,
  pickupBranch: branchIdSchema.optional(),
  paymentMethod: paymentMethodSchema,
  customer: z.object({
    fullName: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(180).optional(),
    phone: z.string().trim().min(4).max(40),
    telegram: z.string().trim().max(64).default(''),
    khan: z.string().trim().max(80).default('Khan Toul Kork'),
    sangkat: z.string().trim().max(80).default(''),
    streetAddress: z.string().trim().max(240).default(''),
    coordinates: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
    notes: z.string().trim().max(400).default(''),
    isGuest: z.boolean().optional(),
  }),
  items: z.array(orderItemSchema).min(1).max(50),
  subtotal: z.number().min(0),
  teamDiscount: z.number().min(0).default(0),
  promoDiscount: z.number().min(0).default(0),
  promoCode: z.string().trim().max(40).optional(),
  giftNote: z.string().trim().max(400).optional(),
  shippingFee: z.number().min(0).default(0),
  totalUsd: z.number().min(0),
  totalKhr: z.number().int().min(0),
});

export const trackOrderSchema = z.object({
  orderId: z.string().trim().min(3).max(40),
  email: z.string().trim().email().max(180),
});

export const rmaCreateSchema = z.object({
  orderId: z.string().trim().min(3).max(40),
  items: z
    .array(
      z.object({
        lineId: z.string().trim().min(1),
        name: z.string().trim().min(1),
        size: z.string().trim().min(1),
        quantity: z.number().int().min(1),
        refundAmount: z.number().min(0),
      }),
    )
    .min(1),
  reason: z.string().trim().min(2).max(200),
  resolution: z.enum(['refund', 'size-exchange', 'store-credit']),
  totalRefund: z.number().min(0),
});

export const productQuestionCreateSchema = z.object({
  productId: z.string().trim().min(1).max(120),
  author: z.string().trim().min(1).max(80),
  question: z.string().trim().min(3).max(600),
});

const orderStatusSchema = z.enum([
  'Confirmed',
  'Heat-Press Printing',
  'Rider Dispatched',
  'Delivered',
]);

const orderPaymentStatusSchema = z.enum([
  'pending',
  'paid',
  'failed',
  'refunded',
]);

const stockLevelSchema = z
  .enum(['In Stock', 'Limited Stock', 'Low Stock', 'Out of Stock'])
  .transform((val) => (val === 'Low Stock' ? 'Limited Stock' : val));

export const abaKhqrWebhookSchema = z.object({
  eventId: z.string().trim().min(1).max(160).optional(),
  tran_id: z.string().trim().min(2).max(120),
  order_id: z.string().trim().min(2).max(80).optional(),
  status: z.union([z.string().trim().min(1).max(40), z.number()]),
  amount: z.coerce.number().min(0).max(1000000),
  currency: z.string().trim().min(3).max(8).default('USD'),
  apv: z.string().trim().max(120).optional(),
});

export const stripeWebhookSchema = z.object({
  id: z.string().trim().min(3).max(160),
  type: z.string().trim().min(3).max(120),
  data: z.object({
    object: z
      .object({
        id: z.string().trim().max(160).optional(),
        amount_received: z.number().min(0).optional(),
        amount_total: z.number().min(0).optional(),
        amount: z.number().min(0).optional(),
        currency: z.string().trim().max(12).optional(),
        metadata: z.record(z.string(), z.string().optional()).optional(),
        client_reference_id: z.string().trim().max(120).nullable().optional(),
        payment_intent: z.string().trim().max(160).nullable().optional(),
      })
      .passthrough(),
  }),
});

export const adminOrderStatusUpdateSchema = z
  .object({
    status: orderStatusSchema.optional(),
    paymentStatus: orderPaymentStatusSchema.optional(),
    paymentReference: z.string().trim().min(1).max(120).optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.paymentStatus !== undefined ||
      data.paymentReference !== undefined,
    {
      message:
        'At least one of status, paymentStatus, or paymentReference is required',
    },
  );

export const adminInventoryUpsertSchema = z.object({
  priceUsd: z.number().min(0).max(50000).nullable().optional(),
  originalPriceUsd: z.number().min(0).max(50000).nullable().optional(),
  sonthormukStock: stockLevelSchema.nullable().optional(),
  sensokStock: stockLevelSchema.nullable().optional(),
  chomkadongStock: stockLevelSchema.nullable().optional(),
  unitsAvailable: z.number().int().min(0).max(100000).nullable().optional(),
  isArchived: z.boolean().optional(),
});

export const adminTestNotificationSchema = z.object({
  recipientEmail: z.string().trim().email().max(180).optional(),
  message: z.string().trim().min(1).max(500).optional(),
});

