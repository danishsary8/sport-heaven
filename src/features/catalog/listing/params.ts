import type { ListingQuery } from '../api';

/** Facets that can hold several values, sent as repeated params (brand=a&brand=b). */
export const MULTI_KEYS = ['brand', 'size', 'color', 'league', 'surface', 'kitType', 'garmentType', 'season', 'continent', 'tag'] as const;
const SINGLE_KEYS = ['category', 'priceMin', 'priceMax', 'discount', 'inStockOnly', 'sort', 'q'] as const;

/** The API query a listing URL asks for (page excluded: paging is handled by the infinite query). */
export function queryFromSearch(params: URLSearchParams): ListingQuery {
  const query: ListingQuery = {};
  for (const key of MULTI_KEYS) {
    const values = params.getAll(key).filter(Boolean);
    if (values.length) query[key] = values;
  }
  for (const key of SINGLE_KEYS) {
    const value = params.get(key);
    if (value) query[key] = value;
  }
  return query;
}

/** Keys that count as "filters" for the chips and the Clear button (sort and search text are not filters). */
export function hasFilters(params: URLSearchParams, fixed: string[] = []): boolean {
  return [...params.keys()].some((k) => k !== 'sort' && k !== 'page' && k !== 'q' && !fixed.includes(k));
}

export function toggleValue(params: URLSearchParams, key: string, value: string, multi: boolean): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete('page');
  if (multi) {
    const values = next.getAll(key);
    next.delete(key);
    const kept = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
    kept.forEach((v) => next.append(key, v));
  } else if (next.get(key) === value) {
    next.delete(key);
  } else {
    next.set(key, value);
  }
  return next;
}

export function setPrice(params: URLSearchParams, min: number | null, max: number | null): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete('page');
  next.delete('priceMin');
  next.delete('priceMax');
  if (min) next.set('priceMin', String(min));
  if (max != null) next.set('priceMax', String(max));
  return next;
}

/** Removes every filter but keeps the search text. */
export function clearFilters(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams();
  const q = params.get('q');
  if (q) next.set('q', q);
  return next;
}
