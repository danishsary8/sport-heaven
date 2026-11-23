import { BRANCHES } from '../data/catalog';
import type { CatalogProduct } from '../lib/mock-store/catalog';
import type { BranchId, Product, StockLevel } from '../types/store';
import { formatUsd } from './commerce';

export const WISHLIST_SNAPSHOTS_STORAGE_KEY = 'sport_castle_wishlist_snapshots_v1';
export const WISHLIST_ALERT_KEYS_STORAGE_KEY = 'sport_castle_wishlist_alert_keys_v1';
export const CATALOG_OVERRIDES_STORAGE_KEY = 'sport_castle_catalog_overrides_v1';

export type WishlistAlertType = 'price-drop' | 'back-in-stock';

export interface WishlistWatchSnapshot {
  productId: string;
  price: number;
  originalPrice?: number;
  branchStock: Record<BranchId, StockLevel>;
  alertsEnabled: boolean;
  capturedAt: string;
}

export interface CatalogProductOverride {
  price?: number;
  originalPrice?: number;
  branchStock?: Record<BranchId, StockLevel>;
  updatedAt: string;
}

export interface WishlistAlertEvent {
  id: string;
  dedupeKey: string;
  type: WishlistAlertType;
  productId: string;
  slug: string;
  productName: string;
  shortName: string;
  image: string;
  previousPrice?: number;
  currentPrice?: number;
  savingsUsd?: number;
  discountPercent?: number;
  restockedBranches?: BranchId[];
  branchSummary?: string;
  title: string;
  message: string;
  meta: string;
}

const BRANCH_IDS: readonly BranchId[] = ['sonthormuk', 'sensok', 'chomkadong'];

export function getBranchDisplayName(branchId: BranchId): string {
  return BRANCHES.find((b) => b.id === branchId)?.name ?? branchId;
}

export function isProductFullyInStock(branchStock: Record<BranchId, StockLevel>): boolean {
  return BRANCH_IDS.every((branchId) => branchStock[branchId] === 'In Stock');
}

export function getConstrainedBranches(
  branchStock: Record<BranchId, StockLevel>,
): BranchId[] {
  return BRANCH_IDS.filter(
    (branchId) =>
      branchStock[branchId] === 'Out of Stock' ||
      branchStock[branchId] === 'Limited Stock',
  );
}

/**
 * Applies live price drops and branch restock overrides cleanly onto the base catalog
 * without mutating the source array.
 */
export function applyCatalogOverrides(
  baseCatalog: readonly CatalogProduct[],
  overrides: Record<string, CatalogProductOverride>,
): CatalogProduct[] {
  const overrideKeys = Object.keys(overrides);
  if (overrideKeys.length === 0) {
    return baseCatalog as CatalogProduct[];
  }

  return baseCatalog.map((item) => {
    const patch = overrides[item.id];
    if (!patch) return item;

    const nextBranchStock = patch.branchStock
      ? { ...item.branchStock, ...patch.branchStock }
      : item.branchStock;

    const nextPrice =
      typeof patch.price === 'number' && Number.isFinite(patch.price)
        ? Number(patch.price.toFixed(2))
        : item.price;

    const nextOriginalPrice =
      typeof patch.originalPrice === 'number' && Number.isFinite(patch.originalPrice)
        ? Number(patch.originalPrice.toFixed(2))
        : item.originalPrice;

    return {
      ...item,
      price: nextPrice,
      originalPrice: nextOriginalPrice,
      branchStock: nextBranchStock,
    };
  });
}

export function createWishlistSnapshot(
  product: Pick<Product, 'id' | 'price' | 'originalPrice' | 'branchStock'>,
  alertsEnabled = true,
  capturedAt: string = new Date().toISOString(),
): WishlistWatchSnapshot {
  return {
    productId: product.id,
    price: product.price,
    originalPrice: product.originalPrice,
    branchStock: { ...product.branchStock },
    alertsEnabled,
    capturedAt,
  };
}

/**
 * Ensures every wishlisted product has a baseline watch snapshot while preserving
 * previously captured price/stock baselines and user notification preferences.
 */
export function syncWishlistSnapshots(
  wishlistIds: readonly string[],
  existing: Record<string, WishlistWatchSnapshot>,
  catalogById: ReadonlyMap<string, Product>,
  nowIso: string = new Date().toISOString(),
): Record<string, WishlistWatchSnapshot> {
  const next: Record<string, WishlistWatchSnapshot> = {};

  for (const id of wishlistIds) {
    if (existing[id]) {
      next[id] = existing[id];
      continue;
    }
    const product = catalogById.get(id);
    if (product) {
      next[id] = createWishlistSnapshot(product, true, nowIso);
    }
  }

  return next;
}

/**
 * Pure diff engine comparing saved wishlist snapshots against live catalog items.
 * Emits deduplicated `price-drop` and `back-in-stock` alert events for subscribed items.
 */
export function detectWishlistAlerts(
  wishlistIds: readonly string[],
  snapshots: Record<string, WishlistWatchSnapshot>,
  liveCatalogById: ReadonlyMap<string, Product>,
  deliveredKeys: ReadonlySet<string>,
): WishlistAlertEvent[] {
  const events: WishlistAlertEvent[] = [];

  for (const productId of wishlistIds) {
    const snapshot = snapshots[productId];
    const product = liveCatalogById.get(productId);
    if (!snapshot || !product || !snapshot.alertsEnabled) continue;

    // 1. Price Drop Detection
    if (product.price < snapshot.price) {
      const savingsUsd = Number((snapshot.price - product.price).toFixed(2));
      const discountPercent = Math.max(
        1,
        Math.round((savingsUsd / snapshot.price) * 100),
      );
      const dedupeKey = `${productId}:price-drop:${product.price.toFixed(2)}`;

      if (!deliveredKeys.has(dedupeKey)) {
        events.push({
          id: `${dedupeKey}:${events.length}`,
          dedupeKey,
          type: 'price-drop',
          productId: product.id,
          slug: product.slug,
          productName: product.name,
          shortName: product.shortName,
          image: product.image,
          previousPrice: snapshot.price,
          currentPrice: product.price,
          savingsUsd,
          discountPercent,
          title: `Price Drop · -${discountPercent}%`,
          message: `${product.shortName} dropped to ${formatUsd(product.price)} (save ${formatUsd(savingsUsd)}).`,
          meta: `${formatUsd(snapshot.price)} → ${formatUsd(product.price)}`,
        });
      }
    }

    // 2. Back-in-Stock Detection (Out of Stock or Limited Stock -> In Stock at one or more branches)
    const restockedBranches: BranchId[] = [];
    for (const branchId of BRANCH_IDS) {
      const prevLevel = snapshot.branchStock[branchId];
      const currLevel = product.branchStock[branchId];
      if (
        (prevLevel === 'Out of Stock' || prevLevel === 'Limited Stock') &&
        currLevel === 'In Stock'
      ) {
        restockedBranches.push(branchId);
      }
    }

    if (restockedBranches.length > 0) {
      const dedupeKey = `${productId}:back-in-stock:${restockedBranches.join(',')}`;
      if (!deliveredKeys.has(dedupeKey)) {
        const branchNames = restockedBranches.map(getBranchDisplayName);
        const branchSummary =
          branchNames.length === 1
            ? branchNames[0]
            : `${branchNames[0]} + ${branchNames.length - 1} more`;

        events.push({
          id: `${dedupeKey}:${events.length}`,
          dedupeKey,
          type: 'back-in-stock',
          productId: product.id,
          slug: product.slug,
          productName: product.name,
          shortName: product.shortName,
          image: product.image,
          restockedBranches,
          branchSummary,
          title: 'Back in Stock',
          message: `${product.shortName} is now back in stock at ${branchSummary}.`,
          meta: `In Stock · ${branchSummary}`,
        });
      }
    }
  }

  return events;
}

/**
 * Updates stored snapshots after alerts have been dispatched so future diffs
 * compare against the latest notified price & stock state.
 */
export function advanceSnapshotsAfterAlerts(
  snapshots: Record<string, WishlistWatchSnapshot>,
  alerts: readonly WishlistAlertEvent[],
  liveCatalogById: ReadonlyMap<string, Product>,
  nowIso: string = new Date().toISOString(),
): Record<string, WishlistWatchSnapshot> {
  if (alerts.length === 0) return snapshots;
  const next = { ...snapshots };

  for (const alert of alerts) {
    const existing = next[alert.productId];
    const product = liveCatalogById.get(alert.productId);
    if (!existing || !product) continue;

    next[alert.productId] = {
      ...existing,
      price: product.price,
      originalPrice: product.originalPrice,
      branchStock: { ...product.branchStock },
      capturedAt: nowIso,
    };
  }

  return next;
}

/**
 * Resolves live Phnom Penh branch restocks and member price-drop markdowns
 * for subscribed wishlist items that haven't received an update yet.
 */
export function resolveWishlistCatalogUpdates(
  wishlistIds: readonly string[],
  snapshots: Record<string, WishlistWatchSnapshot>,
  liveCatalogById: ReadonlyMap<string, Product>,
  existingOverrides: Record<string, CatalogProductOverride>,
  options?: {
    maxUpdates?: number;
    nowIso?: string;
  },
): {
  nextOverrides: Record<string, CatalogProductOverride>;
  updatedProductIds: string[];
} {
  const maxUpdates = options?.maxUpdates ?? 2;
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const nextOverrides: Record<string, CatalogProductOverride> = {
    ...existingOverrides,
  };
  const updatedProductIds: string[] = [];

  let appliedRestock = false;
  let appliedPriceDrop = false;

  // Pass 1: Prioritize a real branch restock for any subscribed item with Out of Stock / Limited Stock
  for (const productId of wishlistIds) {
    if (updatedProductIds.length >= maxUpdates) break;
    const snap = snapshots[productId];
    const product = liveCatalogById.get(productId);
    if (!snap || !product || !snap.alertsEnabled) continue;

    const constrained = getConstrainedBranches(product.branchStock);
    if (constrained.length > 0 && !appliedRestock) {
      const restockedMap: Record<BranchId, StockLevel> = { ...product.branchStock };
      for (const b of constrained) {
        restockedMap[b] = 'In Stock';
      }
      nextOverrides[productId] = {
        ...nextOverrides[productId],
        branchStock: restockedMap,
        updatedAt: nowIso,
      };
      updatedProductIds.push(productId);
      appliedRestock = true;
    }
  }

  // Pass 2: Apply a verified member price drop (10%–14% off) on a subscribed item not yet discounted
  for (const productId of wishlistIds) {
    if (updatedProductIds.length >= maxUpdates) break;
    if (updatedProductIds.includes(productId)) continue;
    const snap = snapshots[productId];
    const product = liveCatalogById.get(productId);
    if (!snap || !product || !snap.alertsEnabled) continue;

    const existingPatch = nextOverrides[productId];
    const alreadyUpdated =
      typeof existingPatch?.price === 'number' ||
      existingPatch?.branchStock !== undefined;

    if (!alreadyUpdated && !appliedPriceDrop && product.price >= 20) {
      const dropRate = product.price >= 150 ? 0.1 : 0.12;
      const droppedPrice = Math.max(
        10,
        Math.round(product.price * (1 - dropRate)),
      );
      if (droppedPrice < product.price) {
        nextOverrides[productId] = {
          ...existingPatch,
          originalPrice: product.originalPrice ?? product.price,
          price: droppedPrice,
          updatedAt: nowIso,
        };
        updatedProductIds.push(productId);
        appliedPriceDrop = true;
      }
    }
  }

  return { nextOverrides, updatedProductIds };
}

export function parseSafeRecord<T>(raw: string | null): Record<string, T> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, T>;
    }
  } catch {
    // Ignore malformed JSON
  }
  return {};
}

export function parseSafeStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === 'string');
    }
  } catch {
    // Ignore malformed JSON
  }
  return [];
}
