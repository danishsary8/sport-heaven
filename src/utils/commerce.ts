import type {
  BranchId,
  CartItem,
  CustomerDetails,
  CustomPrintConfig,
  FulfillmentMethod,
  JerseyPatchId,
  KitEditionType,
  NationalRegion,
  Order,
  Product,
  ProductCategory,
  ProductFilters,
  SortOption,
} from '../types/store';

export const JERSEY_EU_SIZE_MAP: Record<string, string> = {
  S: 'EU 46',
  M: 'EU 48–50',
  L: 'EU 52–54',
  XL: 'EU 56',
  XXL: 'EU 58',
};

export function formatJerseySizeWithEu(size: string): string {
  const eu = JERSEY_EU_SIZE_MAP[size];
  return eu ? `${size} (${eu})` : size;
}

export const NATIONAL_TEAM_REGIONS: Array<{
  id: NationalRegion;
  label: string;
  countriesHint: string;
}> = [
  { id: 'Europe', label: 'Europe', countriesHint: 'France, Spain, Germany, Italy' },
  { id: 'South America', label: 'South America', countriesHint: 'Argentina, Brazil' },
  { id: 'Asia / ASEAN', label: 'Asia / ASEAN', countriesHint: 'Japan, South Korea, Cambodia' },
];

export const SEASON_FILTER_OPTIONS = [
  { id: 'all', label: 'All Seasons' },
  { id: '2026/27', label: '2026/27 Season' },
  { id: '2026', label: '2026 F1 Season' },
  { id: '2025/26', label: '2025/26 Season' },
  { id: 'retro-archive', label: 'Retro Archive (1998–2002)' },
] as const;

export const F1_TEAMS = [
  'Scuderia Ferrari',
  'Oracle Red Bull Racing',
  'Mercedes-AMG Petronas',
  'McLaren F1 Team',
] as const;

export const KHR_RATE = 4100;
export const FREE_SHIPPING_THRESHOLD = 50;
export const EXPRESS_DELIVERY_FEE = 2.5;
export const CUSTOM_PRINT_BASE_FEE = 8;

export const PATCH_OPTIONS: Array<{
  id: JerseyPatchId;
  label: string;
  shortLabel: string;
  fee: number;
}> = [
  { id: 'none', label: 'No Sleeve Patch', shortLabel: 'None', fee: 0 },
  { id: 'ucl', label: 'UEFA Champions League Starball Patch', shortLabel: 'UCL Starball', fee: 5 },
  { id: 'cpl', label: 'Cambodian Premier League Patch', shortLabel: 'CPL Patch', fee: 4 },
  { id: 'aff', label: 'AFF Championship Patch', shortLabel: 'AFF Patch', fee: 4 },
  { id: 'champions', label: 'League Champions Gold Badge', shortLabel: 'Champions', fee: 5 },
  { id: 'f1-paddock', label: 'F1 Paddock Sponsor Sleeve', shortLabel: 'F1 Paddock', fee: 5 },
];

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatKhr(usdAmount: number): string {
  const rounded = Math.round((usdAmount * KHR_RATE) / 100) * 100;
  return `${rounded.toLocaleString('en-US')} ៛`;
}

export function getPatchFee(patch: JerseyPatchId): number {
  const found = PATCH_OPTIONS.find((p) => p.id === patch);
  return found ? found.fee : 0;
}

export function getPatchLabel(patch: JerseyPatchId): string {
  const found = PATCH_OPTIONS.find((p) => p.id === patch);
  return found ? found.label : 'No Sleeve Patch';
}

export function sanitizePlayerName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9 .'-]/g, '')
    .slice(0, 14);
}

export function sanitizeSquadNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 2);
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (num === 0) return '1';
  return String(Math.min(99, num));
}

export function getCustomPrintFee(customPrint?: CustomPrintConfig): number {
  if (!customPrint || !customPrint.enabled) return 0;
  return CUSTOM_PRINT_BASE_FEE + getPatchFee(customPrint.patch);
}

export function getCartItemUnitPrice(
  basePrice: number,
  customPrint?: CustomPrintConfig,
): number {
  return Number((basePrice + getCustomPrintFee(customPrint)).toFixed(2));
}

export function getCartLineId(
  productId: string,
  size: string,
  customPrint?: CustomPrintConfig,
): string {
  if (!customPrint || !customPrint.enabled) {
    return `${productId}::${size}::plain`;
  }
  const cleanName = sanitizePlayerName(customPrint.playerName).trim();
  const cleanNum = sanitizeSquadNumber(customPrint.squadNumber);
  return `${productId}::${size}::print::${cleanName}::${cleanNum}::${customPrint.patch}::${customPrint.fontStyle ?? 'pro-condensed'}`;
}

export interface CartTotals {
  itemCount: number;
  jerseyCount: number;
  subtotal: number;
  teamDiscount: number;
  promoDiscount: number;
  promoValid: boolean;
  promoMessage: string;
  shippingFee: number;
  freeShippingRemaining: number;
  totalUsd: number;
  totalKhr: number;
}

export function calculateCartTotals(
  items: CartItem[],
  promoCodeRaw: string,
  fulfillmentMethod: FulfillmentMethod = 'delivery',
): CartTotals {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const jerseyCount = items.reduce(
    (sum, item) =>
      item.category === 'jerseys' || item.category === 'f1'
        ? sum + item.quantity
        : sum,
    0,
  );
  const subtotal = Number(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2),
  );

  // Automatic 10% Phnom Penh Squad Team Discount on 5+ football/F1 jerseys
  const jerseySubtotal = items.reduce(
    (sum, item) =>
      item.category === 'jerseys' || item.category === 'f1'
        ? sum + item.unitPrice * item.quantity
        : sum,
    0,
  );
  const teamDiscount =
    jerseyCount >= 5 ? Number((jerseySubtotal * 0.1).toFixed(2)) : 0;

  const afterTeam = Math.max(0, subtotal - teamDiscount);
  const code = promoCodeRaw.trim().toUpperCase();

  let promoDiscount = 0;
  let promoValid = false;
  let promoMessage = '';
  let freeDeliveryFromPromo = false;

  if (code === 'CASTLE10') {
    promoDiscount = Number((afterTeam * 0.1).toFixed(2));
    promoValid = true;
    promoMessage = 'CASTLE10 applied (10% off)';
  } else if (code === 'PPFREE') {
    promoValid = true;
    freeDeliveryFromPromo = true;
    promoMessage = 'PPFREE applied (Free Phnom Penh delivery)';
  } else if (code.length > 0) {
    promoValid = false;
    promoMessage = 'Invalid code. Try CASTLE10 or PPFREE.';
  }

  const discountedSubtotal = Math.max(0, Number((afterTeam - promoDiscount).toFixed(2)));
  const freeShippingRemaining = Math.max(
    0,
    Number((FREE_SHIPPING_THRESHOLD - discountedSubtotal).toFixed(2)),
  );

  let shippingFee = 0;
  if (items.length > 0 && fulfillmentMethod === 'delivery') {
    if (discountedSubtotal >= FREE_SHIPPING_THRESHOLD || freeDeliveryFromPromo) {
      shippingFee = 0;
    } else {
      shippingFee = EXPRESS_DELIVERY_FEE;
    }
  }

  const totalUsd = Number((discountedSubtotal + shippingFee).toFixed(2));
  const totalKhr = Math.round((totalUsd * KHR_RATE) / 100) * 100;

  return {
    itemCount,
    jerseyCount,
    subtotal,
    teamDiscount,
    promoDiscount,
    promoValid,
    promoMessage,
    shippingFee,
    freeShippingRemaining,
    totalUsd,
    totalKhr,
  };
}

export function filterAndSortProducts(
  products: Product[],
  filters: ProductFilters,
  sort: SortOption,
): Product[] {
  const query = filters.searchQuery.trim().toLowerCase();

  const filtered = products.filter((product) => {
    if (filters.category !== 'all' && product.category !== filters.category) {
      return false;
    }

    if (filters.surfaces.length > 0) {
      if (!product.surface) return false;
      const matchesSurface = filters.surfaces.some((s) => {
        if (product.surface === s) return true;
        if (product.surface === 'FG/AG' && (s === 'FG' || s === 'AG')) return true;
        if (product.surface === 'MG' && (s === 'FG' || s === 'AG' || s === 'TF')) return true;
        return false;
      });
      if (!matchesSurface) return false;
    }

    if (filters.brands.length > 0 && !filters.brands.includes(product.brand)) {
      return false;
    }

    if (product.price > filters.maxPrice) {
      return false;
    }

    if (filters.branch !== 'all') {
      const level = product.branchStock[filters.branch as BranchId];
      if (level === 'Out of Stock') return false;
    }

    if (filters.customizableOnly && !product.customizable) {
      return false;
    }

    if (filters.league && filters.league !== 'all' && product.league !== filters.league) {
      return false;
    }

    if (filters.nationalRegion && filters.nationalRegion !== 'all') {
      if (product.nationalRegion !== filters.nationalRegion) return false;
    }

    if (filters.season && filters.season !== 'all') {
      if (filters.season === 'retro-archive') {
        if (!product.isRetro) return false;
      } else if (product.season !== filters.season) {
        return false;
      }
    }

    if (filters.uclOnly && !product.isChampionsLeague) {
      return false;
    }

    if (filters.retroOnly && !product.isRetro) {
      return false;
    }

    if (
      filters.limitedEditionOnly &&
      !product.isLimitedEdition &&
      product.kitType !== 'Special'
    ) {
      return false;
    }

    if (filters.bestSellersOnly && !product.isBestSeller) {
      return false;
    }

    if (filters.newArrivalsOnly && !product.isNewArrival) {
      return false;
    }

    if (filters.f1GarmentType && filters.f1GarmentType !== 'all') {
      if (product.category !== 'f1' || product.garmentType !== filters.f1GarmentType) {
        return false;
      }
    }

    if (filters.f1Team && filters.f1Team !== 'all') {
      if (product.category !== 'f1' || product.club !== filters.f1Team) {
        return false;
      }
    }

    if (filters.ballSubcategory && filters.ballSubcategory !== 'all') {
      if (product.category !== 'balls') return false;
      const lowerName = product.name.toLowerCase();
      if (filters.ballSubcategory === 'futsal' && !lowerName.includes('futsal')) {
        return false;
      }
      if (
        filters.ballSubcategory === 'league' &&
        !product.isChampionsLeague &&
        !lowerName.includes('la liga') &&
        !lowerName.includes('premier league') &&
        !lowerName.includes('afc')
      ) {
        return false;
      }
      if (
        filters.ballSubcategory === 'fifa-pro' &&
        !product.summary.toLowerCase().includes('fifa quality pro') &&
        !product.techHighlights.some((h) => h.toLowerCase().includes('fifa quality pro'))
      ) {
        return false;
      }
    }

    if (filters.essentialsSubcategory && filters.essentialsSubcategory !== 'all') {
      if (product.category !== 'essentials') return false;
      const lowerName = product.name.toLowerCase();
      if (filters.essentialsSubcategory === 'gloves' && !lowerName.includes('glove')) {
        return false;
      }
      if (filters.essentialsSubcategory === 'socks' && !lowerName.includes('sock')) {
        return false;
      }
      if (filters.essentialsSubcategory === 'protection' && !lowerName.includes('guard')) {
        return false;
      }
    }

    if (filters.signatureBootOnly && !product.isSignatureEdition) {
      return false;
    }

    if (filters.minRating && product.rating < filters.minRating) {
      return false;
    }

    if (filters.sizeFilter && !product.sizes.includes(filters.sizeFilter)) {
      return false;
    }

    if (filters.inStockOnly) {
      const hasAnyStock = Object.values(product.branchStock).some(
        (level) => level !== 'Out of Stock',
      );
      if (!hasAnyStock) return false;
    }

    if (filters.saleOnly) {
      if (!product.originalPrice || product.originalPrice <= product.price) {
        return false;
      }
    }

    if (query) {
      const haystack = [
        product.name,
        product.brand,
        product.club ?? '',
        product.league ?? '',
        product.nationalRegion ?? '',
        product.season ?? '',
        product.kitType ?? '',
        product.garmentType ?? '',
        product.isChampionsLeague ? 'uefa champions league ucl' : '',
        product.isRetro ? 'retro classic vintage archive' : '',
        product.isLimitedEdition ? 'limited edition collector special' : '',
        product.isSignatureEdition ? 'messi signature edition' : '',
        product.colorway,
        product.category,
        product.surface ?? '',
        product.summary,
        ...product.techHighlights,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  const sorted = [...filtered];
  switch (sort) {
    case 'best-sellers':
      sorted.sort(
        (a, b) =>
          Number(Boolean(b.isBestSeller)) - Number(Boolean(a.isBestSeller)) ||
          b.reviewCount - a.reviewCount ||
          b.rating - a.rating,
      );
      break;
    case 'price-asc':
      sorted.sort((a, b) => a.price - b.price || b.rating - a.rating);
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.price - a.price || b.rating - a.rating);
      break;
    case 'newest':
      sorted.sort(
        (a, b) =>
          Number(Boolean(b.isNewArrival)) - Number(Boolean(a.isNewArrival)) ||
          b.rating - a.rating,
      );
      break;
    case 'rating-desc':
      sorted.sort(
        (a, b) =>
          b.rating - a.rating ||
          b.reviewCount - a.reviewCount ||
          a.price - b.price,
      );
      break;
    case 'weight-asc':
      sorted.sort((a, b) => (a.weightGrams ?? 999) - (b.weightGrams ?? 999) || a.price - b.price);
      break;
    case 'featured':
    default:
      sorted.sort(
        (a, b) =>
          Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
          Number(Boolean(b.isBestSeller)) - Number(Boolean(a.isBestSeller)),
      );
      break;
  }

  return sorted;
}

export interface CheckoutValidationErrors {
  fullName?: string;
  phone?: string;
  telegram?: string;
  khan?: string;
  streetAddress?: string;
}

export function validateCheckoutDetails(
  details: CustomerDetails,
  fulfillmentMethod: FulfillmentMethod,
): CheckoutValidationErrors {
  const errors: CheckoutValidationErrors = {};

  if (details.fullName.trim().length < 2) {
    errors.fullName = 'Please enter your full name.';
  }

  const digits = details.phone.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 13) {
    errors.phone = 'Enter a valid Cambodian phone number (e.g. +855 12 345 678).';
  }

  if (details.telegram.trim().length > 0 && details.telegram.trim().length < 3) {
    errors.telegram = 'Telegram handle should be at least 3 characters.';
  }

  if (fulfillmentMethod === 'delivery') {
    if (!details.khan.trim()) {
      errors.khan = 'Select a Phnom Penh Khan / district.';
    }
    if (details.streetAddress.trim().length < 5) {
      errors.streetAddress = 'Enter your street, house, or pitch landmark address.';
    }
  }

  return errors;
}

export interface BootFinderCriteria {
  pitch: 'natural-grass' | 'artificial-turf' | 'indoor-futsal';
  playstyle: 'speed' | 'control' | 'heritage';
  maxBudget: number;
}

export function matchBootsForPlayer(
  products: Product[],
  criteria: BootFinderCriteria,
): Product[] {
  const boots = products.filter((p) => p.category === 'boots');

  const scored = boots
    .filter((b) => b.price <= criteria.maxBudget)
    .map((boot) => {
      let score = 0;

      if (criteria.pitch === 'natural-grass') {
        if (boot.surface === 'FG' || boot.surface === 'FG/AG') score += 50;
        if (boot.surface === 'MG') score += 25;
      } else if (criteria.pitch === 'artificial-turf') {
        if (boot.surface === 'TF' || boot.surface === 'AG') score += 50;
        if (boot.surface === 'MG' || boot.surface === 'FG/AG') score += 35;
      } else if (criteria.pitch === 'indoor-futsal') {
        if (boot.surface === 'MG' || boot.surface === 'FG/AG') score += 55;
        if (boot.surface === 'TF' || boot.surface === 'AG') score += 30;
      }

      const text = `${boot.name} ${boot.summary} ${boot.techHighlights.join(' ')}`.toLowerCase();
      if (criteria.playstyle === 'speed' && (text.includes('mercurial') || text.includes('f50') || text.includes('morelia') || (boot.weightGrams ?? 999) <= 190)) {
        score += 30;
      }
      if (criteria.playstyle === 'control' && (text.includes('phantom') || text.includes('future') || text.includes('gripknit') || text.includes('rebound'))) {
        score += 30;
      }
      if (criteria.playstyle === 'heritage' && (text.includes('leather') || text.includes('copa') || text.includes('tiempo') || text.includes('mizuno'))) {
        score += 30;
      }

      return { boot, score };
    })
    .filter((entry) => entry.score >= 25)
    .sort((a, b) => b.score - a.score);

  return scored.map((entry) => entry.boot);
}

export function recommendBootSizeFromCm(cm: number): {
  eu: string;
  us: string;
  uk: string;
  fitNote: string;
} {
  const clamped = Math.max(23.5, Math.min(30.5, cm));
  const table = [
    { cm: 24.0, eu: '38.5', us: '6', uk: '5.5' },
    { cm: 24.5, eu: '39', us: '6.5', uk: '6' },
    { cm: 25.0, eu: '40', us: '7', uk: '6' },
    { cm: 25.5, eu: '40.5', us: '7.5', uk: '6.5' },
    { cm: 26.0, eu: '41', us: '8', uk: '7' },
    { cm: 26.5, eu: '42', us: '8.5', uk: '7.5' },
    { cm: 27.0, eu: '42.5', us: '9', uk: '8' },
    { cm: 27.5, eu: '43', us: '9.5', uk: '8.5' },
    { cm: 28.0, eu: '44', us: '10', uk: '9' },
    { cm: 28.5, eu: '44.5', us: '10.5', uk: '9.5' },
    { cm: 29.0, eu: '45', us: '11', uk: '10' },
    { cm: 29.5, eu: '45.5', us: '11.5', uk: '10.5' },
    { cm: 30.0, eu: '46', us: '12', uk: '11' },
  ];
  const match = table.find((row) => row.cm >= clamped) ?? table[table.length - 1];
  return {
    ...match,
    fitNote: 'For snug match-day lockdown on Mercurial/F50 speed boots, size up 0.5 EU if you have wide feet.',
  };
}

export function generateOrderId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `SC-${num}`;
}

export function formatTelegramOrderMessage(order: Order): string {
  const lines = [
    `SPORT CASTLE ORDER #${order.id}`,
    `Customer: ${order.customer.fullName} (${order.customer.phone})`,
    order.customer.telegram ? `Telegram: ${order.customer.telegram}` : null,
    order.fulfillmentMethod === 'delivery'
      ? `Delivery: ${order.customer.streetAddress}, ${order.customer.sangkat}, ${order.customer.khan}, Phnom Penh`
      : `In-Store Pickup: ${order.pickupBranch?.toUpperCase()} Branch`,
    `Payment: ${order.paymentMethod.toUpperCase()}`,
    `--- ITEMS ---`,
    ...order.items.map((item) => {
      const printText =
        item.customPrint?.enabled
          ? ` [PRINT: ${item.customPrint.playerName || 'NO NAME'} #${item.customPrint.squadNumber || '--'} / ${getPatchLabel(item.customPrint.patch)}]`
          : '';
      return `• ${item.quantity}x ${item.name} (${item.size})${printText} — ${formatUsd(item.unitPrice * item.quantity)}`;
    }),
    `--- TOTAL ---`,
    `Total: ${formatUsd(order.totalUsd)} (${formatKhr(order.totalUsd)})`,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Derives a clean hex swatch color for any product card or variant switcher
 * using explicit swatchHex, jerseyTheme primary color, or colorway keywords.
 */
export function getProductSwatchColor(product: Product): string {
  if (product.swatchHex) return product.swatchHex;
  if (product.jerseyTheme?.primary) return product.jerseyTheme.primary;
  const cw = product.colorway.toLowerCase();
  if (cw.includes('volt') || cw.includes('neon') || cw.includes('lime')) return '#C8F526';
  if (cw.includes('crimson') || cw.includes('red') || cw.includes('scarlet')) return '#D81E2B';
  if (cw.includes('gold') || cw.includes('amber')) return '#C69C2B';
  if (cw.includes('emerald') || cw.includes('green')) return '#059669';
  if (cw.includes('sunset') || cw.includes('orange') || cw.includes('coral')) return '#F97316';
  if (cw.includes('sky') || cw.includes('lapis') || cw.includes('royal') || cw.includes('blue')) return '#1D4ED8';
  if (cw.includes('white') || cw.includes('cloud') || cw.includes('ivory')) return '#E5E7EB';
  return '#18222D';
}

/**
 * Finds sister colorway / kit edition variants for a product (e.g., all FC Barcelona
 * 2026/27 Home/Away/Third kits, or same-brand boots across silos) to power
 * Zando-style on-card swatch switching and PDP visual edition cards.
 */
export function getProductSiblings(products: Product[], product: Product): Product[] {
  if (product.club) {
    const clubKits = products.filter(
      (p) => p.category === product.category && p.club === product.club,
    );
    if (clubKits.length > 1) return clubKits;
  }

  if (product.category === 'boots') {
    const brandBoots = products.filter(
      (p) => p.category === 'boots' && p.brand === product.brand,
    );
    if (brandBoots.length > 1) return brandBoots.slice(0, 4);
  }

  if (product.category === 'f1') {
    return products.filter((p) => p.category === 'f1');
  }

  return [product];
}

export interface BundlePricing {
  items: Product[];
  originalTotal: number;
  savings: number;
  bundleTotal: number;
}

export function calculateLookbookBundlePricing(
  productIds: string[],
  discountPercent: number,
  catalog: Product[],
): BundlePricing {
  const items = productIds
    .map((id) => catalog.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
  const originalTotal = Number(
    items.reduce((sum, item) => sum + item.price, 0).toFixed(2),
  );
  const savings = Number(((originalTotal * discountPercent) / 100).toFixed(2));
  const bundleTotal = Number((originalTotal - savings).toFixed(2));
  return { items, originalTotal, savings, bundleTotal };
}

export interface LoyaltySummary {
  points: number;
  totalSpent: number;
  tier: 'Pitch Rookie' | 'Matchday Pro' | 'Kouprey Gold';
  nextTier: string | null;
  pointsToNext: number;
  progressPct: number;
}

export function calculateLoyaltyTier(orders: Order[]): LoyaltySummary {
  const totalSpent = Number(
    orders.reduce((sum, order) => sum + order.totalUsd, 0).toFixed(2),
  );
  const points = Math.round(totalSpent * 10);

  if (points >= 5000) {
    return {
      points,
      totalSpent,
      tier: 'Kouprey Gold',
      nextTier: null,
      pointsToNext: 0,
      progressPct: 100,
    };
  }
  if (points >= 2000) {
    return {
      points,
      totalSpent,
      tier: 'Matchday Pro',
      nextTier: 'Kouprey Gold',
      pointsToNext: 5000 - points,
      progressPct: Math.min(100, Math.round(((points - 2000) / 3000) * 100)),
    };
  }
  return {
    points,
    totalSpent,
    tier: 'Pitch Rookie',
    nextTier: 'Matchday Pro',
    pointsToNext: 2000 - points,
    progressPct: Math.min(100, Math.round((points / 2000) * 100)),
  };
}

export function updateRecentlyViewed(
  currentIds: string[],
  nextId: string,
  limit = 6,
): string[] {
  return [nextId, ...currentIds.filter((id) => id !== nextId)].slice(0, limit);
}

/**
 * Pure Levenshtein edit distance for spell-check tolerant storefront search.
 */
export function levenshteinDistance(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  if (s === t) return 0;
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  const prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  const curr = new Array<number>(t.length + 1).fill(0);

  for (let i = 1; i <= s.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= t.length; j++) prev[j] = curr[j];
  }
  return prev[t.length];
}

const KNOWN_SEARCH_TERMS = [
  'Barcelona',
  'Real Madrid',
  'Predator',
  'Mercurial',
  'Phantom',
  'Tiempo',
  'Mizuno',
  'Morelia',
  'Puma',
  'Ultra',
  'Lunar Gato',
  'Cambodia',
  'Varaman',
  'Arsenal',
  'Liverpool',
  'Chelsea',
  'Bayern',
  'Juventus',
  'Milan',
  'Inter',
  'Ferrari',
  'Red Bull',
  'Mercedes',
  'Argentina',
  'Futsal',
  'Goalkeeper',
  'Turf',
];

export interface FuzzySearchResult<TArticle, TCollection> {
  products: Product[];
  articles: TArticle[];
  collections: TCollection[];
  didYouMean: string | null;
  usedCorrection: string | null;
}

export function fuzzySearchSite<
  TArticle extends { title: string; excerpt: string; category: string },
  TCollection extends { title: string; seoDescription: string; slug: string },
>(
  products: Product[],
  articles: TArticle[],
  collections: TCollection[],
  rawQuery: string,
): FuzzySearchResult<TArticle, TCollection> {
  const q = rawQuery.trim().toLowerCase();
  if (!q) {
    return {
      products: products.slice(0, 12),
      articles,
      collections,
      didYouMean: null,
      usedCorrection: null,
    };
  }

  const runDirect = (term: string) => {
    const tokens = term.split(/\s+/).filter(Boolean);
    const matchedProducts = products.filter((p) => {
      const hay = `${p.name} ${p.shortName} ${p.brand} ${p.club ?? ''} ${p.league ?? ''} ${p.colorway} ${p.surface ?? ''} ${p.category} ${p.summary}`.toLowerCase();
      return tokens.every((tk) => hay.includes(tk));
    });
    const matchedArticles = articles.filter((a) => {
      const hay = `${a.title} ${a.excerpt} ${a.category}`.toLowerCase();
      return tokens.some((tk) => hay.includes(tk));
    });
    const matchedCollections = collections.filter((c) => {
      const hay = `${c.title} ${c.seoDescription} ${c.slug}`.toLowerCase();
      return tokens.some((tk) => hay.includes(tk));
    });
    return { matchedProducts, matchedArticles, matchedCollections };
  };

  const direct = runDirect(q);
  if (
    direct.matchedProducts.length > 0 ||
    direct.matchedArticles.length > 0 ||
    direct.matchedCollections.length > 0
  ) {
    return {
      products: direct.matchedProducts,
      articles: direct.matchedArticles,
      collections: direct.matchedCollections,
      didYouMean: null,
      usedCorrection: null,
    };
  }

  // Spell-check tolerance: find closest known domain term (distance <= 2)
  let bestTerm: string | null = null;
  let bestDist = Infinity;
  const queryWords = q.split(/\s+/).filter(Boolean);

  for (const candidate of KNOWN_SEARCH_TERMS) {
    const candLower = candidate.toLowerCase();
    for (const qw of queryWords) {
      if (qw.length < 3) continue;
      const d = levenshteinDistance(qw, candLower);
      if (d <= 2 && d < bestDist) {
        bestDist = d;
        bestTerm = candidate;
      }
    }
    const fullDist = levenshteinDistance(q, candLower);
    if (fullDist <= 2 && fullDist < bestDist) {
      bestDist = fullDist;
      bestTerm = candidate;
    }
  }

  if (bestTerm) {
    const corrected = runDirect(bestTerm.toLowerCase());
    return {
      products: corrected.matchedProducts,
      articles: corrected.matchedArticles,
      collections: corrected.matchedCollections,
      didYouMean: bestTerm,
      usedCorrection: bestTerm,
    };
  }

  return {
    products: [],
    articles: [],
    collections: [],
    didYouMean: null,
    usedCorrection: null,
  };
}

export interface PasswordValidation {
  minLength: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  isValid: boolean;
}

export function validatePasswordStrength(password: string): PasswordValidation {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return {
    minLength,
    hasUpper,
    hasNumber,
    isValid: minLength && hasUpper && hasNumber,
  };
}

export function validateGiftCardInput(input: {
  amount: number;
  recipientEmail: string;
  recipientName: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!Number.isFinite(input.amount) || input.amount < 10 || input.amount > 500) {
    errors.amount = 'Choose a gift card amount between $10 and $500.';
  }
  if (!input.recipientName.trim()) {
    errors.recipientName = 'Enter the recipient name.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.recipientEmail.trim())) {
    errors.recipientEmail = 'Enter a valid recipient email address.';
  }
  return errors;
}

export function generateRmaId(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `RMA-SC-${num}`;
}

export function calculateRmaRefund(
  selectedItems: Array<{ unitPrice: number; quantity: number }>,
  resolution: 'refund' | 'size-exchange' | 'store-credit',
): { subtotal: number; bonusCredit: number; totalRefund: number } {
  const subtotal = Number(
    selectedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2),
  );
  // Instant store credit gives +5% Sport Castle bonus
  const bonusCredit =
    resolution === 'store-credit' ? Number((subtotal * 0.05).toFixed(2)) : 0;
  const totalRefund = Number((subtotal + bonusCredit).toFixed(2));
  return { subtotal, bonusCredit, totalRefund };
}

/**
 * Returns true strictly for football jerseys, national kits, and F1 paddock teamwear.
 * Used to scope the Zando-engineered Minimalist Kit Atelier UI exclusively to kits.
 */
export function isKitProduct(product: Pick<Product, 'category'>): boolean {
  return product.category === 'jerseys' || product.category === 'f1';
}

export function isKitCollectionView(
  category: ProductCategory | 'all',
  collectionSlug?: string,
): boolean {
  if (category === 'jerseys' || category === 'f1') return true;
  return (
    collectionSlug === 'jerseys-kits' ||
    collectionSlug === 'ucl-2026-27' ||
    collectionSlug === 'national-teams' ||
    collectionSlug === 'retro-jerseys' ||
    collectionSlug === 'limited-edition' ||
    collectionSlug === 'f1-motorsport' ||
    collectionSlug === 'f1-jackets'
  );
}

/**
 * Circular next-index calculation for auto-shift carousels.
 */
export function getNextCarouselIndex(
  currentIndex: number,
  delta: number,
  totalItems: number,
): number {
  if (totalItems <= 0) return 0;
  return ((currentIndex + delta) % totalItems + totalItems) % totalItems;
}

/**
 * Deterministic cross-variant size availability matrix for limited Away/Third/Special kits.
 * Allows PDP & Quick-Size UI to render realistic sold-out strikethrough states & "Notify Me" flows.
 */
export function getKitUnavailableSizes(product: Product): string[] {
  if (!isKitProduct(product)) return [];
  const hasLimitedBranch = Object.values(product.branchStock).some(
    (level) => level === 'Limited Stock' || level === 'Out of Stock',
  );
  if (product.kitType === 'Third' && product.sizes.includes('XXL')) {
    return ['XXL'];
  }
  if (
    product.kitType === 'Special' &&
    product.sizes.includes('S')
  ) {
    return ['S'];
  }
  if (hasLimitedBranch && product.kitType === 'Away' && product.sizes.includes('XXL')) {
    return ['XXL'];
  }
  return [];
}

export function filterKitsByEdition(
  products: Product[],
  edition: 'all' | KitEditionType,
): Product[] {
  if (edition === 'all') return products;
  return products.filter((p) => p.kitType === edition);
}



