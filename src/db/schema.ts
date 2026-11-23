import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// 1. Club Members (linked directly by Firebase Auth UID)
export const users = pgTable('users', {
  uid: text('uid').primaryKey(),
  email: text('email').notNull(),
  role: text('role').notNull().default('member'), // 'member' | 'admin'
  fullName: text('full_name').notNull().default('Sport Castle Member'),
  phone: text('phone').notNull().default('+855 12 000 000'),
  telegram: text('telegram').notNull().default(''),
  preferredBootSize: text('preferred_boot_size').notNull().default('EU 42'),
  preferredJerseySize: text('preferred_jersey_size').notNull().default('M'),
  homeBranch: text('home_branch').notNull().default('sonthormuk'),
  savedKhan: text('saved_khan').notNull().default('Khan Toul Kork'),
  savedAddress: text('saved_address').notNull().default(''),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Saved Phnom Penh Delivery & Billing Addresses
export const addresses = pgTable('addresses', {
  id: text('id').primaryKey(),
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  type: text('type').notNull().default('shipping'),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  khan: text('khan').notNull(),
  sangkat: text('sangkat').notNull().default(''),
  streetAddress: text('street_address').notNull(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Tokenized Payment Vault (stores masked last4 & token only, never raw card numbers)
export const paymentMethods = pgTable('payment_methods', {
  id: text('id').primaryKey(),
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'card' | 'aba-khqr' | 'wing'
  brand: text('brand').notNull(),
  last4: text('last4').notNull(),
  expiry: text('expiry'),
  holderName: text('holder_name').notNull(),
  vaultToken: text('vault_token').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Member Saved Gear Wishlist
export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    alertsEnabled: boolean('alerts_enabled').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('wishlist_user_product_idx').on(table.userUid, table.productId),
  ],
);

// 5. Orders (supports both signed-in member orders and guest checkout orders)
export const orders = pgTable('orders', {
  id: text('id').primaryKey(), // e.g., SC-8942
  userUid: text('user_uid').references(() => users.uid, {
    onDelete: 'set null',
  }),
  customerEmail: text('customer_email').notNull(),
  status: text('status').notNull().default('Confirmed'),
  paymentStatus: text('payment_status').notNull().default('pending'), // 'pending' | 'paid' | 'failed' | 'refunded'
  paymentReference: text('payment_reference'),
  paidAt: timestamp('paid_at'),
  fulfillmentMethod: text('fulfillment_method').notNull().default('delivery'),
  pickupBranch: text('pickup_branch'),
  paymentMethod: text('payment_method').notNull().default('aba-khqr'),
  customerDetails: jsonb('customer_details').notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
  teamDiscount: doublePrecision('team_discount').notNull().default(0),
  promoDiscount: doublePrecision('promo_discount').notNull().default(0),
  promoCode: text('promo_code'),
  giftNote: text('gift_note'),
  shippingFee: doublePrecision('shipping_fee').notNull().default(0),
  totalUsd: doublePrecision('total_usd').notNull(),
  totalKhr: integer('total_khr').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Order Line Items (normalized for Purchase Insights & Heat-Press tracking)
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  lineId: text('line_id').notNull(),
  productId: text('product_id').notNull(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  brand: text('brand').notNull(),
  category: text('category').notNull(),
  colorway: text('colorway').notNull(),
  image: text('image').notNull(),
  size: text('size').notNull(),
  basePrice: doublePrecision('base_price').notNull(),
  unitPrice: doublePrecision('unit_price').notNull(),
  quantity: integer('quantity').notNull(),
  customPrint: jsonb('custom_print'),
  giftCardMeta: jsonb('gift_card_meta'),
});

// 7. Returns & Exchanges (RMA Requests)
export const rmaRequests = pgTable('rma_requests', {
  rmaId: text('rma_id').primaryKey(),
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  orderId: text('order_id').notNull(),
  items: jsonb('items').notNull(),
  reason: text('reason').notNull(),
  resolution: text('resolution').notNull(), // 'refund' | 'size-exchange' | 'store-credit'
  totalRefund: doublePrecision('total_refund').notNull(),
  labelCode: text('label_code').notNull(),
  status: text('status').notNull().default('Label Generated'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Product Specialist Q&A
export const productQuestions = pgTable('product_questions', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  userUid: text('user_uid').references(() => users.uid, {
    onDelete: 'set null',
  }),
  author: text('author').notNull(),
  question: text('question').notNull(),
  answer: text('answer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. Payment Gateway Webhook Audit & Idempotency Log (ABA KHQR / Stripe)
export const paymentWebhookEvents = pgTable(
  'payment_webhook_events',
  {
    id: serial('id').primaryKey(),
    provider: text('provider').notNull(), // 'aba-khqr' | 'stripe'
    providerEventId: text('provider_event_id').notNull(),
    eventType: text('event_type').notNull(),
    orderId: text('order_id').references(() => orders.id, {
      onDelete: 'set null',
    }),
    amountUsd: doublePrecision('amount_usd'),
    currency: text('currency').notNull().default('USD'),
    signatureValid: boolean('signature_valid').notNull().default(false),
    processingStatus: text('processing_status').notNull().default('processed'), // 'processed' | 'ignored' | 'rejected' | 'failed'
    payload: jsonb('payload').notNull(),
    errorMessage: text('error_message'),
    receivedAt: timestamp('received_at').defaultNow().notNull(),
    processedAt: timestamp('processed_at'),
  },
  (table) => [
    uniqueIndex('payment_webhook_provider_event_idx').on(
      table.provider,
      table.providerEventId,
    ),
  ],
);

// 10. Admin Catalog Inventory & Price Overrides (merged onto live /api/catalog)
export const inventoryOverrides = pgTable('inventory_overrides', {
  productId: text('product_id').primaryKey(),
  priceUsd: doublePrecision('price_usd'),
  originalPriceUsd: doublePrecision('original_price_usd'),
  sonthormukStock: text('sonthormuk_stock'), // 'In Stock' | 'Low Stock' | 'Out of Stock'
  sensokStock: text('sensok_stock'),
  chomkadongStock: text('chomkadong_stock'),
  unitsAvailable: integer('units_available'),
  isArchived: boolean('is_archived').notNull().default(false),
  updatedByUid: text('updated_by_uid').references(() => users.uid, {
    onDelete: 'set null',
  }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 11. Automated Outbound Notification Delivery Logs (Telegram & Email)
export const notificationLogs = pgTable('notification_logs', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id, {
    onDelete: 'set null',
  }),
  channel: text('channel').notNull(), // 'telegram' | 'email'
  eventType: text('event_type').notNull(), // 'order_created' | 'payment_confirmed' | 'status_updated' | 'rma_created' | 'admin_test'
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  status: text('status').notNull(), // 'sent' | 'skipped' | 'failed'
  providerMessageId: text('provider_message_id'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  sentAt: timestamp('sent_at'),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  paymentMethods: many(paymentMethods),
  wishlistItems: many(wishlistItems),
  orders: many(orders),
  rmaRequests: many(rmaRequests),
  inventoryUpdates: many(inventoryOverrides),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userUid],
    references: [users.uid],
  }),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  user: one(users, {
    fields: [paymentMethods.userUid],
    references: [users.uid],
  }),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, {
    fields: [wishlistItems.userUid],
    references: [users.uid],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userUid],
    references: [users.uid],
  }),
  items: many(orderItems),
  webhookEvents: many(paymentWebhookEvents),
  notifications: many(notificationLogs),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export const rmaRequestsRelations = relations(rmaRequests, ({ one }) => ({
  user: one(users, {
    fields: [rmaRequests.userUid],
    references: [users.uid],
  }),
}));

export const paymentWebhookEventsRelations = relations(
  paymentWebhookEvents,
  ({ one }) => ({
    order: one(orders, {
      fields: [paymentWebhookEvents.orderId],
      references: [orders.id],
    }),
  }),
);

export const inventoryOverridesRelations = relations(
  inventoryOverrides,
  ({ one }) => ({
    updatedBy: one(users, {
      fields: [inventoryOverrides.updatedByUid],
      references: [users.uid],
    }),
  }),
);

export const notificationLogsRelations = relations(
  notificationLogs,
  ({ one }) => ({
    order: one(orders, {
      fields: [notificationLogs.orderId],
      references: [orders.id],
    }),
  }),
);
