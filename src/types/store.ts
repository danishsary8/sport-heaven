export type ProductCategory =
  | 'boots'
  | 'jerseys'
  | 'f1'
  | 'balls'
  | 'essentials';

export type SurfaceType = 'FG' | 'AG' | 'TF' | 'IC' | 'MG' | 'FG/AG';

export type BranchId = 'sonthormuk' | 'sensok' | 'chomkadong';

export type StockLevel = 'In Stock' | 'Limited Stock' | 'Out of Stock';

export type JerseyPatchId =
  | 'none'
  | 'ucl'
  | 'cpl'
  | 'aff'
  | 'champions'
  | 'f1-paddock';

export type LeagueId =
  | 'La Liga'
  | 'Premier League'
  | 'Serie A'
  | 'Bundesliga'
  | 'Ligue 1'
  | 'Cambodian Premier League'
  | 'International'
  | 'Formula 1';

export type NationalRegion = 'Europe' | 'South America' | 'Asia / ASEAN';

export type F1GarmentType = 'jersey' | 'jacket';

export type KitEditionType = 'Home' | 'Away' | 'Third' | 'Goalkeeper' | 'Special';

export type TeamType = 'club' | 'national';
export type KitVersion = 'Fan' | 'Player';
export type KitFit = 'Men' | 'Women' | 'Kids';
export type SleeveLength = 'Short' | 'Long';

/** Variant picked on the product page (version / fit / sleeve). */
export interface KitVariant {
  version: KitVersion;
  fit: KitFit;
  sleeve: SleeveLength;
}

/**
 * Image set for one product. `front` is always present; `back`, `gallery`
 * and `details` are filled in by `npm run images` when real photos exist.
 */
export interface ProductMediaSet {
  front: string;
  /** True when `front` is a real photo added with `npm run images` (not the placeholder). */
  isPhoto?: boolean;
  back?: string;
  gallery?: string[];
  details?: string[];
}

export type JerseyFontStyle = 'pro-condensed' | 'classic-block' | 'motorsport-aero';

export interface CustomPrintConfig {
  enabled: boolean;
  playerName: string;
  squadNumber: string;
  patch: JerseyPatchId;
  fontStyle?: JerseyFontStyle;
}

export interface JerseyVisualTheme {
  primary: string;
  secondary: string;
  trim: string;
  text: string;
  pattern: 'solid' | 'stripes' | 'sash' | 'angkor' | 'racing';
  crestLabel: string;
}

export interface ProductSpecs {
  surface?: string;
  upperMaterial?: string;
  weight?: string;
  studConfig?: string;
  fitProfile: string;
  careGuide: string;
  origin?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  brand: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  colorway: string;
  surface?: SurfaceType;
  weightGrams?: number;
  league?: LeagueId;
  club?: string;
  nationalRegion?: NationalRegion;
  season?: string;
  kitType?: KitEditionType;
  /** Club or national team (jerseys only). Derived from `league`. */
  teamType?: TeamType;
  /** Versions sold for this kit. The listed `price` is the Fan price. */
  versions?: KitVersion[];
  fits?: KitFit[];
  sleeves?: SleeveLength[];
  garmentType?: F1GarmentType;
  isChampionsLeague?: boolean;
  isRetro?: boolean;
  isLimitedEdition?: boolean;
  isBestSeller?: boolean;
  isSignatureEdition?: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isHeroSpotlight?: boolean;
  heroTagline?: string;
  customizable?: boolean;
  sizes: string[];
  image: string;
  /** Front/back/gallery images. Always set after catalog enrichment. */
  media?: ProductMediaSet;
  imageCropClass?: string;
  imageFilterStyle?: string;
  galleryCaption?: string[];
  summary: string;
  techHighlights: string[];
  specs: ProductSpecs;
  branchStock: Record<BranchId, StockLevel>;
  rating: number;
  reviewCount: number;
  swatchHex?: string;
  jerseyTheme?: JerseyVisualTheme;
}

export interface LookbookBundle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  tag: string;
  pitchContext: string;
  heroImage: string;
  discountPercent: number;
  productIds: string[];
  editorialNote: string;
}

export interface MemberProfile {
  fullName: string;
  email: string;
  phone: string;
  telegram: string;
  preferredBootSize: string;
  preferredJerseySize: string;
  homeBranch: BranchId;
  savedKhan: string;
  savedAddress: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  type: 'shipping' | 'billing';
  fullName: string;
  phone: string;
  khan: string;
  sangkat: string;
  streetAddress: string;
  coordinates?: { lat: number; lng: number };
  isDefault: boolean;
}

export interface SavedPaymentMethod {
  id: string;
  type: 'card' | 'aba-khqr' | 'wing';
  brand: string;
  last4: string;
  expiry?: string;
  holderName: string;
  vaultToken: string;
  isDefault: boolean;
}

export interface RmaRequest {
  rmaId: string;
  orderId: string;
  createdAt: string;
  items: Array<{
    lineId: string;
    name: string;
    size: string;
    quantity: number;
    refundAmount: number;
  }>;
  reason: string;
  resolution: 'refund' | 'size-exchange' | 'store-credit';
  totalRefund: number;
  labelCode: string;
  status: 'Label Generated' | 'Drop-Off Pending' | 'Completed';
}

export interface CookieConsent {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  decided: boolean;
  updatedAt?: string;
}

export interface ProductQuestion {
  id: string;
  productId: string;
  author: string;
  question: string;
  answer?: string;
  date: string;
}

export type GridDensity = 2 | 3 | 4;

export interface CartItem {
  lineId: string;
  productId: string;
  slug: string;
  name: string;
  brand: string;
  category: ProductCategory;
  colorway: string;
  image: string;
  imageCropClass?: string;
  imageFilterStyle?: string;
  size: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  customPrint?: CustomPrintConfig;
  variant?: KitVariant;
  giftCardMeta?: {
    format: 'digital' | 'physical';
    recipientEmail: string;
    recipientName: string;
    message: string;
    deliveryDate: string;
  };
}

export type FulfillmentMethod = 'delivery' | 'pickup';

export type PaymentMethod =
  | 'aba-khqr'
  | 'wing-acleda'
  | 'apple-pay'
  | 'google-pay'
  | 'paypal'
  | 'card'
  | 'cod';

export interface CustomerDetails {
  fullName: string;
  email?: string;
  phone: string;
  telegram: string;
  khan: string;
  sangkat: string;
  streetAddress: string;
  coordinates?: { lat: number; lng: number };
  notes: string;
  isGuest?: boolean;
}

export interface Order {
  id: string;
  createdAt: string;
  status: 'Confirmed' | 'Heat-Press Printing' | 'Rider Dispatched' | 'Delivered';
  fulfillmentMethod: FulfillmentMethod;
  pickupBranch?: BranchId;
  customer: CustomerDetails;
  paymentMethod: PaymentMethod;
  items: CartItem[];
  subtotal: number;
  teamDiscount: number;
  promoDiscount: number;
  promoCode?: string;
  giftNote?: string;
  shippingFee: number;
  totalUsd: number;
  totalKhr: number;
}

export interface ProductFilters {
  category: ProductCategory | 'all';
  surfaces: SurfaceType[];
  brands: string[];
  maxPrice: number;
  branch: BranchId | 'all';
  customizableOnly: boolean;
  league: LeagueId | 'all';
  nationalRegion?: NationalRegion | 'all';
  season?: string;
  uclOnly: boolean;
  retroOnly?: boolean;
  limitedEditionOnly?: boolean;
  bestSellersOnly?: boolean;
  newArrivalsOnly?: boolean;
  f1GarmentType?: F1GarmentType | 'all';
  f1Team?: string;
  ballSubcategory?: 'all' | 'fifa-pro' | 'league' | 'futsal';
  essentialsSubcategory?: 'all' | 'gloves' | 'socks' | 'protection';
  signatureBootOnly?: boolean;
  searchQuery: string;
  minRating?: number;
  sizeFilter?: string;
  inStockOnly?: boolean;
  saleOnly?: boolean;
}

export type SortOption =
  | 'featured'
  | 'best-sellers'
  | 'price-asc'
  | 'price-desc'
  | 'newest'
  | 'rating-desc'
  | 'weight-asc';

export interface BranchInfo {
  id: BranchId;
  name: string;
  shortName: string;
  address: string;
  district: string;
  hours: string;
  phone: string;
  telegram: string;
  heatPressWait: string;
  highlight: string;
  landmarks: string;
  coordinates?: string;
}

export interface ReviewItem {
  id: string;
  author: string;
  role: string;
  pitchLocation: string;
  productId?: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

export interface CollectionMeta {
  slug: string;
  title: string;
  eyebrow: string;
  seoDescription: string;
  editorialIntro: string;
  preset: Partial<ProductFilters>;
}

export interface BrandProfile {
  slug: string;
  name: string;
  display: string;
  origin: string;
  founded: string;
  tagline: string;
  story: string;
  signatureTech: string[];
  accentHex: string;
  heroImage: string;
  brandFilter?: string;
  categoryFilter?: ProductCategory;
}

export interface BlogArticle {
  slug: string;
  title: string;
  category: 'Buying Guide' | 'Kit Culture' | 'Boot Care' | 'Matchday Lookbook';
  author: string;
  authorRole: string;
  publishedAt: string;
  readMinutes: number;
  excerpt: string;
  heroImage: string;
  sections: Array<{
    id: string;
    heading: string;
    body: string[];
    callout?: string;
  }>;
  featuredProductIds: string[];
}

export interface CampaignLanding {
  slug: string;
  badge: string;
  title: string;
  italicAccent: string;
  subtitle: string;
  promoCode: string;
  discountLabel: string;
  endsLabel: string;
  heroImage: string;
  editorialNote: string;
  featuredProductIds: string[];
}

export interface FaqItem {
  id: string;
  category: 'Orders & Delivery' | 'Payments & KHQR' | 'Sizing & Surfaces' | 'Custom Print & Care' | 'Returns & Warranty';
  question: string;
  answer: string;
}

export type PolicySlug =
  | 'privacy-policy'
  | 'terms-of-service'
  | 'shipping-policy'
  | 'refund-policy'
  | 'cookie-policy';

export interface PolicyDocument {
  slug: PolicySlug;
  title: string;
  updatedAt: string;
  summary: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
  }>;
}

export type AccountSection =
  | 'overview'
  | 'orders'
  | 'addresses'
  | 'payments'
  | 'wishlist';

/**
 * Full 35-Page Enterprise E-Commerce Route Map
 * Supports canonical storefront, product, account, support, editorial, legal, and utility URLs.
 */
export type AdminTab =
  | 'overview'
  | 'orders'
  | 'inventory'
  | 'latency'
  | 'webhooks'
  | 'notifications';

export type PageRoute =
  // 1. Storefront & Discovery (5)
  | { page: 'home' }
  | {
      page: 'shop';
      initialCategory?: ProductCategory | 'all';
      collectionSlug?: string;
      sort?: SortOption;
      /** Raw filter query string from the URL (without `sort`), e.g. `league=la-liga&kit=home`. */
      params?: string;
    }
  | { page: 'brand'; slug: string }
  | { page: 'search'; query: string }
  // 2. Product & Conversion (5)
  | { page: 'product'; slug: string }
  | { page: 'gift-card' }
  | { page: 'cart' }
  | { page: 'checkout' }
  | { page: 'thank-you'; orderId?: string }
  // 3. Customer Account & Self-Service (7)
  | { page: 'login' }
  | { page: 'register' }
  | { page: 'recover' }
  | { page: 'account'; section?: AccountSection; orderId?: string }
  // 4. Post-Purchase & Support (5)
  | { page: 'orders'; orderId?: string; email?: string } // /pages/track-order
  | { page: 'returns' } // /pages/returns
  | { page: 'faq' } // /pages/faq
  | { page: 'contact' } // /pages/contact
  | { page: 'branches' } // /pages/stores
  // 5. Brand & Content Marketing (4 + Lookbooks/Studios)
  | { page: 'about' } // /pages/about
  | { page: 'blog' } // /blogs/news
  | { page: 'blog-post'; slug: string } // /blogs/news/[slug]
  | { page: 'campaign'; slug: string } // /pages/[campaign-slug]
  | { page: 'lookbooks' }
  | { page: 'custom-studio'; productSlug?: string }
  | { page: 'boot-finder' }
  // 6. Legal & Compliance (5)
  | { page: 'policy'; slug: PolicySlug }
  // 7. System, Utility, Operations & SEO (5)
  | { page: 'not-found'; attemptedPath?: string }
  | { page: 'maintenance' }
  | { page: 'sitemap' }
  | { page: 'system-health' }
  | { page: 'admin'; tab?: AdminTab };
