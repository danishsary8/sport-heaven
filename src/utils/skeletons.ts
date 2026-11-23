import type { GridDensity, KitEditionType, ProductFilters, SortOption } from '../types/store';

/**
 * Pure helpers for minimalist skeleton screen placeholder counts,
 * transition timing, and deterministic listing transition keys.
 */

export const DEFAULT_SKELETON_DURATION_MS = 260;
export const REDUCED_MOTION_SKELETON_MS = 120;

/**
 * Computes a clean, grid-balanced number of skeleton cards so loading states
 * avoid awkward orphan cards on desktop, tablet, and mobile viewports.
 */
export function getListingSkeletonCount(
  gridDensity: GridDensity,
  isKitMode: boolean,
  expectedCount?: number,
): number {
  const columns = gridDensity === 2 ? 2 : gridDensity === 3 ? 3 : 4;
  const targetRows = isKitMode ? 2 : gridDensity === 2 ? 2 : 2;
  const baseline = columns * targetRows;

  if (typeof expectedCount === 'number' && expectedCount > 0) {
    return Math.min(12, Math.max(Math.min(columns, expectedCount), Math.min(expectedCount, baseline)));
  }

  return Math.min(12, Math.max(4, baseline));
}

/**
 * Resolves the skeleton display duration while respecting user reduced-motion preferences.
 */
export function resolveSkeletonDurationMs(
  prefersReducedMotion: boolean,
  baseMs = DEFAULT_SKELETON_DURATION_MS,
): number {
  const safeBase = Math.max(0, Math.round(baseMs));
  if (prefersReducedMotion) {
    return Math.min(safeBase, REDUCED_MOTION_SKELETON_MS);
  }
  return safeBase;
}

/**
 * Builds a stable string key representing the active catalog listing query so
 * transitions between collections, filters, sorts, and pages trigger a smooth skeleton handoff.
 */
export function buildListingTransitionKey(params: {
  collectionSlug?: string;
  filters: ProductFilters;
  selectedEdition: 'all' | KitEditionType;
  sortBy: SortOption;
  page: number;
}): string {
  const { collectionSlug, filters, selectedEdition, sortBy, page } = params;
  return [
    collectionSlug ?? 'all',
    filters.category,
    filters.league,
    filters.nationalRegion ?? 'all',
    filters.season ?? 'all',
    filters.uclOnly ? 'ucl' : 'std',
    filters.retroOnly ? 'retro' : 'std',
    filters.limitedEditionOnly ? 'limited' : 'std',
    filters.bestSellersOnly ? 'best' : 'all',
    filters.newArrivalsOnly ? 'new' : 'all',
    filters.f1GarmentType ?? 'all',
    filters.f1Team ?? 'all',
    filters.ballSubcategory ?? 'all',
    filters.essentialsSubcategory ?? 'all',
    filters.signatureBootOnly ? 'sig' : 'all',
    filters.branch,
    filters.maxPrice,
    filters.surfaces.slice().sort().join(','),
    filters.brands.slice().sort().join(','),
    filters.customizableOnly ? 'custom' : 'any',
    filters.inStockOnly ? 'instock' : 'allstock',
    filters.saleOnly ? 'sale' : 'regular',
    filters.minRating ?? 0,
    filters.sizeFilter ?? 'anysize',
    selectedEdition,
    sortBy,
    page,
  ].join('|');
}
