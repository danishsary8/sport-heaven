import { and, desc, eq, sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../../src/db/index.ts';
import {
  addresses,
  orderItems,
  orders,
  paymentMethods,
  productQuestions,
  rmaRequests,
  users,
  wishlistItems,
} from '../../src/db/schema.ts';
import type {
  BranchId,
  CartItem,
  CustomerDetails,
  MemberProfile,
  Order,
  PaymentMethod,
  ProductQuestion,
  RmaRequest,
  SavedAddress,
  SavedPaymentMethod,
} from '../../src/types/store.ts';
import type { z } from 'zod';
import type {
  addressCreateSchema,
  addressPatchSchema,
  createOrderSchema,
  paymentCreateSchema,
  productQuestionCreateSchema,
  profileUpdateSchema,
  rmaCreateSchema,
} from '../validators/schemas.ts';

function sanitizeDbError(context: string, error: unknown): Error {
  console.error(`[StoreRepository] ${context} failed:`, error);
  return new Error(`Unable to complete ${context}. Please try again later.`, {
    cause: error,
  });
}

function mapUserToProfile(row: typeof users.$inferSelect): MemberProfile {
  return {
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    telegram: row.telegram,
    preferredBootSize: row.preferredBootSize,
    preferredJerseySize: row.preferredJerseySize,
    homeBranch: (row.homeBranch as BranchId) || 'sonthormuk',
    savedKhan: row.savedKhan,
    savedAddress: row.savedAddress,
  };
}

function mapAddressRow(row: typeof addresses.$inferSelect): SavedAddress {
  return {
    id: row.id,
    label: row.label,
    type: row.type === 'billing' ? 'billing' : 'shipping',
    fullName: row.fullName,
    phone: row.phone,
    khan: row.khan,
    sangkat: row.sangkat,
    streetAddress: row.streetAddress,
    coordinates:
      typeof row.lat === 'number' && typeof row.lng === 'number'
        ? { lat: row.lat, lng: row.lng }
        : undefined,
    isDefault: row.isDefault,
  };
}

function mapPaymentRow(
  row: typeof paymentMethods.$inferSelect,
): SavedPaymentMethod {
  const type =
    row.type === 'aba-khqr' || row.type === 'wing' ? row.type : 'card';
  return {
    id: row.id,
    type,
    brand: row.brand,
    last4: row.last4,
    expiry: row.expiry ?? undefined,
    holderName: row.holderName,
    vaultToken: row.vaultToken,
    isDefault: row.isDefault,
  };
}

function mapOrderRow(
  orderRow: typeof orders.$inferSelect,
  itemRows: Array<typeof orderItems.$inferSelect>,
): Order {
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
    createdAt: orderRow.createdAt.toISOString(),
    status: orderRow.status as Order['status'],
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

export async function getOrCreateUser(params: {
  uid: string;
  email: string;
  fullName?: string;
  photoUrl?: string;
}): Promise<MemberProfile> {
  try {
    const cleanEmail = params.email.trim().toLowerCase();
    const displayName =
      params.fullName?.trim() ||
      cleanEmail.split('@')[0] ||
      'Sport Castle Member';

    const result = await db
      .insert(users)
      .values({
        uid: params.uid,
        email: cleanEmail,
        fullName: displayName,
        photoUrl: params.photoUrl ?? null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          photoUrl: params.photoUrl ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return mapUserToProfile(result[0]);
  } catch (error) {
    throw sanitizeDbError('user synchronization', error);
  }
}

export async function updateUserProfile(
  uid: string,
  patch: z.infer<typeof profileUpdateSchema>,
): Promise<MemberProfile> {
  try {
    const updated = await db
      .update(users)
      .set({
        ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
        ...(patch.email !== undefined
          ? { email: patch.email.toLowerCase() }
          : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.telegram !== undefined ? { telegram: patch.telegram } : {}),
        ...(patch.preferredBootSize !== undefined
          ? { preferredBootSize: patch.preferredBootSize }
          : {}),
        ...(patch.preferredJerseySize !== undefined
          ? { preferredJerseySize: patch.preferredJerseySize }
          : {}),
        ...(patch.homeBranch !== undefined
          ? { homeBranch: patch.homeBranch }
          : {}),
        ...(patch.savedKhan !== undefined
          ? { savedKhan: patch.savedKhan }
          : {}),
        ...(patch.savedAddress !== undefined
          ? { savedAddress: patch.savedAddress }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    if (!updated[0]) {
      throw new Error('Member profile not found.');
    }
    return mapUserToProfile(updated[0]);
  } catch (error) {
    if (error instanceof Error && error.message === 'Member profile not found.') {
      throw error;
    }
    throw sanitizeDbError('profile update', error);
  }
}

export async function listUserAddresses(uid: string): Promise<SavedAddress[]> {
  try {
    const rows = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userUid, uid))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
    return rows.map(mapAddressRow);
  } catch (error) {
    throw sanitizeDbError('address lookup', error);
  }
}

export async function createUserAddress(
  uid: string,
  input: z.infer<typeof addressCreateSchema>,
): Promise<SavedAddress> {
  try {
    return await db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(addresses)
          .set({ isDefault: false })
          .where(eq(addresses.userUid, uid));
      }

      const id = `addr-${crypto.randomUUID().slice(0, 12)}`;
      const inserted = await tx
        .insert(addresses)
        .values({
          id,
          userUid: uid,
          label: input.label,
          type: input.type,
          fullName: input.fullName,
          phone: input.phone,
          khan: input.khan,
          sangkat: input.sangkat,
          streetAddress: input.streetAddress,
          lat: input.coordinates?.lat ?? null,
          lng: input.coordinates?.lng ?? null,
          isDefault: input.isDefault,
        })
        .returning();

      return mapAddressRow(inserted[0]);
    });
  } catch (error) {
    throw sanitizeDbError('address creation', error);
  }
}

export async function updateUserAddress(
  uid: string,
  addressId: string,
  patch: z.infer<typeof addressPatchSchema>,
): Promise<SavedAddress | null> {
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: addresses.id })
        .from(addresses)
        .where(and(eq(addresses.id, addressId), eq(addresses.userUid, uid)))
        .limit(1);

      if (!existing[0]) {
        return null;
      }

      if (patch.isDefault) {
        await tx
          .update(addresses)
          .set({ isDefault: false })
          .where(eq(addresses.userUid, uid));
      }

      const updated = await tx
        .update(addresses)
        .set({
          ...(patch.label !== undefined ? { label: patch.label } : {}),
          ...(patch.type !== undefined ? { type: patch.type } : {}),
          ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
          ...(patch.khan !== undefined ? { khan: patch.khan } : {}),
          ...(patch.sangkat !== undefined ? { sangkat: patch.sangkat } : {}),
          ...(patch.streetAddress !== undefined
            ? { streetAddress: patch.streetAddress }
            : {}),
          ...(patch.coordinates !== undefined
            ? { lat: patch.coordinates.lat, lng: patch.coordinates.lng }
            : {}),
          ...(patch.isDefault !== undefined
            ? { isDefault: patch.isDefault }
            : {}),
        })
        .where(and(eq(addresses.id, addressId), eq(addresses.userUid, uid)))
        .returning();

      return updated[0] ? mapAddressRow(updated[0]) : null;
    });
  } catch (error) {
    throw sanitizeDbError('address update', error);
  }
}

export async function deleteUserAddress(
  uid: string,
  addressId: string,
): Promise<boolean> {
  try {
    const deleted = await db
      .delete(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userUid, uid)))
      .returning({ id: addresses.id });
    return deleted.length > 0;
  } catch (error) {
    throw sanitizeDbError('address removal', error);
  }
}

export async function listUserPaymentMethods(
  uid: string,
): Promise<SavedPaymentMethod[]> {
  try {
    const rows = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.userUid, uid))
      .orderBy(desc(paymentMethods.isDefault), desc(paymentMethods.createdAt));
    return rows.map(mapPaymentRow);
  } catch (error) {
    throw sanitizeDbError('payment vault lookup', error);
  }
}

export async function createUserPaymentMethod(
  uid: string,
  input: z.infer<typeof paymentCreateSchema>,
): Promise<SavedPaymentMethod> {
  try {
    return await db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(paymentMethods)
          .set({ isDefault: false })
          .where(eq(paymentMethods.userUid, uid));
      }

      const id = `pay-${crypto.randomUUID().slice(0, 12)}`;
      const tokenSuffix = crypto.randomBytes(4).toString('hex');
      const vaultToken = `tok_pci_${input.brand.toLowerCase().replace(/[^a-z0-9]/g, '')}_${input.last4}_${tokenSuffix}`;

      const inserted = await tx
        .insert(paymentMethods)
        .values({
          id,
          userUid: uid,
          type: input.type,
          brand: input.brand,
          last4: input.last4,
          expiry: input.expiry ?? null,
          holderName: input.holderName,
          vaultToken,
          isDefault: input.isDefault,
        })
        .returning();

      return mapPaymentRow(inserted[0]);
    });
  } catch (error) {
    throw sanitizeDbError('payment method tokenization', error);
  }
}

export async function setDefaultUserPaymentMethod(
  uid: string,
  paymentId: string,
): Promise<boolean> {
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: paymentMethods.id })
        .from(paymentMethods)
        .where(
          and(
            eq(paymentMethods.id, paymentId),
            eq(paymentMethods.userUid, uid),
          ),
        )
        .limit(1);

      if (!existing[0]) {
        return false;
      }

      await tx
        .update(paymentMethods)
        .set({ isDefault: false })
        .where(eq(paymentMethods.userUid, uid));

      const updated = await tx
        .update(paymentMethods)
        .set({ isDefault: true })
        .where(
          and(
            eq(paymentMethods.id, paymentId),
            eq(paymentMethods.userUid, uid),
          ),
        )
        .returning({ id: paymentMethods.id });

      return updated.length > 0;
    });
  } catch (error) {
    throw sanitizeDbError('default payment update', error);
  }
}

export async function deleteUserPaymentMethod(
  uid: string,
  paymentId: string,
): Promise<boolean> {
  try {
    const deleted = await db
      .delete(paymentMethods)
      .where(
        and(eq(paymentMethods.id, paymentId), eq(paymentMethods.userUid, uid)),
      )
      .returning({ id: paymentMethods.id });
    return deleted.length > 0;
  } catch (error) {
    throw sanitizeDbError('payment method removal', error);
  }
}

export async function listUserWishlist(uid: string): Promise<string[]> {
  try {
    const rows = await db
      .select({ productId: wishlistItems.productId })
      .from(wishlistItems)
      .where(eq(wishlistItems.userUid, uid))
      .orderBy(desc(wishlistItems.createdAt));
    return rows.map((r) => r.productId);
  } catch (error) {
    throw sanitizeDbError('wishlist lookup', error);
  }
}

export async function replaceUserWishlist(
  uid: string,
  productIds: readonly string[],
): Promise<string[]> {
  try {
    const deduped = Array.from(new Set(productIds));
    await db.transaction(async (tx) => {
      await tx.delete(wishlistItems).where(eq(wishlistItems.userUid, uid));
      if (deduped.length > 0) {
        await tx.insert(wishlistItems).values(
          deduped.map((productId) => ({
            userUid: uid,
            productId,
            alertsEnabled: true,
          })),
        );
      }
    });
    return deduped;
  } catch (error) {
    throw sanitizeDbError('wishlist synchronization', error);
  }
}

export async function listUserOrders(uid: string): Promise<Order[]> {
  try {
    const userOrders = await db.query.orders.findMany({
      where: eq(orders.userUid, uid),
      orderBy: [desc(orders.createdAt)],
      with: {
        items: true,
      },
    });
    return userOrders.map((row) => mapOrderRow(row, row.items));
  } catch (error) {
    throw sanitizeDbError('order history lookup', error);
  }
}

export async function createOrderRecord(
  input: z.infer<typeof createOrderSchema>,
  userUid: string | null,
): Promise<Order> {
  try {
    const orderId =
      input.id?.trim().toUpperCase() ||
      `SC-${crypto.randomInt(100000, 999999)}`;
    const hasCustomPrint = input.items.some((item) => item.customPrint?.enabled);
    const derivedStatus = hasCustomPrint ? 'Heat-Press Printing' : 'Confirmed';
    const customerEmail = (input.customer.email || 'guest@sportcastle.kh')
      .trim()
      .toLowerCase();

    return await db.transaction(async (tx) => {
      const insertedOrders = await tx
        .insert(orders)
        .values({
          id: orderId,
          userUid,
          customerEmail,
          status: derivedStatus,
          fulfillmentMethod: input.fulfillmentMethod,
          pickupBranch: input.pickupBranch ?? null,
          paymentMethod: input.paymentMethod,
          customerDetails: {
            ...input.customer,
            email: customerEmail,
          },
          subtotal: input.subtotal,
          teamDiscount: input.teamDiscount,
          promoDiscount: input.promoDiscount,
          promoCode: input.promoCode ?? null,
          giftNote: input.giftNote ?? null,
          shippingFee: input.shippingFee,
          totalUsd: input.totalUsd,
          totalKhr: input.totalKhr,
        })
        .returning();

      const insertedItems = await tx
        .insert(orderItems)
        .values(
          input.items.map((item) => ({
            orderId,
            lineId: item.lineId,
            productId: item.productId,
            slug: item.slug,
            name: item.name,
            brand: item.brand,
            category: item.category,
            colorway: item.colorway,
            image: item.image,
            size: item.size,
            basePrice: item.basePrice,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            customPrint: item.customPrint ?? null,
            giftCardMeta: item.giftCardMeta ?? null,
          })),
        )
        .returning();

      return mapOrderRow(insertedOrders[0], insertedItems);
    });
  } catch (error) {
    throw sanitizeDbError('order creation', error);
  }
}

export async function findOrderForTracking(
  orderId: string,
  email: string,
): Promise<Order | null> {
  try {
    const cleanOrderId = orderId.trim().replace(/^#/, '').toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    const matched = await db.query.orders.findFirst({
      where: and(
        eq(sql`upper(${orders.id})`, cleanOrderId),
        eq(sql`lower(${orders.customerEmail})`, cleanEmail),
      ),
      with: {
        items: true,
      },
    });

    return matched ? mapOrderRow(matched, matched.items) : null;
  } catch (error) {
    throw sanitizeDbError('order tracking lookup', error);
  }
}

export async function listUserRmaRequests(uid: string): Promise<RmaRequest[]> {
  try {
    const rows = await db
      .select()
      .from(rmaRequests)
      .where(eq(rmaRequests.userUid, uid))
      .orderBy(desc(rmaRequests.createdAt));

    return rows.map((row) => ({
      rmaId: row.rmaId,
      orderId: row.orderId,
      createdAt: row.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      items: row.items as RmaRequest['items'],
      reason: row.reason,
      resolution: row.resolution as RmaRequest['resolution'],
      totalRefund: row.totalRefund,
      labelCode: row.labelCode,
      status: row.status as RmaRequest['status'],
    }));
  } catch (error) {
    throw sanitizeDbError('RMA lookup', error);
  }
}

export async function createUserRmaRequest(
  uid: string,
  input: z.infer<typeof rmaCreateSchema>,
): Promise<RmaRequest> {
  try {
    const rmaId = `RMA-PP-${crypto.randomInt(10000, 99999)}`;
    const labelCode = `SC-PREPAID-PP-${crypto.randomInt(1000, 9999)}`;

    const inserted = await db
      .insert(rmaRequests)
      .values({
        rmaId,
        userUid: uid,
        orderId: input.orderId,
        items: input.items,
        reason: input.reason,
        resolution: input.resolution,
        totalRefund: input.totalRefund,
        labelCode,
        status: 'Label Generated',
      })
      .returning();

    const row = inserted[0];
    return {
      rmaId: row.rmaId,
      orderId: row.orderId,
      createdAt: row.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      items: row.items as RmaRequest['items'],
      reason: row.reason,
      resolution: row.resolution as RmaRequest['resolution'],
      totalRefund: row.totalRefund,
      labelCode: row.labelCode,
      status: row.status as RmaRequest['status'],
    };
  } catch (error) {
    throw sanitizeDbError('RMA submission', error);
  }
}

export async function listProductQuestions(
  productId?: string,
): Promise<ProductQuestion[]> {
  try {
    const rows = productId
      ? await db
          .select()
          .from(productQuestions)
          .where(eq(productQuestions.productId, productId))
          .orderBy(desc(productQuestions.createdAt))
      : await db
          .select()
          .from(productQuestions)
          .orderBy(desc(productQuestions.createdAt))
          .limit(50);

    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      author: row.author,
      question: row.question,
      answer: row.answer ?? undefined,
      date: row.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    }));
  } catch (error) {
    throw sanitizeDbError('product Q&A lookup', error);
  }
}

export async function createProductQuestion(
  input: z.infer<typeof productQuestionCreateSchema>,
  userUid: string | null,
): Promise<ProductQuestion> {
  try {
    const id = `qa-${crypto.randomUUID().slice(0, 12)}`;
    const inserted = await db
      .insert(productQuestions)
      .values({
        id,
        productId: input.productId,
        userUid,
        author: input.author,
        question: input.question,
        answer:
          'Received by our Sonthormuk Boot & Kit Specialists — typical reply time is under 15 minutes during store hours (8:30 AM – 8:30 PM ICT).',
      })
      .returning();

    const row = inserted[0];
    return {
      id: row.id,
      productId: row.productId,
      author: row.author,
      question: row.question,
      answer: row.answer ?? undefined,
      date: 'Just now',
    };
  } catch (error) {
    throw sanitizeDbError('product question submission', error);
  }
}
