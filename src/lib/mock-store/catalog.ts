import {
  BOOT_SIZES,
  BRANCHES,
  CATEGORY_LABELS,
  GLOVE_SIZES,
  JERSEY_SIZES,
  PRODUCTS,
  STUDIO_IMAGES,
} from '../../data/catalog.ts';
import type {
  BranchId,
  BranchInfo,
  KitEditionType,
  LeagueId,
  Product,
  ProductCategory,
  StockLevel,
} from '../../types/store';

export interface CategoryDefinition {
  id: ProductCategory;
  slug: string;
  name: string;
  shortName: string;
  division: string;
  description: string;
  subcategories: string[];
  productCount: number;
}

export interface SizeStockEntry {
  size: string;
  totalQty: number;
  status: 'In Stock' | 'Low Stock' | 'Sold Out';
  byBranch: Record<BranchId, number>;
}

export interface ProductVariant {
  variantId: string;
  sku: string;
  colorName: string;
  swatchHex: string;
  editionLabel: string;
  price: number;
  compareAtPrice?: number;
  sizes: SizeStockEntry[];
  totalStock: number;
  inStock: boolean;
}

export interface ProductDetailRow {
  label: string;
  value: string;
  group: 'classification' | 'technical' | 'fulfillment';
  mono?: boolean;
}

export interface CatalogProduct extends Product {
  sku: string;
  division: string;
  subcategory: string;
  tags: string[];
  variants: ProductVariant[];
  detailsTable: ProductDetailRow[];
  totalUnitsAvailable: number;
}

export interface ProductRecommendation {
  product: CatalogProduct;
  score: number;
  sameCategory: boolean;
  matchedTags: string[];
}

export const CATEGORY_METADATA: Record<
  ProductCategory,
  Omit<CategoryDefinition, 'productCount'>
> = {
  jerseys: {
    id: 'jerseys',
    slug: 'jerseys-kits',
    name: 'Football Jerseys & Kits',
    shortName: 'Jerseys & Kits',
    division: 'Matchwear & Authentic Kits',
    description:
      'Official 2026/27 UEFA Champions League, Top 5 European Leagues, National Teams (Europe, South America, Asia / ASEAN), Retro Archive, and Limited Edition jerseys in EU 46–58 sizing.',
    subcategories: [
      'National Teams (Europe · South America · Asia / ASEAN)',
      'UEFA Champions League',
      'La Liga · Premier League · Serie A · Bundesliga · Ligue 1',
      'Retro Archive Kits',
      'Limited Edition Releases',
      'Cambodia National & CPL',
    ],
  },
  boots: {
    id: 'boots',
    slug: 'football-boots',
    name: 'Football Boots & Soccer Cleats',
    shortName: 'Soccer Boots',
    division: 'Performance Footwear',
    description:
      'Authentic studded football boots from Nike, Adidas (including Messi F50 Signature), Puma, Mizuno Japan, and New Balance — indexed by pitch surface and weight.',
    subcategories: [
      'Firm Ground (FG)',
      'Artificial Grass (AG)',
      'Studded Turf (TF)',
      'Multi-Ground (MG)',
      'Messi & Signature Editions',
    ],
  },
  f1: {
    id: 'f1',
    slug: 'f1-motorsport',
    name: 'F1 Motorsport Teamwear',
    shortName: 'F1 Teamwear',
    division: 'Paddock Apparel',
    description:
      'Official 2026 Formula 1 dual-colorway team jerseys and weather-sealed paddock jackets from Scuderia Ferrari, Oracle Red Bull Racing, Mercedes-AMG Petronas, and McLaren F1 Team.',
    subcategories: [
      'Team Jerseys (2+ Colorways per Team)',
      'Official Paddock Jackets',
      'Scuderia Ferrari',
      'Oracle Red Bull Racing',
      'Mercedes-AMG Petronas',
      'McLaren F1 Team',
    ],
  },
  balls: {
    id: 'balls',
    slug: 'match-balls',
    name: 'Match & Futsal Balls',
    shortName: 'Match Balls',
    division: 'Match Hardware',
    description:
      'FIFA Quality Pro thermally bonded official UEFA Champions League, La Liga, Premier League, and AFC match balls plus calibrated low-bounce futsal balls.',
    subcategories: [
      'FIFA Quality Pro (Size 5)',
      'UCL & League Official Balls',
      'Low-Bounce Futsal (Size 4)',
    ],
  },
  essentials: {
    id: 'essentials',
    slug: 'gk-essentials',
    name: 'Goalkeeper & Pitch Essentials',
    shortName: 'GK & Essentials',
    division: 'Matchday Hardware',
    description:
      '4mm German contact latex goalkeeper gloves, TruSox 3.0 anti-slip grip socks, and featherweight carbon shin guards.',
    subcategories: ['Goalkeeper Gloves', 'Grip Socks', 'Carbon Shin Guards'],
  },
};

export const ORDERED_CATEGORY_IDS: ProductCategory[] = [
  'jerseys',
  'boots',
  'f1',
  'balls',
  'essentials',
];

function deterministicHash(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function buildSku(product: Product): string {
  const catCode: Record<ProductCategory, string> = {
    jerseys: 'KIT',
    boots: 'BOT',
    f1: 'F1P',
    balls: 'BAL',
    essentials: 'ESS',
  };
  const brandCode = product.brand.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
  const slugTokens = product.slug
    .split('-')
    .filter((t) => t.length > 1)
    .slice(0, 3)
    .map((t) => t.slice(0, 3).toUpperCase())
    .join('');
  const suffix = String(deterministicHash(product.id) % 900 + 100);
  return `SC-${catCode[product.category]}-${brandCode}-${slugTokens.slice(0, 6)}-${suffix}`;
}

function inferSubcategory(product: Product): string {
  if (product.category === 'jerseys') {
    if (product.isRetro || product.kitType === 'Retro') {
      return `Retro Archive${product.nationalRegion ? ` · ${product.nationalRegion}` : ''}`;
    }
    if (product.nationalRegion) {
      return `National Teams · ${product.nationalRegion}`;
    }
    if (product.isChampionsLeague && product.league) {
      return `${product.league} · UEFA Champions League`;
    }
    return product.league ?? 'Club & National Kits';
  }
  if (product.category === 'boots') {
    if (product.isSignatureEdition) {
      return `Signature Edition · ${product.surface ?? 'FG'}`;
    }
    const surfaceMap: Record<string, string> = {
      FG: 'Firm Natural Grass (FG)',
      AG: 'Artificial Grass (AG)',
      TF: 'Artificial Turf (TF)',
      IC: 'Indoor Futsal Court (IC)',
      MG: 'Multi-Ground (MG)',
      'FG/AG': 'Firm & Artificial Grass (FG/AG)',
    };
    return product.surface ? (surfaceMap[product.surface] ?? product.surface) : 'Performance Footwear';
  }
  if (product.category === 'f1') {
    const garmentLabel = product.garmentType === 'jacket' ? 'Paddock Jacket' : 'Team Jersey';
    return product.club ? `${product.club} · ${garmentLabel}` : `2026 F1 ${garmentLabel}`;
  }
  if (product.category === 'balls') {
    if (product.name.toLowerCase().includes('futsal')) {
      return 'Low-Bounce Futsal (Size 4)';
    }
    if (product.isChampionsLeague) {
      return 'UEFA Champions League Official Match Ball (Size 5)';
    }
    return 'FIFA Quality Pro Match Ball (Size 5)';
  }
  if (product.name.toLowerCase().includes('glove')) return 'Goalkeeper Gloves';
  if (product.name.toLowerCase().includes('sock')) return 'Anti-Slip Grip Socks';
  return 'Protective Match Essentials';
}

function branchBaseQty(level: StockLevel, seed: number): number {
  if (level === 'Out of Stock') return 0;
  if (level === 'Limited Stock') return (seed % 2) + 1; // 1-2 units
  return (seed % 5) + 3; // 3-7 units
}

function buildSizeInventory(product: Product, variantSalt: string): SizeStockEntry[] {
  const isKit = product.category === 'jerseys' || product.category === 'f1';
  const kitUnavailable =
    isKit && (product.kitType === 'Away' || product.kitType === 'Third')
      ? 'XXL'
      : isKit && product.kitType === 'Special Edition'
        ? 'S'
        : null;

  return product.sizes.map((size, idx) => {
    const seed = deterministicHash(`${product.id}:${variantSalt}:${size}:${idx}`);
    if (kitUnavailable === size) {
      return {
        size,
        totalQty: 0,
        status: 'Sold Out',
        byBranch: { sonthormuk: 0, sensok: 0, chomkadong: 0 },
      };
    }

    // Occasional realistic edge-size sellout on niche sizes for boots
    const isRareBootSellout =
      product.category === 'boots' &&
      (size === 'EU 45' || size === 'EU 39') &&
      seed % 5 === 0;

    if (isRareBootSellout) {
      return {
        size,
        totalQty: 0,
        status: 'Sold Out',
        byBranch: { sonthormuk: 0, sensok: 0, chomkadong: 0 },
      };
    }

    const sonthormuk = branchBaseQty(product.branchStock.sonthormuk, seed);
    const sensok = branchBaseQty(product.branchStock.sensok, seed >> 2);
    const chomkadong = branchBaseQty(product.branchStock.chomkadong, seed >> 4);
    const totalQty = sonthormuk + sensok + chomkadong;

    const status: SizeStockEntry['status'] =
      totalQty === 0 ? 'Sold Out' : totalQty <= 4 ? 'Low Stock' : 'In Stock';

    return {
      size,
      totalQty,
      status,
      byBranch: { sonthormuk, sensok, chomkadong },
    };
  });
}

function inferSwatchHex(product: Product): string {
  if (product.swatchHex) return product.swatchHex;
  if (product.jerseyTheme?.primary) return product.jerseyTheme.primary;
  const c = product.colorway.toLowerCase();
  if (c.includes('volt') || c.includes('yellow')) return '#D4E137';
  if (c.includes('crimson') || c.includes('red') || c.includes('scarlet')) return '#C8232C';
  if (c.includes('blue') || c.includes('cobalt') || c.includes('navy')) return '#173A8A';
  if (c.includes('green') || c.includes('emerald')) return '#1B5E3A';
  if (c.includes('white') || c.includes('ivory') || c.includes('cloud')) return '#ECEAE4';
  if (c.includes('pink')) return '#D94B8B';
  if (c.includes('purple')) return '#4B2879';
  return '#18222D';
}

function buildVariants(product: Product, sku: string): ProductVariant[] {
  const primarySizes = buildSizeInventory(product, 'primary');
  const primaryTotal = primarySizes.reduce((sum, s) => sum + s.totalQty, 0);

  const primaryVariant: ProductVariant = {
    variantId: `${product.id}-var-1`,
    sku,
    colorName: product.colorway,
    swatchHex: inferSwatchHex(product),
    editionLabel:
      product.kitType ??
      (product.surface ? `${product.surface} Soleplate` : 'Standard Edition'),
    price: product.price,
    compareAtPrice: product.originalPrice,
    sizes: primarySizes,
    totalStock: primaryTotal,
    inStock: primaryTotal > 0,
  };

  // Add realistic secondary variant metadata for boots/jerseys (e.g., Player Issue vs Stadium or alternate pack colorway)
  if (product.category === 'jerseys' && product.customizable) {
    const customSizes = buildSizeInventory(product, 'pro-press');
    const customTotal = customSizes.reduce((sum, s) => sum + s.totalQty, 0);
    return [
      primaryVariant,
      {
        variantId: `${product.id}-var-custom`,
        sku: `${sku}-PRS`,
        colorName: `${product.colorway} (Custom Heat-Press)`,
        swatchHex: product.jerseyTheme?.trim ?? inferSwatchHex(product),
        editionLabel: `${product.kitType ?? 'Match'} + Pro Print`,
        price: product.price + 8,
        compareAtPrice: product.originalPrice ? product.originalPrice + 8 : undefined,
        sizes: customSizes,
        totalStock: customTotal,
        inStock: customTotal > 0,
      },
    ];
  }

  return [primaryVariant];
}

export function buildStructuredDetailsTable(
  product: Product,
  sku: string,
  subcategory: string,
  totalUnits: number,
): ProductDetailRow[] {
  const catDef = CATEGORY_METADATA[product.category];
  const rows: ProductDetailRow[] = [
    { label: 'SKU Code', value: sku, group: 'classification', mono: true },
    { label: 'Category', value: catDef.name, group: 'classification' },
    { label: 'Division', value: catDef.division, group: 'classification' },
    { label: 'Subcategory', value: subcategory, group: 'classification' },
    { label: 'Brand / Manufacturer', value: product.brand, group: 'classification' },
  ];

  if (product.category === 'jerseys' || product.category === 'f1') {
    if (product.club) {
      rows.push({
        label: product.category === 'f1' ? 'Constructor / Team' : 'Club / National Team',
        value: product.club,
        group: 'classification',
      });
    }
    if (product.league) {
      rows.push({
        label: 'Competition / League',
        value: product.isChampionsLeague
          ? `${product.league} · UEFA Champions League`
          : product.league,
        group: 'classification',
      });
    }
    if (product.nationalRegion) {
      rows.push({
        label: 'National Team Region',
        value: product.nationalRegion,
        group: 'classification',
      });
    }
    if (product.garmentType) {
      rows.push({
        label: 'Garment Type',
        value: product.garmentType === 'jacket' ? 'Official Paddock Team Jacket' : 'Official Team Jersey',
        group: 'classification',
      });
    }
    if (product.season || product.kitType) {
      rows.push({
        label: 'Season & Kit Edition',
        value: [product.season, product.kitType ? `${product.kitType} Kit` : '']
          .filter(Boolean)
          .join(' · '),
        group: 'technical',
        mono: true,
      });
    }
    rows.push({
      label: 'Colorway',
      value: product.colorway,
      group: 'technical',
    });
    if (product.specs.upperMaterial) {
      rows.push({
        label: 'Fabric Technology',
        value: product.specs.upperMaterial,
        group: 'technical',
      });
    }
    rows.push({
      label: 'Fit & Cut Profile',
      value: product.specs.fitProfile,
      group: 'technical',
    });
    rows.push({
      label: 'Size Range (EU Equivalent)',
      value: 'S (EU 46) / M (EU 48–50) / L (EU 52–54) / XL (EU 56) / XXL (EU 58)',
      group: 'technical',
      mono: true,
    });
    rows.push({
      label: 'Custom Heat-Press',
      value: product.customizable
        ? 'Eligible (+$8 Name & Number · Optional Official Sleeve Patch · 15-min Phnom Penh Press)'
        : 'Standard Retail Finish',
      group: 'fulfillment',
    });
  } else if (product.category === 'boots') {
    rows.push({
      label: 'Colorway',
      value: product.colorway,
      group: 'technical',
    });
    if (product.specs.surface) {
      rows.push({
        label: 'Playing Surface',
        value: product.specs.surface,
        group: 'technical',
      });
    }
    if (product.specs.weight) {
      rows.push({
        label: 'Measured Weight',
        value: product.specs.weight,
        group: 'technical',
        mono: true,
      });
    }
    if (product.specs.upperMaterial) {
      rows.push({
        label: 'Upper Construction',
        value: product.specs.upperMaterial,
        group: 'technical',
      });
    }
    if (product.specs.studConfig) {
      rows.push({
        label: 'Soleplate & Stud Geometry',
        value: product.specs.studConfig,
        group: 'technical',
      });
    }
    rows.push({
      label: 'Fit & Last Profile',
      value: product.specs.fitProfile,
      group: 'technical',
    });
    rows.push({
      label: 'Size Run',
      value: `${product.sizes[0]} – ${product.sizes[product.sizes.length - 1]} (${product.sizes.length} sizes)`,
      group: 'technical',
      mono: true,
    });
  } else {
    rows.push({
      label: 'Colorway',
      value: product.colorway,
      group: 'technical',
    });
    if (product.specs.upperMaterial) {
      rows.push({
        label: 'Construction & Materials',
        value: product.specs.upperMaterial,
        group: 'technical',
      });
    }
    if (product.specs.surface) {
      rows.push({
        label: 'Recommended Surface',
        value: product.specs.surface,
        group: 'technical',
      });
    }
    rows.push({
      label: 'Fit / Sizing',
      value: `${product.specs.fitProfile} (${product.sizes.join(', ')})`,
      group: 'technical',
    });
  }

  rows.push({
    label: 'Live Phnom Penh Inventory',
    value: `${totalUnits} units ready across Sonthormuk, Sen Sok & Chomkadong`,
    group: 'fulfillment',
    mono: true,
  });
  rows.push({
    label: 'Care Instructions',
    value: product.specs.careGuide,
    group: 'fulfillment',
  });
  if (product.specs.origin) {
    rows.push({
      label: 'Authenticity & Origin',
      value: product.specs.origin,
      group: 'fulfillment',
    });
  }

  return rows;
}

function slugifyTag(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildProductTags(product: Product): string[] {
  const tagSet = new Set<string>();

  const add = (value?: string) => {
    if (!value) return;
    const slug = slugifyTag(value);
    if (slug) tagSet.add(slug);
  };

  add(product.category);
  add(product.brand);

  if (product.league) add(product.league);
  if (product.club) add(product.club);
  if (product.nationalRegion) add(product.nationalRegion);
  if (product.season) add(product.season);
  if (product.surface) add(product.surface);
  if (product.kitType) add(`${product.kitType}-kit`);
  if (product.garmentType) add(`f1-${product.garmentType}`);
  if (product.isChampionsLeague) {
    add('ucl');
    add('champions-league');
  }
  if (product.isRetro) add('retro');
  if (product.isLimitedEdition) add('limited-edition');
  if (product.isBestSeller) add('best-seller');
  if (product.isSignatureEdition) add('signature-edition');
  if (product.customizable) add('custom-print');
  if (product.isNewArrival) add('new-arrival');
  if (product.isFeatured) add('featured');
  if (product.originalPrice && product.originalPrice > product.price) {
    add('on-sale');
  }

  const combinedText = [
    product.name,
    product.summary,
    product.specs.upperMaterial ?? '',
    product.specs.surface ?? '',
    ...product.techHighlights,
  ]
    .join(' ')
    .toLowerCase();

  if (product.category === 'boots') {
    if (product.surface === 'IC' || combinedText.includes('futsal')) {
      add('futsal');
      add('indoor');
    }
    if (product.surface === 'TF' || combinedText.includes('turf')) {
      add('turf');
    }
    if (product.surface === 'AG' || product.surface === 'FG/AG') {
      add('artificial-grass');
    }
    if (product.surface === 'FG' || product.surface === 'FG/AG') {
      add('firm-ground');
    }
    if ((product.weightGrams ?? 999) <= 195) {
      add('lightweight-speed');
    }
    if (combinedText.includes('leather') || combinedText.includes('k-leather')) {
      add('heritage-leather');
    }
    if (combinedText.includes('laceless')) {
      add('laceless');
    }
    if (combinedText.includes('japan')) {
      add('made-in-japan');
    }
  }

  if (product.category === 'jerseys') {
    add('matchday-kit');
    if (product.league && ['La Liga', 'Premier League', 'Serie A', 'Bundesliga', 'Ligue 1'].includes(product.league)) {
      add('top-5-leagues');
    }
    if (product.league === 'Cambodian Premier League' || combinedText.includes('cambodia')) {
      add('cambodia-football');
    }
  }

  if (product.category === 'f1') {
    add('motorsport');
    add('paddock');
    add('teamwear');
  }

  if (product.category === 'balls') {
    add('match-hardware');
    if (combinedText.includes('futsal')) {
      add('futsal');
      add('indoor');
    }
    if (combinedText.includes('fifa quality pro')) {
      add('fifa-quality-pro');
    }
  }

  if (product.category === 'essentials') {
    add('match-hardware');
    if (combinedText.includes('glove') || combinedText.includes('goalkeeper')) {
      add('goalkeeper');
    }
    if (combinedText.includes('grip') || combinedText.includes('sock')) {
      add('grip-socks');
      add('futsal');
    }
    if (combinedText.includes('shin') || combinedText.includes('carbon')) {
      add('protection');
    }
  }

  return Array.from(tagSet);
}

const TAG_DISPLAY_OVERRIDES: Record<string, string> = {
  ucl: 'UCL',
  'champions-league': 'Champions League',
  fg: 'FG',
  ag: 'AG',
  tf: 'TF',
  ic: 'IC',
  mg: 'MG',
  'fg-ag': 'FG/AG',
  f1: 'Formula 1',
  'top-5-leagues': 'Top 5 Leagues',
  'fifa-quality-pro': 'FIFA Quality Pro',
  'made-in-japan': 'Made in Japan',
  'lightweight-speed': 'Speed',
  'heritage-leather': 'Leather',
  'custom-print': 'Custom Print',
  'la-liga': 'La Liga',
  'premier-league': 'Premier League',
  'serie-a': 'Serie A',
  bundesliga: 'Bundesliga',
  'ligue-1': 'Ligue 1',
};

const TAG_ACRONYMS = new Set(['fc', 'ac', 'psg', 'ucl', 'cpl', 'gk', 'f1', 'fg', 'ag', 'tf', 'ic', 'mg', 'mij', 'ft']);

export function formatTagLabel(tag: string): string {
  if (TAG_DISPLAY_OVERRIDES[tag]) return TAG_DISPLAY_OVERRIDES[tag];
  return tag
    .split('-')
    .map((part) => {
      if (!part) return '';
      if (TAG_ACRONYMS.has(part)) return part.toUpperCase();
      return part[0].toUpperCase() + part.slice(1);
    })
    .join(' ');
}

/**
 * Enriched, structured store catalog containing all 51 Sport Castle products:
 * - 27 Football Jerseys & Kits (2026/27 UEFA Champions League, Top 5 Leagues, Cambodia Varaman & CPL)
 * - 14 Football Boots & Futsal Footwear (FG, AG, TF, IC, MG)
 * - 3 Formula 1 2026 Paddock Kits
 * - 4 FIFA Quality Pro Match & Futsal Balls
 * - 3 Goalkeeper Gloves & Pitch Essentials
 */
export const MOCK_STORE_CATALOG: CatalogProduct[] = PRODUCTS.map((product) => {
  const sku = buildSku(product);
  const subcategory = inferSubcategory(product);
  const tags = buildProductTags(product);
  const variants = buildVariants(product, sku);
  const totalUnitsAvailable = variants[0]?.totalStock ?? 0;
  const detailsTable = buildStructuredDetailsTable(
    product,
    sku,
    subcategory,
    totalUnitsAvailable,
  );

  return {
    ...product,
    sku,
    division: CATEGORY_METADATA[product.category].division,
    subcategory,
    tags,
    variants,
    detailsTable,
    totalUnitsAvailable,
  };
});

export const CATEGORY_DIRECTORY: CategoryDefinition[] = ORDERED_CATEGORY_IDS.map(
  (id) => ({
    ...CATEGORY_METADATA[id],
    productCount: MOCK_STORE_CATALOG.filter((p) => p.category === id).length,
  }),
);

export const CHAMPIONS_LEAGUE_JERSEYS: CatalogProduct[] = MOCK_STORE_CATALOG.filter(
  (p) => p.category === 'jerseys' && p.isChampionsLeague,
);

export const TOP_5_LEAGUE_JERSEYS: CatalogProduct[] = MOCK_STORE_CATALOG.filter(
  (p) =>
    p.category === 'jerseys' &&
    Boolean(
      p.league &&
        (['La Liga', 'Premier League', 'Serie A', 'Bundesliga', 'Ligue 1'] as LeagueId[]).includes(
          p.league,
        ),
    ),
);

export const FOOTBALL_BOOTS_CATALOG: CatalogProduct[] = MOCK_STORE_CATALOG.filter(
  (p) => p.category === 'boots',
);

export const STORE_BRANCHES: BranchInfo[] = BRANCHES.map((branch) => {
  const coordsByBranch: Record<BranchId, string> = {
    sonthormuk: '11.5688, 104.8994',
    sensok: '11.5974, 104.8781',
    chomkadong: '11.5032, 104.8797',
  };
  return {
    ...branch,
    coordinates: coordsByBranch[branch.id],
  };
});

export function getCatalogProductBySlug(slug: string): CatalogProduct | undefined {
  return MOCK_STORE_CATALOG.find((p) => p.slug === slug);
}

export function getCatalogProductById(id: string): CatalogProduct | undefined {
  return MOCK_STORE_CATALOG.find((p) => p.id === id);
}

export function getCatalogByCategory(
  category: ProductCategory | 'all',
): CatalogProduct[] {
  if (category === 'all') return MOCK_STORE_CATALOG;
  return MOCK_STORE_CATALOG.filter((p) => p.category === category);
}

export function getCatalogByEdition(edition: 'all' | KitEditionType): CatalogProduct[] {
  const kits = MOCK_STORE_CATALOG.filter(
    (p) => p.category === 'jerseys' || p.category === 'f1',
  );
  if (edition === 'all') return kits;
  return kits.filter((p) => p.kitType === edition);
}

const GENERIC_TAGS = new Set(['featured', 'new-arrival', 'on-sale', '2026-27']);

export function scoreProductRecommendation(
  current: CatalogProduct,
  candidate: CatalogProduct,
): ProductRecommendation {
  const sameCategory = candidate.category === current.category;
  const currentTagSet = new Set(current.tags);
  const matchedTags = candidate.tags.filter(
    (tag) => currentTagSet.has(tag) && tag !== current.category,
  );

  let score = 0;

  // Primary weight: matching product category
  if (sameCategory) {
    score += 40;
  }

  // Secondary weight: overlapping product tags (domain-specific tags weighted higher)
  for (const tag of matchedTags) {
    score += GENERIC_TAGS.has(tag) ? 4 : 12;
  }

  // High-signal domain affinities
  if (current.club && candidate.club && current.club === candidate.club) {
    score += 18;
  }
  if (current.league && candidate.league && current.league === candidate.league) {
    score += 14;
  }
  if (current.surface && candidate.surface && current.surface === candidate.surface) {
    score += 14;
  }
  if (current.isChampionsLeague && candidate.isChampionsLeague) {
    score += 8;
  }
  if (current.brand === candidate.brand) {
    score += 6;
  }

  // Price-band similarity bonus (within 35%)
  const priceDiffRatio =
    Math.abs(candidate.price - current.price) / Math.max(current.price, 1);
  if (priceDiffRatio <= 0.35) {
    score += 5;
  }

  return {
    product: candidate,
    score,
    sameCategory,
    matchedTags,
  };
}

/**
 * Dynamically ranks recommended products from catalog.ts based on the active
 * product's category and tags, excluding the current product itself.
 */
export function getRecommendedProducts(
  currentProduct: CatalogProduct | Product,
  catalog: CatalogProduct[] = MOCK_STORE_CATALOG,
  limit = 8,
): ProductRecommendation[] {
  const enrichedCurrent: CatalogProduct =
    'tags' in currentProduct && Array.isArray(currentProduct.tags)
      ? currentProduct
      : (catalog.find((p) => p.id === currentProduct.id) ?? {
          ...currentProduct,
          sku: buildSku(currentProduct),
          division: CATEGORY_METADATA[currentProduct.category].division,
          subcategory: inferSubcategory(currentProduct),
          tags: buildProductTags(currentProduct),
          variants: [],
          detailsTable: [],
          totalUnitsAvailable: 0,
        });

  const scored = catalog
    .filter((candidate) => candidate.id !== enrichedCurrent.id)
    .map((candidate) => scoreProductRecommendation(enrichedCurrent, candidate))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.matchedTags.length !== a.matchedTags.length) {
        return b.matchedTags.length - a.matchedTags.length;
      }
      if (b.product.rating !== a.product.rating) {
        return b.product.rating - a.product.rating;
      }
      if (b.product.reviewCount !== a.product.reviewCount) {
        return b.product.reviewCount - a.product.reviewCount;
      }
      return a.product.id.localeCompare(b.product.id);
    });

  return scored.slice(0, Math.max(0, limit));
}

export {
  BOOT_SIZES,
  CATEGORY_LABELS,
  GLOVE_SIZES,
  JERSEY_SIZES,
  STUDIO_IMAGES,
};
