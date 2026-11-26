/** Small API fixtures shared by MSW-backed tests. Shapes follow the generated contract. */
export const MENU = {
  categories: [
    { slug: 'boots', name: 'Boots', productCount: 20 },
    { slug: 'jerseys', name: 'Jerseys', productCount: 30 },
  ],
  brands: [
    { slug: 'nike', name: 'Nike', productCount: 12 },
    { slug: 'puma', name: 'Puma', productCount: 4 },
  ],
  collections: [{ slug: 'new-arrivals', name: 'New arrivals' }],
};

export const BRANCHES = {
  branches: [
    { id: 'sensok', name: 'Sport Castle Sen Sok', shortName: 'Sen Sok', address: 'St 1986', district: 'Sen Sok', phone: '012 000 001', telegram: null, hours: '8:00–21:00', landmarks: null, lat: 11.58, lng: 104.88, pickupEnabled: true },
    { id: 'sonthormuk', name: 'Sport Castle Sonthormuk', shortName: 'Sonthormuk', address: 'St 271', district: 'Tuol Kork', phone: '012 000 002', telegram: '@sc_sonthormuk', hours: '8:00–21:00', landmarks: null, lat: null, lng: null, pickupEnabled: true },
  ],
};

export function product(i: number, over: Record<string, unknown> = {}) {
  return {
    id: `p${i}`,
    slug: `product-${i}`,
    name: `Product ${i}`,
    brand: { slug: 'nike', name: 'Nike' },
    category: 'boots',
    imageUrl: `/assets/catalog/p${i}.jpg`,
    hoverImageUrl: null,
    priceCents: 9500 + i,
    compareAtCents: null,
    discountPct: null,
    badges: [],
    colors: [{ name: 'Black', swatchHex: '#000000' }],
    sizes: ['EU 40', 'EU 41'],
    availability: 'ok',
    lowStockCount: null,
    ...over,
  };
}

export const FILTERS = {
  total: 2,
  facets: [
    { key: 'category', label: 'Category', type: 'radio', options: [{ value: 'boots', label: 'Boots', count: 2, selected: true }] },
    {
      key: 'brand',
      label: 'Brand',
      type: 'checkbox',
      options: [
        { value: 'nike', label: 'Nike', count: 1, selected: false },
        { value: 'puma', label: 'Puma', count: 1, selected: false },
      ],
    },
    { key: 'size', label: 'Size', type: 'checkbox', options: [{ value: 'EU 41', label: 'EU 41', count: 2, selected: false }] },
    {
      key: 'price',
      label: 'Price',
      type: 'range',
      options: [],
      range: { min: 2000, max: 27500, selectedMin: null, selectedMax: null, buckets: [{ label: '$0–$25', min: 0, max: 2500, count: 1 }, { label: '$200+', min: 20000, max: null, count: 1 }] },
    },
    { key: 'inStockOnly', label: 'Availability', type: 'checkbox', options: [{ value: 'true', label: 'In stock', count: 2, selected: false }] },
  ],
};

export function cartLine(i: number, over: Record<string, unknown> = {}) {
  return {
    id: `line${i}`,
    productSlug: `product-${i}`,
    productName: `Product ${i}`,
    brand: 'Nike',
    imageUrl: null,
    size: 'EU 41',
    color: 'Black',
    sku: `SKU${i}`,
    qty: 1,
    maxQty: 5,
    availability: 'ok',
    lowStockCount: null,
    customPrint: null,
    unitPriceCents: 9500,
    compareAtCents: null,
    printFeeCents: 0,
    discountCents: 0,
    lineTotalCents: 9500,
    purchasable: true,
    problem: null,
    ...over,
  };
}

/** A full cart response; totals are whatever the test says (the browser never computes them). */
export function cart(lines: ReturnType<typeof cartLine>[], over: { totalCents?: number; promo?: { code: string | null; applied: boolean; message: string | null }; checkoutReady?: boolean; discounts?: { kind: string; label: string; amountCents: number }[] } = {}) {
  const total = over.totalCents ?? lines.reduce((n, l) => n + (l.lineTotalCents as number), 0);
  return {
    cart: {
      id: 'c1',
      lines,
      pricing: {
        lines: [],
        merchandiseCents: total,
        discounts: over.discounts ?? [],
        shippingCents: 0,
        totalCents: total,
        totalKhr: total * 41,
        promo: over.promo ?? { code: null, applied: false, message: null },
        memberPerks: { tier: null, applied: [] },
        freeDeliveryRemainingCents: null,
        messages: [],
      },
      promoCode: over.promo?.code ?? null,
      checkoutReady: over.checkoutReady ?? lines.every((l) => l.problem === null),
      notices: ["Items in your bag aren't reserved until you check out"],
    },
  };
}

export const EMPTY_CART = cart([]);

export const MEMBER = {
  id: 'u1',
  phone: '+85512345678',
  email: null,
  fullName: 'Dara Sok',
  role: 'customer',
  staffBranchId: null,
  phoneVerified: true,
};

export const sessionFor = (user: Record<string, unknown> = MEMBER) => ({ user, cartMerged: null });

export const ADDRESS = {
  id: 'a1a1a1a1-1111-4111-8111-111111111111',
  label: 'Home',
  recipientName: 'Dara Sok',
  phone: '+85512345678',
  province: { code: '12', nameEn: 'Phnom Penh', nameKm: 'ភ្នំពេញ' },
  district: { code: '1201', nameEn: 'Chamkar Mon', nameKm: 'ចំការមន' },
  commune: { code: '120101', nameEn: 'Tonle Bassac', nameKm: 'ទន្លេបាសាក់' },
  street: 'St 51, house 12',
  landmark: null,
  lat: null,
  lng: null,
  isDefault: true,
  createdAt: '2026-11-01T00:00:00Z',
};

export const GEO = {
  provinces: { provinces: [{ code: '12', nameEn: 'Phnom Penh', nameKm: 'ភ្នំពេញ' }, { code: '02', nameEn: 'Battambang', nameKm: 'បាត់ដំបង' }] },
  districts: { districts: [{ code: '1201', nameEn: 'Chamkar Mon', nameKm: 'ចំការមន' }] },
  communes: { communes: [{ code: '120101', nameEn: 'Tonle Bassac', nameKm: 'ទន្លេបាសាក់' }] },
};

/** An order as POST /v1/orders and GET /v1/orders/:number return it. */
export function order(over: Record<string, unknown> = {}) {
  return {
    number: 'SC-260001',
    status: 'pending_payment',
    paymentStatus: 'unpaid',
    paymentMethod: 'aba_khqr',
    fulfillment: 'delivery',
    shippingMethodId: 'pp_rider',
    pickupBranch: null,
    items: [{ id: 'i1', productSlug: 'product-1', name: 'Product 1', brand: 'Nike', size: 'EU 41', color: 'Black', imageUrl: null, qty: 1, unitPriceCents: 9500, compareAtCents: null, printFeeCents: 0, discountCents: 0, lineTotalCents: 9500, customPrint: null, returnableQty: 0 }],
    pricing: { merchandiseCents: 9500, discountCents: 0, shippingCents: 250, totalCents: 9750, totalKhr: 399750, discounts: [], promoCode: null },
    note: null,
    reservedUntil: new Date(Date.now() + 20 * 60_000).toISOString(),
    paidAt: null,
    deliveredAt: null,
    returnWindow: null,
    createdAt: '2026-11-26T08:00:00Z',
    timeline: [{ at: '2026-11-26T08:00:00Z', from: null, to: 'pending_payment' }],
    contact: { name: 'Dara Sok', phoneE164: '+85512345678', email: null, channel: 'phone' },
    shipAddress: {
      recipientName: 'Dara Sok',
      phoneE164: '+85512345678',
      provinceCode: '12',
      provinceName: { en: 'Phnom Penh', km: 'ភ្នំពេញ' },
      districtCode: '1201',
      districtName: { en: 'Chamkar Mon' },
      communeCode: '120101',
      communeName: { en: 'Tonle Bassac' },
      street: 'St 51',
      landmark: null,
      lat: null,
      lng: null,
    },
    ...over,
  };
}
