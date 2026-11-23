import type { Order, ProductCategory } from '../types/store';

export type InsightDimension = 'category' | 'brand';

export interface PurchaseInsightSlice {
  key: string;
  label: string;
  shortLabel: string;
  itemCount: number;
  orderCount: number;
  totalSpendUsd: number;
  sharePct: number;
  spendSharePct: number;
  color: string;
  swatchClass: string;
  collectionSlug?: string;
}

export interface PurchaseInsightsSummary {
  totalOrders: number;
  totalItems: number;
  totalItemSpendUsd: number;
  customPrintedCount: number;
  categories: readonly PurchaseInsightSlice[];
  brands: readonly PurchaseInsightSlice[];
  favoriteCategory: PurchaseInsightSlice | null;
  favoriteBrand: PurchaseInsightSlice | null;
}

export interface DonutArcSegment {
  key: string;
  color: string;
  sharePct: number;
  dashLength: number;
  dashGap: number;
  dashOffset: number;
}

interface CategoryDisplayMeta {
  label: string;
  shortLabel: string;
  color: string;
  swatchClass: string;
  collectionSlug: string;
}

const CATEGORY_DISPLAY_MAP: Record<ProductCategory, CategoryDisplayMeta> = {
  jerseys: {
    label: 'Match Jerseys',
    shortLabel: 'Jerseys',
    color: '#0E1113',
    swatchClass: 'bg-[#0E1113]',
    collectionSlug: 'jerseys-kits',
  },
  boots: {
    label: 'Football Boots',
    shortLabel: 'Boots',
    color: '#B8933B',
    swatchClass: 'bg-[#B8933B]',
    collectionSlug: 'football-boots',
  },
  f1: {
    label: 'F1 Apparel',
    shortLabel: 'F1 Kits',
    color: '#C8232C',
    swatchClass: 'bg-[#C8232C]',
    collectionSlug: 'f1-motorsport',
  },
  balls: {
    label: 'Match Balls',
    shortLabel: 'Balls',
    color: '#032EA1',
    swatchClass: 'bg-[#032EA1]',
    collectionSlug: 'match-balls',
  },
  essentials: {
    label: 'Pitch Essentials',
    shortLabel: 'Essentials',
    color: '#5B6570',
    swatchClass: 'bg-[#5B6570]',
    collectionSlug: 'pitch-essentials',
  },
};

const BRAND_PALETTE: ReadonlyArray<{ color: string; swatchClass: string }> = [
  { color: '#0E1113', swatchClass: 'bg-[#0E1113]' }, // Obsidian
  { color: '#B8933B', swatchClass: 'bg-[#B8933B]' }, // Championship Gold
  { color: '#C8232C', swatchClass: 'bg-[#C8232C]' }, // Racing Crimson
  { color: '#032EA1', swatchClass: 'bg-[#032EA1]' }, // Angkor Navy
  { color: '#5B6570', swatchClass: 'bg-[#5B6570]' }, // Pitch Slate
  { color: '#9A5B32', swatchClass: 'bg-[#9A5B32]' }, // Warm Bronze
];

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Largest-remainder integer percentage rounding so slice shares always sum to 100%.
 */
function allocatePercentages(values: readonly number[]): number[] {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return values.map(() => 0);

  const exact = values.map((v) => (v / total) * 100);
  const floors = exact.map((v) => Math.floor(v));
  let remainder = 100 - floors.reduce((sum, v) => sum + v, 0);

  const rankedIndices = exact
    .map((val, idx) => ({ idx, frac: val - floors[idx] }))
    .sort((a, b) => b.frac - a.frac || a.idx - b.idx);

  for (let i = 0; i < rankedIndices.length && remainder > 0; i += 1) {
    floors[rankedIndices[i].idx] += 1;
    remainder -= 1;
  }

  return floors;
}

interface RawBucket {
  key: string;
  label: string;
  shortLabel: string;
  itemCount: number;
  orderIds: Set<string>;
  totalSpendUsd: number;
  preferredColor?: string;
  preferredSwatchClass?: string;
  collectionSlug?: string;
}

function finalizeBuckets(
  buckets: readonly RawBucket[],
  maxVisibleSlices: number,
  otherLabel: string,
): PurchaseInsightSlice[] {
  if (buckets.length === 0) return [];

  const sorted = [...buckets].sort(
    (a, b) =>
      b.itemCount - a.itemCount ||
      b.totalSpendUsd - a.totalSpendUsd ||
      a.label.localeCompare(b.label),
  );

  let condensed: RawBucket[];
  if (sorted.length > maxVisibleSlices) {
    const head = sorted.slice(0, maxVisibleSlices - 1);
    const tail = sorted.slice(maxVisibleSlices - 1);
    const mergedOrderIds = new Set<string>();
    let tailItems = 0;
    let tailSpend = 0;

    for (const bucket of tail) {
      tailItems += bucket.itemCount;
      tailSpend += bucket.totalSpendUsd;
      for (const orderId of bucket.orderIds) {
        mergedOrderIds.add(orderId);
      }
    }

    condensed = [
      ...head,
      {
        key: 'other',
        label: otherLabel,
        shortLabel: 'Other',
        itemCount: tailItems,
        orderIds: mergedOrderIds,
        totalSpendUsd: tailSpend,
        preferredColor: '#8E8C84',
        preferredSwatchClass: 'bg-[#8E8C84]',
      },
    ];
  } else {
    condensed = sorted;
  }

  const itemShares = allocatePercentages(condensed.map((b) => b.itemCount));
  const spendShares = allocatePercentages(
    condensed.map((b) => b.totalSpendUsd),
  );

  return condensed.map((bucket, idx) => {
    const fallbackPalette = BRAND_PALETTE[idx % BRAND_PALETTE.length];
    return {
      key: bucket.key,
      label: bucket.label,
      shortLabel: bucket.shortLabel,
      itemCount: bucket.itemCount,
      orderCount: bucket.orderIds.size,
      totalSpendUsd: roundUsd(bucket.totalSpendUsd),
      sharePct: itemShares[idx],
      spendSharePct: spendShares[idx],
      color: bucket.preferredColor ?? fallbackPalette.color,
      swatchClass: bucket.preferredSwatchClass ?? fallbackPalette.swatchClass,
      collectionSlug: bucket.collectionSlug,
    };
  });
}

/**
 * Pure analytics engine deriving a member's favorite product category and most
 * frequently purchased brands directly from their order history.
 */
export function calculatePurchaseInsights(
  orders: readonly Order[],
): PurchaseInsightsSummary {
  const categoryMap = new Map<ProductCategory, RawBucket>();
  const brandMap = new Map<string, RawBucket>();

  let totalItems = 0;
  let totalItemSpendUsd = 0;
  let customPrintedCount = 0;

  for (const order of orders) {
    for (const item of order.items) {
      const qty =
        Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 0;
      if (qty === 0) continue;

      const unitPrice =
        Number.isFinite(item.unitPrice) && item.unitPrice >= 0
          ? item.unitPrice
          : 0;
      const lineSpend = unitPrice * qty;

      totalItems += qty;
      totalItemSpendUsd += lineSpend;
      if (item.customPrint?.enabled) {
        customPrintedCount += qty;
      }

      // Category aggregation
      const catKey = item.category;
      const catMeta = CATEGORY_DISPLAY_MAP[catKey] ?? {
        label: catKey,
        shortLabel: catKey,
        color: '#5B6570',
        swatchClass: 'bg-[#5B6570]',
        collectionSlug: 'all',
      };
      const existingCat = categoryMap.get(catKey);
      if (existingCat) {
        existingCat.itemCount += qty;
        existingCat.totalSpendUsd += lineSpend;
        existingCat.orderIds.add(order.id);
      } else {
        categoryMap.set(catKey, {
          key: catKey,
          label: catMeta.label,
          shortLabel: catMeta.shortLabel,
          itemCount: qty,
          orderIds: new Set([order.id]),
          totalSpendUsd: lineSpend,
          preferredColor: catMeta.color,
          preferredSwatchClass: catMeta.swatchClass,
          collectionSlug: catMeta.collectionSlug,
        });
      }

      // Brand aggregation (normalized trimming, preserving display casing)
      const normalizedBrand = (item.brand || 'Sport Castle').trim();
      const brandKey = normalizedBrand.toLowerCase();
      const existingBrand = brandMap.get(brandKey);
      if (existingBrand) {
        existingBrand.itemCount += qty;
        existingBrand.totalSpendUsd += lineSpend;
        existingBrand.orderIds.add(order.id);
      } else {
        brandMap.set(brandKey, {
          key: brandKey,
          label: normalizedBrand,
          shortLabel: normalizedBrand,
          itemCount: qty,
          orderIds: new Set([order.id]),
          totalSpendUsd: lineSpend,
        });
      }
    }
  }

  const categories = finalizeBuckets(
    Array.from(categoryMap.values()),
    5,
    'Other Categories',
  );
  const brands = finalizeBuckets(
    Array.from(brandMap.values()),
    5,
    'Other Brands',
  );

  return {
    totalOrders: orders.length,
    totalItems,
    totalItemSpendUsd: roundUsd(totalItemSpendUsd),
    customPrintedCount,
    categories,
    brands,
    favoriteCategory: categories[0] ?? null,
    favoriteBrand: brands[0] ?? null,
  };
}

/**
 * Computes deterministic SVG `<circle>` dash segments for a clean donut chart.
 * Starts at 12 o'clock when the SVG circle is rotated `-90deg`.
 */
export function buildDonutArcGeometry(
  slices: readonly PurchaseInsightSlice[],
  radius: number,
  gapPx = 3,
): DonutArcSegment[] {
  if (slices.length === 0 || radius <= 0) return [];

  const circumference = 2 * Math.PI * radius;
  const effectiveGap = slices.length > 1 ? Math.min(gapPx, circumference / 24) : 0;
  let consumed = 0;

  return slices.map((slice) => {
    const rawArc = (slice.sharePct / 100) * circumference;
    const dashLength = Math.max(0, rawArc - effectiveGap);
    const dashGap = Math.max(0, circumference - dashLength);
    const dashOffset = -consumed;
    consumed += rawArc;

    return {
      key: slice.key,
      color: slice.color,
      sharePct: slice.sharePct,
      dashLength: Number(dashLength.toFixed(2)),
      dashGap: Number(dashGap.toFixed(2)),
      dashOffset: Number(dashOffset.toFixed(2)),
    };
  });
}
