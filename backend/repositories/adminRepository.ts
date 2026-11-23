import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../src/db/index.ts';
import {
  inventoryOverrides,
  notificationLogs,
  orderItems,
  orders,
  paymentWebhookEvents,
  users,
} from '../../src/db/schema.ts';
import type {
  BranchId,
  CartItem,
  CustomerDetails,
  Order,
  PaymentMethod,
  Product,
  StockLevel,
} from '../../src/types/store.ts';
import type {
  NormalizedPaymentWebhookOutcome,
  OrderPaymentStatus,
} from '../payments/webhookCrypto.ts';

export interface AdminOrderRecord extends Order {
  userUid: string | null;
  customerEmail: string;
  paymentStatus: OrderPaymentStatus;
  paymentReference: string | null;
  paidAt: string | null;
}

export interface InventoryOverrideRecord {
  productId: string;
  priceUsd: number | null;
  originalPriceUsd: number | null;
  sonthormukStock: StockLevel | null;
  sensokStock: StockLevel | null;
  chomkadongStock: StockLevel | null;
  unitsAvailable: number | null;
  isArchived: boolean;
  updatedByUid: string | null;
  updatedAt: string;
}

export interface AdminInventoryItem {
  product: Product;
  override: InventoryOverrideRecord | null;
  unitsAvailable: number | null;
  isArchived: boolean;
}

export interface AdminOverviewStats {
  totalOrders: number;
  paidOrders: number;
  pendingPayments: number;
  activeFulfillmentOrders: number;
  paidRevenueUsd: number;
  totalCatalogRevenueUsd: number;
  inventoryOverridesCount: number;
  archivedProductsCount: number;
  webhookEventsCount: number;
  notificationsSentCount: number;
  notificationsFailedCount: number;
}

export interface WebhookEventAuditRecord {
  id: number;
  provider: string;
  providerEventId: string;
  eventType: string;
  orderId: string | null;
  amountUsd: number | null;
  currency: string;
  signatureValid: boolean;
  processingStatus: string;
  errorMessage: string | null;
  receivedAt: string;
  processedAt: string | null;
}

export interface NotificationAuditRecord {
  id: string;
  orderId: string | null;
  channel: string;
  eventType: string;
  recipient: string;
  subject: string;
  status: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface PaymentWebhookProcessResult {
  duplicate: boolean;
  orderUpdated: boolean;
  order: AdminOrderRecord | null;
  webhookEvent: WebhookEventAuditRecord;
}

function sanitizeDbError(context: string, error: unknown): Error {
  console.error(`[AdminRepository] ${context} failed:`, error);
  return new Error(`Unable to complete ${context}. Please try again later.`, {
    cause: error,
  });
}

function normalizeStockLevel(value: string | null | undefined): StockLevel | null {
  if (!value) return null;
  if (value === 'Low Stock') return 'Limited Stock';
  if (
    value === 'In Stock' ||
    value === 'Limited Stock' ||
    value === 'Out of Stock'
  ) {
    return value;
  }
  return null;
}

function mapAdminOrderRow(
  orderRow: typeof orders.$inferSelect,
  itemRows: Array<typeof orderItems.$inferSelect>,
): AdminOrderRecord {
  const mappedItems: CartItem[] = itemRows.map((item) => ({
    lineId: item.lineId,
    productId: item.productId,
    slug: item.slug,
    name: item.name,
    brand: item.brand,
    category: item.category as CartItem['category'],
    colorway: item.colorway,
    image: item.image,
    size: item.size,
    basePrice: item.basePrice,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    customPrint:
      (item.customPrint as CartItem['customPrint'] | null) ?? undefined,
    giftCardMeta:
      (item.giftCardMeta as CartItem['giftCardMeta'] | null) ?? undefined,
  }));

  return {
    id: orderRow.id,
    userUid: orderRow.userUid ?? null,
    customerEmail: orderRow.customerEmail,
    createdAt: orderRow.createdAt.toISOString(),
    status: orderRow.status as Order['status'],
    paymentStatus: (orderRow.paymentStatus as OrderPaymentStatus) || 'pending',
    paymentReference: orderRow.paymentReference ?? null,
    paidAt: orderRow.paidAt ? orderRow.paidAt.toISOString() : null,
    fulfillmentMethod:
      orderRow.fulfillmentMethod === 'pickup' ? 'pickup' : 'delivery',
    pickupBranch: (orderRow.pickupBranch as BranchId | null) ?? undefined,
    customer: orderRow.customerDetails as CustomerDetails,
    paymentMethod: orderRow.paymentMethod as PaymentMethod,
    items: mappedItems,
    subtotal: orderRow.subtotal,
    teamDiscount: orderRow.teamDiscount,
    promoDiscount: orderRow.promoDiscount,
    promoCode: orderRow.promoCode ?? undefined,
    giftNote: orderRow.giftNote ?? undefined,
    shippingFee: orderRow.shippingFee,
    totalUsd: orderRow.totalUsd,
    totalKhr: orderRow.totalKhr,
  };
}

function mapInventoryOverrideRow(
  row: typeof inventoryOverrides.$inferSelect,
): InventoryOverrideRecord {
  return {
    productId: row.productId,
    priceUsd: row.priceUsd ?? null,
    originalPriceUsd: row.originalPriceUsd ?? null,
    sonthormukStock: normalizeStockLevel(row.sonthormukStock),
    sensokStock: normalizeStockLevel(row.sensokStock),
    chomkadongStock: normalizeStockLevel(row.chomkadongStock),
    unitsAvailable: row.unitsAvailable ?? null,
    isArchived: row.isArchived,
    updatedByUid: row.updatedByUid ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapWebhookRow(
  row: typeof paymentWebhookEvents.$inferSelect,
): WebhookEventAuditRecord {
  return {
    id: row.id,
    provider: row.provider,
    providerEventId: row.providerEventId,
    eventType: row.eventType,
    orderId: row.orderId ?? null,
    amountUsd: row.amountUsd ?? null,
    currency: row.currency,
    signatureValid: row.signatureValid,
    processingStatus: row.processingStatus,
    errorMessage: row.errorMessage ?? null,
    receivedAt: row.receivedAt.toISOString(),
    processedAt: row.processedAt ? row.processedAt.toISOString() : null,
  };
}

function mapNotificationRow(
  row: typeof notificationLogs.$inferSelect,
): NotificationAuditRecord {
  return {
    id: row.id,
    orderId: row.orderId ?? null,
    channel: row.channel,
    eventType: row.eventType,
    recipient: row.recipient,
    subject: row.subject,
    status: row.status,
    providerMessageId: row.providerMessageId ?? null,
    errorMessage: row.errorMessage ?? null,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt ? row.sentAt.toISOString() : null,
  };
}

/**
 * Pure helper: merges persisted Cloud SQL inventory overrides into the storefront catalog.
 * Archived products are filtered out for public storefront views unless `includeArchived` is true.
 */
export function mergeInventoryOverridesIntoCatalog<T extends Product>(
  products: readonly T[],
  overrides: readonly InventoryOverrideRecord[],
  options?: { includeArchived?: boolean },
): T[] {
  if (overrides.length === 0) {
    return [...products];
  }

  const byProductId = new Map<string, InventoryOverrideRecord>();
  for (const ov of overrides) {
    byProductId.set(ov.productId, ov);
  }

  const merged: T[] = [];
  for (const product of products) {
    const ov = byProductId.get(product.id);
    if (!ov) {
      merged.push(product);
      continue;
    }

    if (ov.isArchived && !options?.includeArchived) {
      continue;
    }

    merged.push({
      ...product,
      price: ov.priceUsd !== null ? ov.priceUsd : product.price,
      originalPrice:
        ov.originalPriceUsd !== null
          ? ov.originalPriceUsd
          : product.originalPrice,
      branchStock: {
        sonthormuk: ov.sonthormukStock ?? product.branchStock.sonthormuk,
        sensok: ov.sensokStock ?? product.branchStock.sensok,
        chomkadong: ov.chomkadongStock ?? product.branchStock.chomkadong,
      },
    });
  }

  return merged;
}

/**
 * Checks whether the verified Firebase user is an Admin in Cloud SQL.
 * If their verified email matches the initial owner/ADMIN_EMAILS allowlist,
 * persists `role = 'admin'` in `users`.
 */
export async function checkAndSyncUserAdminRole(params: {
  uid: string;
  email?: string;
  fullName?: string;
  photoUrl?: string;
  isAllowlistedAdminEmail: boolean;
}): Promise<boolean> {
  try {
    const cleanEmail = (params.email ?? `${params.uid}@sportcastle.kh`)
      .trim()
      .toLowerCase();

    if (params.isAllowlistedAdminEmail) {
      const displayName =
        params.fullName?.trim() || cleanEmail.split('@')[0] || 'Sport Castle Admin';
      await db
        .insert(users)
        .values({
          uid: params.uid,
          email: cleanEmail,
          role: 'admin',
          fullName: displayName,
          photoUrl: params.photoUrl ?? null,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email: cleanEmail,
            role: 'admin',
            updatedAt: new Date(),
          },
        });
      return true;
    }

    const existing = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.uid, params.uid))
      .limit(1);

    return existing[0]?.role === 'admin';
  } catch (error) {
    throw sanitizeDbError('admin authorization lookup', error);
  }
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  try {
    const [orderAgg] = await db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        paidOrders: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'paid')::int`,
        pendingPayments: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'pending')::int`,
        activeFulfillmentOrders: sql<number>`count(*) filter (where ${orders.status} <> 'Delivered')::int`,
        paidRevenueUsd: sql<number>`coalesce(sum(${orders.totalUsd}) filter (where ${orders.paymentStatus} = 'paid'), 0)::float`,
        totalCatalogRevenueUsd: sql<number>`coalesce(sum(${orders.totalUsd}), 0)::float`,
      })
      .from(orders);

    const [invAgg] = await db
      .select({
        inventoryOverridesCount: sql<number>`count(*)::int`,
        archivedProductsCount: sql<number>`count(*) filter (where ${inventoryOverrides.isArchived} = true)::int`,
      })
      .from(inventoryOverrides);

    const [webhookAgg] = await db
      .select({
        webhookEventsCount: sql<number>`count(*)::int`,
      })
      .from(paymentWebhookEvents);

    const [notifAgg] = await db
      .select({
        notificationsSentCount: sql<number>`count(*) filter (where ${notificationLogs.status} = 'sent')::int`,
        notificationsFailedCount: sql<number>`count(*) filter (where ${notificationLogs.status} = 'failed')::int`,
      })
      .from(notificationLogs);

    return {
      totalOrders: orderAgg?.totalOrders ?? 0,
      paidOrders: orderAgg?.paidOrders ?? 0,
      pendingPayments: orderAgg?.pendingPayments ?? 0,
      activeFulfillmentOrders: orderAgg?.activeFulfillmentOrders ?? 0,
      paidRevenueUsd: Number((orderAgg?.paidRevenueUsd ?? 0).toFixed(2)),
      totalCatalogRevenueUsd: Number(
        (orderAgg?.totalCatalogRevenueUsd ?? 0).toFixed(2),
      ),
      inventoryOverridesCount: invAgg?.inventoryOverridesCount ?? 0,
      archivedProductsCount: invAgg?.archivedProductsCount ?? 0,
      webhookEventsCount: webhookAgg?.webhookEventsCount ?? 0,
      notificationsSentCount: notifAgg?.notificationsSentCount ?? 0,
      notificationsFailedCount: notifAgg?.notificationsFailedCount ?? 0,
    };
  } catch (error) {
    throw sanitizeDbError('admin overview statistics', error);
  }
}

export async function listAllOrdersForAdmin(filters?: {
  status?: string;
  paymentStatus?: string;
  limit?: number;
}): Promise<AdminOrderRecord[]> {
  try {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(orders.status, filters.status));
    }
    if (filters?.paymentStatus) {
      conditions.push(eq(orders.paymentStatus, filters.paymentStatus));
    }

    const rows = await db.query.orders.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(orders.createdAt)],
      limit: Math.min(Math.max(filters?.limit ?? 50, 1), 200),
      with: { items: true },
    });

    return rows.map((row) => mapAdminOrderRow(row, row.items));
  } catch (error) {
    throw sanitizeDbError('admin order list', error);
  }
}

export async function updateOrderStatusAsAdmin(
  orderId: string,
  patch: {
    status?: Order['status'];
    paymentStatus?: OrderPaymentStatus;
    paymentReference?: string;
  },
): Promise<AdminOrderRecord | null> {
  try {
    const cleanId = orderId.trim().toUpperCase();
    const updatedRows = await db
      .update(orders)
      .set({
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.paymentStatus !== undefined
          ? {
              paymentStatus: patch.paymentStatus,
              ...(patch.paymentStatus === 'paid'
                ? { paidAt: sql`coalesce(${orders.paidAt}, now())` }
                : {}),
            }
          : {}),
        ...(patch.paymentReference !== undefined
          ? { paymentReference: patch.paymentReference }
          : {}),
      })
      .where(eq(orders.id, cleanId))
      .returning();

    if (!updatedRows[0]) {
      return null;
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, updatedRows[0].id));

    return mapAdminOrderRow(updatedRows[0], items);
  } catch (error) {
    throw sanitizeDbError('admin order status update', error);
  }
}

export async function listInventoryOverrides(): Promise<
  InventoryOverrideRecord[]
> {
  try {
    const rows = await db
      .select()
      .from(inventoryOverrides)
      .orderBy(desc(inventoryOverrides.updatedAt));
    return rows.map(mapInventoryOverrideRow);
  } catch (error) {
    throw sanitizeDbError('inventory overrides lookup', error);
  }
}

export async function upsertInventoryOverride(
  productId: string,
  input: {
    priceUsd?: number | null;
    originalPriceUsd?: number | null;
    sonthormukStock?: StockLevel | null;
    sensokStock?: StockLevel | null;
    chomkadongStock?: StockLevel | null;
    unitsAvailable?: number | null;
    isArchived?: boolean;
  },
  adminUid: string,
): Promise<InventoryOverrideRecord> {
  try {
    const cleanProductId = productId.trim();
    const now = new Date();

    const rows = await db
      .insert(inventoryOverrides)
      .values({
        productId: cleanProductId,
        priceUsd: input.priceUsd ?? null,
        originalPriceUsd: input.originalPriceUsd ?? null,
        sonthormukStock: input.sonthormukStock ?? null,
        sensokStock: input.sensokStock ?? null,
        chomkadongStock: input.chomkadongStock ?? null,
        unitsAvailable: input.unitsAvailable ?? null,
        isArchived: input.isArchived ?? false,
        updatedByUid: adminUid,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: inventoryOverrides.productId,
        set: {
          ...(input.priceUsd !== undefined ? { priceUsd: input.priceUsd } : {}),
          ...(input.originalPriceUsd !== undefined
            ? { originalPriceUsd: input.originalPriceUsd }
            : {}),
          ...(input.sonthormukStock !== undefined
            ? { sonthormukStock: input.sonthormukStock }
            : {}),
          ...(input.sensokStock !== undefined
            ? { sensokStock: input.sensokStock }
            : {}),
          ...(input.chomkadongStock !== undefined
            ? { chomkadongStock: input.chomkadongStock }
            : {}),
          ...(input.unitsAvailable !== undefined
            ? { unitsAvailable: input.unitsAvailable }
            : {}),
          ...(input.isArchived !== undefined
            ? { isArchived: input.isArchived }
            : {}),
          updatedByUid: adminUid,
          updatedAt: now,
        },
      })
      .returning();

    return mapInventoryOverrideRow(rows[0]);
  } catch (error) {
    throw sanitizeDbError('inventory override upsert', error);
  }
}

export async function deleteInventoryOverride(
  productId: string,
): Promise<boolean> {
  try {
    const deleted = await db
      .delete(inventoryOverrides)
      .where(eq(inventoryOverrides.productId, productId.trim()))
      .returning({ productId: inventoryOverrides.productId });
    return deleted.length > 0;
  } catch (error) {
    throw sanitizeDbError('inventory override deletion', error);
  }
}

export async function recordPaymentWebhookAndApplyOrderUpdate(params: {
  outcome: NormalizedPaymentWebhookOutcome;
  rawPayload: unknown;
  signatureValid: boolean;
}): Promise<PaymentWebhookProcessResult> {
  try {
    const { outcome, rawPayload, signatureValid } = params;

    return await db.transaction(async (tx) => {
      // Idempotency check on unique (provider, provider_event_id)
      const existing = await tx
        .select()
        .from(paymentWebhookEvents)
        .where(
          and(
            eq(paymentWebhookEvents.provider, outcome.provider),
            eq(paymentWebhookEvents.providerEventId, outcome.providerEventId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        return {
          duplicate: true,
          orderUpdated: false,
          order: null,
          webhookEvent: mapWebhookRow(existing[0]),
        };
      }

      const now = new Date();
      const inserted = await tx
        .insert(paymentWebhookEvents)
        .values({
          provider: outcome.provider,
          providerEventId: outcome.providerEventId,
          eventType: outcome.eventType,
          orderId: null,
          amountUsd: outcome.amountUsd,
          currency: outcome.currency,
          signatureValid,
          processingStatus: 'ignored',
          payload: rawPayload as Record<string, unknown>,
          errorMessage: null,
          processedAt: now,
        })
        .onConflictDoNothing({
          target: [
            paymentWebhookEvents.provider,
            paymentWebhookEvents.providerEventId,
          ],
        })
        .returning();

      if (!inserted[0]) {
        const racedExisting = await tx
          .select()
          .from(paymentWebhookEvents)
          .where(
            and(
              eq(paymentWebhookEvents.provider, outcome.provider),
              eq(paymentWebhookEvents.providerEventId, outcome.providerEventId),
            ),
          )
          .limit(1);

        return {
          duplicate: true,
          orderUpdated: false,
          order: null,
          webhookEvent: mapWebhookRow(racedExisting[0]),
        };
      }

      let matchedOrder: AdminOrderRecord | null = null;
      let orderUpdated = false;
      let resolvedOrderId: string | null = null;
      let processingStatus: 'processed' | 'ignored' = 'ignored';
      let errorMessage: string | null = null;

      if (outcome.orderId && outcome.paymentStatus) {
        const orderRow = await tx.query.orders.findFirst({
          where: eq(orders.id, outcome.orderId),
          with: { items: true },
        });

        if (orderRow) {
          resolvedOrderId = orderRow.id;

          const updatedOrders = await tx
            .update(orders)
            .set({
              paymentStatus: outcome.paymentStatus,
              paymentReference:
                outcome.paymentReference ?? orderRow.paymentReference,
              paidAt:
                outcome.paymentStatus === 'paid'
                  ? (orderRow.paidAt ?? now)
                  : orderRow.paidAt,
            })
            .where(eq(orders.id, orderRow.id))
            .returning();

          if (updatedOrders[0]) {
            matchedOrder = mapAdminOrderRow(updatedOrders[0], orderRow.items);
            orderUpdated = true;
            processingStatus = 'processed';
          }
        } else {
          processingStatus = 'ignored';
          errorMessage = `Order ${outcome.orderId} not found in database`;
        }
      }

      const finalized = await tx
        .update(paymentWebhookEvents)
        .set({
          orderId: resolvedOrderId,
          processingStatus,
          errorMessage,
          processedAt: now,
        })
        .where(eq(paymentWebhookEvents.id, inserted[0].id))
        .returning();

      return {
        duplicate: false,
        orderUpdated,
        order: matchedOrder,
        webhookEvent: mapWebhookRow(finalized[0] ?? inserted[0]),
      };
    });
  } catch (error) {
    throw sanitizeDbError('payment webhook settlement', error);
  }
}

export async function listPaymentWebhookEvents(
  limit = 50,
): Promise<WebhookEventAuditRecord[]> {
  try {
    const rows = await db
      .select()
      .from(paymentWebhookEvents)
      .orderBy(desc(paymentWebhookEvents.receivedAt))
      .limit(Math.min(Math.max(limit, 1), 200));
    return rows.map(mapWebhookRow);
  } catch (error) {
    throw sanitizeDbError('payment webhook audit lookup', error);
  }
}

export async function listNotificationLogs(
  limit = 50,
): Promise<NotificationAuditRecord[]> {
  try {
    const rows = await db
      .select()
      .from(notificationLogs)
      .orderBy(desc(notificationLogs.createdAt))
      .limit(Math.min(Math.max(limit, 1), 200));
    return rows.map(mapNotificationRow);
  } catch (error) {
    throw sanitizeDbError('notification audit log lookup', error);
  }
}
