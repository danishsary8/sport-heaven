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

export const EMPTY_CART = {
  cart: { id: 'c1', lines: [], subtotalCents: 0, discountCents: 0, totalCents: 0, promo: null, problems: [] },
};
