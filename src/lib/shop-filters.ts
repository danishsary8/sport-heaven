/**
 * Shop filter engine: facet definitions, filtering, option counts and
 * URL (de)serialisation. Pure functions only, so it can be unit-tested and
 * reused by the shop page, the navigation menus and any future API.
 *
 * URL shape:  #/collections/<slug>?league=premier-league,la-liga&kit=home&only=sale&sort=newest
 *   - one query key per facet, values comma separated (OR inside a facet)
 *   - different facets are combined with AND
 */
import type {
  LeagueId,
  Product,
  ProductCategory,
  ProductFilters,
  SortOption,
} from '../types/store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FacetKey =
  | 'team-type'
  | 'league'
  | 'team'
  | 'season'
  | 'kit'
  | 'version'
  | 'fit'
  | 'sleeve'
  | 'garment'
  | 'surface'
  | 'type'
  | 'size'
  | 'brand'
  | 'price';

export type FlagKey = 'custom' | 'ucl' | 'sale' | 'new' | 'bestseller' | 'limited' | 'instock';

export type ShopCategory = ProductCategory | 'all';

export interface ShopQuery {
  category: ShopCategory;
  facets: Partial<Record<FacetKey, string[]>>;
  flags: FlagKey[];
  q: string;
  sort: SortOption;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

export interface FacetDefinition {
  key: FacetKey;
  label: string;
  /** Show a search box above the options (long lists such as teams). */
  searchable?: boolean;
  /** Which option values a product belongs to. Empty array = not applicable. */
  values: (product: Product) => string[];
  /** Human label for an option value. */
  optionLabel: (value: string, products: Product[]) => string;
  /** Sort order for options. Defaults to label A→Z. */
  compare?: (a: string, b: string) => number;
}

export interface FlagDefinition {
  key: FlagKey;
  label: string;
  test: (product: Product) => boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function byOrder(order: string[]) {
  return (a: string, b: string) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.localeCompare(b);
  };
}

/** Finds the original (unslugged) text for an option value, e.g. 'fc-barcelona' → 'FC Barcelona'. */
function labelFromProducts(pick: (p: Product) => string | undefined) {
  return (value: string, products: Product[]) => {
    for (const p of products) {
      const raw = pick(p);
      if (raw && slugify(raw) === value) return raw;
    }
    return value;
  };
}

/** "Argentina National Team" → "Argentina". */
export function teamDisplayName(team: string): string {
  return team.replace(/\s+National Team$/i, '');
}

const isKit = (p: Product) => p.category === 'jerseys';

export const PRICE_BUCKETS: Array<{ value: string; label: string; min: number; max: number }> = [
  { value: 'under-50', label: 'Under $50', min: 0, max: 49.99 },
  { value: '50-100', label: '$50 – $100', min: 50, max: 100 },
  { value: '100-200', label: '$100 – $200', min: 100.01, max: 200 },
  { value: '200-plus', label: '$200 and up', min: 200.01, max: Infinity },
];

const LEAGUE_ORDER: LeagueId[] = [
  'Premier League',
  'La Liga',
  'Serie A',
  'Bundesliga',
  'Ligue 1',
  'Cambodian Premier League',
];

const SIZE_ORDER = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL',
  'S (EU 36–39)', 'M (EU 40–43)', 'L (EU 44–47)',
  'EU 39', 'EU 40', 'EU 40.5', 'EU 41', 'EU 42', 'EU 42.5', 'EU 43', 'EU 44', 'EU 44.5', 'EU 45',
  'Size 4', 'Size 5', 'Size 7', 'Size 8', 'Size 9', 'Size 10', 'Size 11',
].map(slugify);

/** Newest season first, retro last. */
function compareSeasons(a: string, b: string): number {
  if (a === 'retro') return 1;
  if (b === 'retro') return -1;
  return b.localeCompare(a);
}

function ballOrGearType(p: Product): string[] {
  const name = p.name.toLowerCase();
  if (p.category === 'balls') return [name.includes('futsal') ? 'futsal' : 'match-ball'];
  if (p.category === 'essentials') {
    if (name.includes('glove')) return ['gloves'];
    if (name.includes('sock')) return ['socks'];
    if (name.includes('guard')) return ['shin-guards'];
    return ['other'];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Facet definitions
// ---------------------------------------------------------------------------

export const FACETS: Record<FacetKey, FacetDefinition> = {
  'team-type': {
    key: 'team-type',
    label: 'Team type',
    values: (p) => (isKit(p) && p.teamType ? [p.teamType] : []),
    optionLabel: (v) => (v === 'national' ? 'National teams' : 'Clubs'),
    compare: byOrder(['club', 'national']),
  },
  league: {
    key: 'league',
    label: 'League',
    values: (p) =>
      isKit(p) && p.league && p.league !== 'International' ? [slugify(p.league)] : [],
    optionLabel: labelFromProducts((p) => p.league),
    compare: byOrder(LEAGUE_ORDER.map(slugify)),
  },
  team: {
    key: 'team',
    label: 'Team',
    searchable: true,
    values: (p) => ((isKit(p) || p.category === 'f1') && p.club ? [slugify(p.club)] : []),
    optionLabel: (v, products) => teamDisplayName(labelFromProducts((p) => p.club)(v, products)),
  },
  season: {
    key: 'season',
    label: 'Season',
    values: (p) => {
      if (!isKit(p) && p.category !== 'f1') return [];
      if (p.isRetro) return ['retro'];
      return p.season ? [slugify(p.season)] : [];
    },
    optionLabel: (v, products) =>
      v === 'retro' ? 'Retro classics' : labelFromProducts((p) => p.season)(v, products),
    compare: compareSeasons,
  },
  kit: {
    key: 'kit',
    label: 'Kit type',
    values: (p) => (isKit(p) && p.kitType ? [slugify(p.kitType)] : []),
    optionLabel: (v) => v.charAt(0).toUpperCase() + v.slice(1),
    compare: byOrder(['home', 'away', 'third', 'goalkeeper', 'special']),
  },
  version: {
    key: 'version',
    label: 'Version',
    values: (p) => (isKit(p) ? (p.versions ?? []).map(slugify) : []),
    optionLabel: (v) => (v === 'player' ? 'Player version' : 'Fan version'),
    compare: byOrder(['fan', 'player']),
  },
  fit: {
    key: 'fit',
    label: 'Fit',
    values: (p) => (p.fits ?? []).map(slugify),
    optionLabel: (v) => v.charAt(0).toUpperCase() + v.slice(1),
    compare: byOrder(['men', 'women', 'kids']),
  },
  sleeve: {
    key: 'sleeve',
    label: 'Sleeve',
    values: (p) => (isKit(p) ? (p.sleeves ?? []).map(slugify) : []),
    optionLabel: (v) => (v === 'long' ? 'Long sleeve' : 'Short sleeve'),
    compare: byOrder(['short', 'long']),
  },
  garment: {
    key: 'garment',
    label: 'Garment',
    values: (p) => (p.category === 'f1' && p.garmentType ? [p.garmentType] : []),
    optionLabel: (v) => (v === 'jacket' ? 'Jackets' : 'Team jerseys'),
    compare: byOrder(['jersey', 'jacket']),
  },
  surface: {
    key: 'surface',
    label: 'Surface',
    values: (p) => {
      if (p.category !== 'boots' || !p.surface) return [];
      return p.surface === 'FG/AG' ? ['fg', 'ag'] : [slugify(p.surface)];
    },
    optionLabel: (v) =>
      ({
        fg: 'Firm ground (FG)',
        ag: 'Artificial grass (AG)',
        tf: 'Turf (TF)',
        ic: 'Indoor (IC)',
        mg: 'Multi-ground (MG)',
      })[v] ?? v.toUpperCase(),
    compare: byOrder(['fg', 'ag', 'tf', 'mg', 'ic']),
  },
  type: {
    key: 'type',
    label: 'Type',
    values: ballOrGearType,
    optionLabel: (v) =>
      ({
        'match-ball': 'Match balls',
        futsal: 'Futsal balls',
        gloves: 'Goalkeeper gloves',
        socks: 'Grip socks',
        'shin-guards': 'Shin guards',
        other: 'Other',
      })[v] ?? v,
  },
  size: {
    key: 'size',
    label: 'Size',
    values: (p) => p.sizes.map(slugify),
    optionLabel: (value, products) => {
      for (const p of products) {
        const hit = p.sizes.find((s) => slugify(s) === value);
        if (hit) return hit;
      }
      return value;
    },
    compare: byOrder(SIZE_ORDER),
  },
  brand: {
    key: 'brand',
    label: 'Brand',
    values: (p) => [slugify(p.brand)],
    optionLabel: labelFromProducts((p) => p.brand),
  },
  price: {
    key: 'price',
    label: 'Price',
    values: (p) =>
      PRICE_BUCKETS.filter((b) => p.price >= b.min && p.price <= b.max).map((b) => b.value),
    optionLabel: (v) => PRICE_BUCKETS.find((b) => b.value === v)?.label ?? v,
    compare: byOrder(PRICE_BUCKETS.map((b) => b.value)),
  },
};

export const FLAGS: Record<FlagKey, FlagDefinition> = {
  custom: { key: 'custom', label: 'Name & number printing', test: (p) => Boolean(p.customizable) },
  ucl: { key: 'ucl', label: 'Champions League kits', test: (p) => Boolean(p.isChampionsLeague) },
  sale: { key: 'sale', label: 'On sale', test: (p) => Boolean(p.originalPrice && p.originalPrice > p.price) },
  new: { key: 'new', label: 'New arrivals', test: (p) => Boolean(p.isNewArrival) },
  bestseller: { key: 'bestseller', label: 'Best sellers', test: (p) => Boolean(p.isBestSeller) },
  limited: {
    key: 'limited',
    label: 'Special & limited editions',
    test: (p) => Boolean(p.isLimitedEdition || p.kitType === 'Special'),
  },
  instock: {
    key: 'instock',
    label: 'In stock now',
    test: (p) => Object.values(p.branchStock).some((level) => level !== 'Out of Stock'),
  },
};

/** Which facets and flags the sidebar shows for each category, in display order. */
export const CATEGORY_FILTERS: Record<ShopCategory, { facets: FacetKey[]; flags: FlagKey[] }> = {
  all: { facets: ['brand', 'price'], flags: ['new', 'sale', 'bestseller', 'instock'] },
  jerseys: {
    facets: ['team-type', 'league', 'team', 'season', 'kit', 'version', 'fit', 'sleeve', 'size', 'brand', 'price'],
    flags: ['custom', 'ucl', 'limited', 'sale', 'instock'],
  },
  f1: { facets: ['team', 'garment', 'season', 'fit', 'size', 'brand', 'price'], flags: ['sale', 'instock'] },
  boots: { facets: ['surface', 'brand', 'size', 'price'], flags: ['new', 'sale', 'instock'] },
  balls: { facets: ['type', 'brand', 'price'], flags: ['sale', 'instock'] },
  essentials: { facets: ['type', 'brand', 'size', 'price'], flags: ['sale', 'instock'] },
};

/** Facets that start expanded in the sidebar. The rest are folded. */
export const DEFAULT_OPEN_FACETS: FacetKey[] = ['team-type', 'league', 'season', 'kit', 'surface', 'garment', 'type'];

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'best-sellers', label: 'Best sellers' },
  { value: 'rating-desc', label: 'Top rated' },
];

// ---------------------------------------------------------------------------
// Category ↔ collection slug
// ---------------------------------------------------------------------------

export const CATEGORY_COLLECTION_SLUG: Record<ShopCategory, string> = {
  all: 'all',
  jerseys: 'jerseys-kits',
  boots: 'football-boots',
  f1: 'f1-motorsport',
  balls: 'match-balls',
  essentials: 'gk-essentials',
};

/** Short, friendly aliases that also work in URLs (e.g. #/collections/jerseys). */
const COLLECTION_ALIASES: Record<string, ShopCategory> = {
  jerseys: 'jerseys',
  kits: 'jerseys',
  boots: 'boots',
  f1: 'f1',
  balls: 'balls',
  gear: 'essentials',
  essentials: 'essentials',
};

export function categoryFromCollectionSlug(slug: string | undefined): ShopCategory | undefined {
  if (!slug) return undefined;
  const direct = (Object.keys(CATEGORY_COLLECTION_SLUG) as ShopCategory[]).find(
    (c) => CATEGORY_COLLECTION_SLUG[c] === slug,
  );
  return direct ?? COLLECTION_ALIASES[slug];
}

export function isCategoryCollection(slug: string | undefined): boolean {
  return categoryFromCollectionSlug(slug) !== undefined;
}

// ---------------------------------------------------------------------------
// Query construction & (de)serialisation
// ---------------------------------------------------------------------------

export function emptyShopQuery(category: ShopCategory = 'all'): ShopQuery {
  return { category, facets: {}, flags: [], q: '', sort: 'featured' };
}

const FACET_KEYS = Object.keys(FACETS) as FacetKey[];
const FLAG_KEYS = Object.keys(FLAGS) as FlagKey[];

/**
 * Converts an editorial collection preset (legacy `ProductFilters` shape)
 * into a ShopQuery so old collections keep working.
 */
export function presetToShopQuery(preset: Partial<ProductFilters> & { brand?: string; surface?: string } = {}): ShopQuery {
  const query = emptyShopQuery(preset.category ?? 'all');
  const add = (key: FacetKey, value: string) => {
    const list = query.facets[key] ?? [];
    if (!list.includes(value)) query.facets[key] = [...list, value];
  };
  const flag = (key: FlagKey) => {
    if (!query.flags.includes(key)) query.flags.push(key);
  };

  preset.surfaces?.forEach((s) => add('surface', slugify(s)));
  if (preset.surface) add('surface', slugify(preset.surface));
  preset.brands?.forEach((b) => add('brand', slugify(b)));
  if (preset.brand) add('brand', slugify(preset.brand));
  if (preset.league && preset.league !== 'all') {
    if (preset.league === 'International') add('team-type', 'national');
    else if (preset.league !== 'Formula 1') add('league', slugify(preset.league));
  }
  if (preset.season && preset.season !== 'all') {
    add('season', preset.season === 'retro-archive' ? 'retro' : slugify(preset.season));
  }
  if (preset.retroOnly) add('season', 'retro');
  if (preset.f1GarmentType && preset.f1GarmentType !== 'all') add('garment', preset.f1GarmentType);
  if (preset.f1Team && preset.f1Team !== 'all') add('team', slugify(preset.f1Team));
  if (preset.ballSubcategory === 'futsal') add('type', 'futsal');
  if (preset.ballSubcategory === 'fifa-pro' || preset.ballSubcategory === 'league') add('type', 'match-ball');
  if (preset.essentialsSubcategory && preset.essentialsSubcategory !== 'all') {
    add('type', preset.essentialsSubcategory === 'protection' ? 'shin-guards' : preset.essentialsSubcategory);
  }
  if (preset.sizeFilter) add('size', slugify(preset.sizeFilter));
  if (preset.uclOnly) flag('ucl');
  if (preset.limitedEditionOnly) flag('limited');
  if (preset.bestSellersOnly) flag('bestseller');
  if (preset.newArrivalsOnly) flag('new');
  if (preset.saleOnly) flag('sale');
  if (preset.customizableOnly) flag('custom');
  if (preset.inStockOnly) flag('instock');
  if (preset.searchQuery) query.q = preset.searchQuery;
  return query;
}

/** Reads facets/flags/search from URL params, layered on top of a base query. */
export function parseShopParams(params: URLSearchParams | string, base: ShopQuery): ShopQuery {
  const search = typeof params === 'string' ? new URLSearchParams(params) : params;
  const query: ShopQuery = {
    category: base.category,
    facets: { ...base.facets },
    flags: [...base.flags],
    q: base.q,
    sort: base.sort,
  };
  for (const key of FACET_KEYS) {
    const raw = search.get(key);
    if (!raw) continue;
    const values = raw.split(',').map((v) => slugify(v)).filter(Boolean);
    if (values.length) query.facets[key] = Array.from(new Set([...(query.facets[key] ?? []), ...values]));
  }
  const only = search.get('only');
  if (only) {
    for (const f of only.split(',')) {
      if (FLAG_KEYS.includes(f as FlagKey) && !query.flags.includes(f as FlagKey)) {
        query.flags.push(f as FlagKey);
      }
    }
  }
  const q = search.get('q');
  if (q) query.q = q;
  return query;
}

/** Serialises facets/flags/search (not sort) into a stable query string. */
export function serializeShopParams(query: ShopQuery): string {
  const params = new URLSearchParams();
  for (const key of FACET_KEYS) {
    const values = query.facets[key];
    if (values?.length) params.set(key, values.join(','));
  }
  if (query.flags.length) params.set('only', [...query.flags].sort().join(','));
  if (query.q.trim()) params.set('q', query.q.trim());
  return params.toString().replace(/%2C/g, ',');
}

// ---------------------------------------------------------------------------
// Query updates (immutable)
// ---------------------------------------------------------------------------

export function toggleFacetValue(query: ShopQuery, key: FacetKey, value: string): ShopQuery {
  const current = query.facets[key] ?? [];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  const facets = { ...query.facets, [key]: next };
  if (!next.length) delete facets[key];
  return { ...query, facets };
}

export function toggleFlag(query: ShopQuery, key: FlagKey): ShopQuery {
  const flags = query.flags.includes(key) ? query.flags.filter((f) => f !== key) : [...query.flags, key];
  return { ...query, flags };
}

/** Switching category keeps only the filters that still make sense there. */
export function changeCategory(query: ShopQuery, category: ShopCategory): ShopQuery {
  const allowed = CATEGORY_FILTERS[category];
  const facets: ShopQuery['facets'] = {};
  for (const key of allowed.facets) {
    if (key === 'brand' || key === 'price') {
      if (query.facets[key]?.length) facets[key] = query.facets[key];
    }
  }
  return {
    ...query,
    category,
    facets,
    flags: query.flags.filter((f) => allowed.flags.includes(f)),
  };
}

export function clearAllFilters(query: ShopQuery): ShopQuery {
  return { ...query, facets: {}, flags: [], q: '' };
}

export function countActiveFilters(query: ShopQuery): number {
  const facetCount = Object.values(query.facets).reduce((n, v) => n + (v?.length ?? 0), 0);
  return facetCount + query.flags.length + (query.q.trim() ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Filtering, counting, sorting
// ---------------------------------------------------------------------------

function matchesSearch(product: Product, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    product.name,
    product.brand,
    product.club ?? '',
    product.league ?? '',
    product.season ?? '',
    product.kitType ?? '',
    product.colorway,
    product.category,
  ]
    .join(' ')
    .toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

/** Only the facets/flags that apply to the query's category are used. */
function activeFacetKeys(query: ShopQuery): FacetKey[] {
  return CATEGORY_FILTERS[query.category].facets.filter((k) => query.facets[k]?.length);
}

function activeFlags(query: ShopQuery): FlagKey[] {
  return query.flags.filter((f) => CATEGORY_FILTERS[query.category].flags.includes(f));
}

function matches(product: Product, query: ShopQuery, skipFacet?: FacetKey): boolean {
  if (query.category !== 'all' && product.category !== query.category) return false;
  for (const key of activeFacetKeys(query)) {
    if (key === skipFacet) continue;
    const selected = query.facets[key]!;
    const values = FACETS[key].values(product);
    if (!values.some((v) => selected.includes(v))) return false;
  }
  for (const flag of activeFlags(query)) {
    if (!FLAGS[flag].test(product)) return false;
  }
  return matchesSearch(product, query.q);
}

export function sortShopProducts(products: Product[], sort: SortOption): Product[] {
  const seasonRank = (p: Product) => (p.isRetro ? 0 : Number.parseInt(p.season ?? '0', 10) || 0);
  const sorted = [...products];
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price || b.rating - a.rating);
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price || b.rating - a.rating);
    case 'newest':
      return sorted.sort(
        (a, b) =>
          Number(Boolean(b.isNewArrival)) - Number(Boolean(a.isNewArrival)) ||
          seasonRank(b) - seasonRank(a) ||
          b.rating - a.rating,
      );
    case 'best-sellers':
      return sorted.sort(
        (a, b) =>
          Number(Boolean(b.isBestSeller)) - Number(Boolean(a.isBestSeller)) ||
          b.reviewCount - a.reviewCount,
      );
    case 'rating-desc':
      return sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case 'weight-asc':
      return sorted.sort((a, b) => (a.weightGrams ?? 999) - (b.weightGrams ?? 999));
    case 'featured':
    default:
      return sorted.sort(
        (a, b) =>
          Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
          Number(Boolean(b.isBestSeller)) - Number(Boolean(a.isBestSeller)),
      );
  }
}

export function applyShopQuery(products: Product[], query: ShopQuery): Product[] {
  return sortShopProducts(products.filter((p) => matches(p, query)), query.sort);
}

/**
 * Options for one facet with live counts. Counts ignore the facet's own
 * selection (so you can see how many results each extra choice would add)
 * but respect every other active filter.
 */
export function getFacetOptions(products: Product[], query: ShopQuery, key: FacetKey): FacetOption[] {
  const def = FACETS[key];
  const scoped = products.filter((p) => query.category === 'all' || p.category === query.category);
  const pool = products.filter((p) => matches(p, query, key));
  const counts = new Map<string, number>();
  for (const p of scoped) for (const v of def.values(p)) if (!counts.has(v)) counts.set(v, 0);
  for (const p of pool) for (const v of new Set(def.values(p))) counts.set(v, (counts.get(v) ?? 0) + 1);
  const selected = query.facets[key] ?? [];
  for (const v of selected) if (!counts.has(v)) counts.set(v, 0);

  const values = [...counts.keys()];
  const compare = def.compare ?? ((a: string, b: string) => def.optionLabel(a, scoped).localeCompare(def.optionLabel(b, scoped)));
  return values.sort(compare).map((value) => ({
    value,
    label: def.optionLabel(value, scoped),
    count: counts.get(value) ?? 0,
    selected: selected.includes(value),
  }));
}

export function getFlagCount(products: Product[], query: ShopQuery, key: FlagKey): number {
  const without = { ...query, flags: query.flags.filter((f) => f !== key) };
  return products.filter((p) => matches(p, without) && FLAGS[key].test(p)).length;
}

export interface ActiveChip {
  id: string;
  label: string;
  remove: (query: ShopQuery) => ShopQuery;
}

/** One removable chip per selected value, in sidebar order. */
export function getActiveChips(products: Product[], query: ShopQuery): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const scoped = products.filter((p) => query.category === 'all' || p.category === query.category);
  for (const key of CATEGORY_FILTERS[query.category].facets) {
    for (const value of query.facets[key] ?? []) {
      chips.push({
        id: `${key}:${value}`,
        label: FACETS[key].optionLabel(value, scoped),
        remove: (q) => toggleFacetValue(q, key, value),
      });
    }
  }
  for (const flag of activeFlags(query)) {
    chips.push({ id: `only:${flag}`, label: FLAGS[flag].label, remove: (q) => toggleFlag(q, flag) });
  }
  if (query.q.trim()) {
    chips.push({ id: 'q', label: `“${query.q.trim()}”`, remove: (q) => ({ ...q, q: '' }) });
  }
  return chips;
}
