import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  auth,
  formatFirebaseAuthError,
  onAuthStateChanged,
  registerWithEmailPassword,
  sendFirebasePasswordReset,
  signInWithEmailPassword,
  signInWithGooglePopup,
  signOutFirebase,
  type User as FirebaseUser,
} from '../lib/firebase';
import {
  createAddressApi,
  createOrderApi,
  createPaymentApi,
  createQuestionApi,
  createRmaApi,
  deleteAddressApi,
  deletePaymentApi,
  fetchAccountBootstrap,
  fetchLiveCatalogApi,
  fetchQuestionsApi,
  setDefaultPaymentApi,
  syncWishlistApi,
  updateAddressApi,
  updateProfileApi,
} from '../lib/apiClient';
import { SEEDED_SAMPLE_ORDER, STUDIO_IMAGES } from '../data/catalog';
import {
  CATEGORY_DIRECTORY,
  MOCK_STORE_CATALOG,
  STORE_BRANCHES,
  getCatalogProductById,
  getCatalogProductBySlug,
  type CatalogProduct,
  type CategoryDefinition,
} from '../lib/mock-store/catalog';
import { COLLECTION_BY_SLUG, INITIAL_PRODUCT_QUESTIONS } from '../data/editorial';
import type {
  BranchId,
  BranchInfo,
  CartItem,
  CookieConsent,
  CustomPrintConfig,
  KitVariant,
  F1GarmentType,
  GridDensity,
  LeagueId,
  MemberProfile,
  NationalRegion,
  Order,
  PageRoute,
  Product,
  ProductCategory,
  ProductQuestion,
  RmaRequest,
  SavedAddress,
  SavedPaymentMethod,
  SortOption,
  StockLevel,
  SurfaceType,
} from '../types/store';
import {
  generateRmaId,
  getCartItemUnitPrice,
  getCartLineId,
  updateRecentlyViewed,
} from '../utils/commerce';
import {
  parseHashToRoute,
  routeToHash,
} from '../utils/router';
import { getInitialMemberOrders } from '../utils/orderHistory';
import { getVariantPrice } from '../lib/product-attributes';
import {
  CATEGORY_COLLECTION_SLUG,
  countActiveFilters,
  parseShopParams,
  presetToShopQuery,
  serializeShopParams,
} from '../lib/shop-filters';
import { runWithViewTransition } from '../hooks/useViewTransition';
import {
  DEFAULT_WISHLIST_SEED,
  GUEST_WISHLIST_STORAGE_KEY,
  MEMBER_WISHLIST_STORAGE_KEY,
  getWishlistStorageKey,
  mergeGuestWishlistIntoMember,
  parseWishlistStoragePayload,
  sanitizeWishlistIds,
  serializeWishlistStoragePayload,
} from '../utils/wishlistStorage';
import {
  CATALOG_OVERRIDES_STORAGE_KEY,
  WISHLIST_ALERT_KEYS_STORAGE_KEY,
  WISHLIST_SNAPSHOTS_STORAGE_KEY,
  advanceSnapshotsAfterAlerts,
  applyCatalogOverrides,
  detectWishlistAlerts,
  parseSafeRecord,
  parseSafeStringArray,
  resolveWishlistCatalogUpdates,
  syncWishlistSnapshots,
  type CatalogProductOverride,
  type WishlistAlertEvent,
  type WishlistWatchSnapshot,
} from '../utils/wishlistAlerts';

const VALID_PRODUCT_IDS: ReadonlySet<string> = new Set(
  MOCK_STORE_CATALOG.map((p) => p.id),
);

const STORAGE_KEYS = {
  cart: 'sport_castle_cart_v2',
  wishlist: MEMBER_WISHLIST_STORAGE_KEY,
  guestWishlist: GUEST_WISHLIST_STORAGE_KEY,
  orders: 'sport_castle_orders_v3',
  promo: 'sport_castle_promo_v2',
  recentlyViewed: 'sport_castle_recent_v2',
  member: 'sport_castle_member_v2',
  auth: 'sport_castle_auth_v2',
  addresses: 'sport_castle_addresses_v2',
  payments: 'sport_castle_payments_v2',
  rmas: 'sport_castle_rmas_v2',
  cookie: 'sport_castle_cookie_v2',
  giftNote: 'sport_castle_giftnote_v2',
  questions: 'sport_castle_qa_v2',
};

const DEFAULT_MEMBER: MemberProfile = {
  fullName: 'Sokha Chan',
  email: 'sokha.chan@phnompenhfc.kh',
  phone: '+855 12 456 789',
  telegram: '@SokhaStriker',
  preferredBootSize: 'EU 42',
  preferredJerseySize: 'M',
  homeBranch: 'sonthormuk',
  savedKhan: 'Khan Toul Kork',
  savedAddress: 'No. 28, Street 289, Sangkat Boeung Kak 1',
};

const DEFAULT_ADDRESSES: SavedAddress[] = [
  {
    id: 'addr-1',
    label: 'Home — Toul Kork',
    type: 'shipping',
    fullName: 'Sokha Chan',
    phone: '+855 12 456 789',
    khan: 'Khan Toul Kork',
    sangkat: 'Sangkat Boeung Kak 1',
    streetAddress: 'No. 28, Street 289 (Near TK Avenue)',
    isDefault: true,
  },
  {
    id: 'addr-2',
    label: 'Office — BKK1',
    type: 'billing',
    fullName: 'Sokha Chan',
    phone: '+855 12 456 789',
    khan: 'Khan Boeung Keng Kang (BKK)',
    sangkat: 'Sangkat BKK1',
    streetAddress: 'Floor 4, Street 51, Corner Street 306',
    isDefault: false,
  },
];

const DEFAULT_PAYMENTS: SavedPaymentMethod[] = [
  {
    id: 'pay-1',
    type: 'aba-khqr',
    brand: 'ABA Pay / KHQR',
    last4: '8821',
    holderName: 'SOKHA CHAN',
    vaultToken: 'tok_khqr_aba_8821f9',
    isDefault: true,
  },
  {
    id: 'pay-2',
    type: 'card',
    brand: 'Visa',
    last4: '4242',
    expiry: '09/29',
    holderName: 'SOKHA CHAN',
    vaultToken: 'tok_pci_visa_4242a7',
    isDefault: false,
  },
];

const DEFAULT_COOKIE_CONSENT: CookieConsent = {
  essential: true,
  analytics: true,
  marketing: false,
  decided: false,
};

export type ToastVariant = 'default' | 'price-drop' | 'back-in-stock';

export interface ToastOptions {
  variant?: ToastVariant;
  title?: string;
  meta?: string;
  image?: string;
  durationMs?: number;
}

export interface ToastItem {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: ToastVariant;
  title?: string;
  meta?: string;
  image?: string;
  durationMs?: number;
}

export interface WishlistAlertsApi {
  isAlertEnabled: (productId: string) => boolean;
  toggleItemAlert: (productId: string) => void;
  activeAlertCount: number;
  recentEvents: WishlistAlertEvent[];
  getLatestEventForProduct: (productId: string) => WishlistAlertEvent | undefined;
  checkForUpdates: (options?: { silentIfNone?: boolean }) => number;
  applyCatalogUpdate: (
    productId: string,
    patch: {
      price?: number;
      originalPrice?: number;
      branchStock?: Record<BranchId, StockLevel>;
    },
  ) => void;
}

export interface WishlistStore {
  items: string[];
  count: number;
  storageKey: string;
  isGuestSession: boolean;
  lastSyncedAt: string | null;
  toggle: (productId: string) => void;
  add: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  has: (productId: string) => boolean;
}

interface StoreContextValue {
  // Structured Store Catalog (hydrated live from GET /api/catalog with static fallback)
  catalog: CatalogProduct[];
  isCatalogSyncedFromServer: boolean;
  refreshLiveCatalog: () => Promise<void>;
  categories: CategoryDefinition[];
  jerseysCatalog: CatalogProduct[];
  championsLeagueJerseys: CatalogProduct[];
  top5LeagueJerseys: CatalogProduct[];
  bootsCatalog: CatalogProduct[];
  branches: BranchInfo[];
  getProductBySlug: (slug: string) => CatalogProduct | undefined;
  getProductById: (id: string) => CatalogProduct | undefined;
  getProductsByCategory: (category: ProductCategory | 'all') => CatalogProduct[];
  route: PageRoute;
  activeMorphSlug: string | null;
  navigate: (next: PageRoute, morphSlug?: string) => void;
  navigateToShop: (preset?: {
    category?: ProductCategory | 'all';
    collectionSlug?: string;
    surface?: SurfaceType;
    brand?: string;
    branch?: BranchId | 'all';
    customizableOnly?: boolean;
    league?: LeagueId | 'all';
    nationalRegion?: NationalRegion | 'all';
    season?: string;
    uclOnly?: boolean;
    retroOnly?: boolean;
    limitedEditionOnly?: boolean;
    bestSellersOnly?: boolean;
    newArrivalsOnly?: boolean;
    f1GarmentType?: F1GarmentType | 'all';
    f1Team?: string;
    ballSubcategory?: 'all' | 'fifa-pro' | 'league' | 'futsal';
    essentialsSubcategory?: 'all' | 'gloves' | 'socks' | 'protection';
    signatureBootOnly?: boolean;
    saleOnly?: boolean;
    sort?: SortOption;
    /** Extra filters in URL form, e.g. `league=la-liga&kit=home`. */
    params?: string;
  }) => void;
  /** Updates shop filters/sort in the URL without scrolling (used by the filter UI). */
  updateShopRoute: (next: { collectionSlug: string; params?: string; sort?: SortOption }) => void;
  cart: CartItem[];
  addToCart: (
    product: Product,
    size: string,
    quantity?: number,
    customPrint?: CustomPrintConfig,
    openDrawer?: boolean,
    variant?: KitVariant,
  ) => void;
  addGiftCardToCart: (config: {
    format: 'digital' | 'physical';
    amount: number;
    recipientName: string;
    recipientEmail: string;
    message: string;
    deliveryDate: string;
  }) => void;
  addBundleToCart: (products: Product[], bundleTitle: string) => void;
  reorderOrder: (order: Order) => void;
  updateCartQuantity: (lineId: string, delta: number) => void;
  removeFromCart: (lineId: string) => void;
  clearCart: () => void;
  giftNote: string;
  setGiftNote: (note: string) => void;
  promoCode: string;
  setPromoCode: (code: string) => void;
  wishlistStore: WishlistStore;
  wishlistAlerts: WishlistAlertsApi;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  recentlyViewed: string[];
  recordProductView: (productId: string) => void;
  // Auth & Club Account
  isAuthenticated: boolean;
  isGoogleAuthenticated: boolean;
  firebaseUserEmail: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  signUpWithEmail: (data: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  requestPasswordReset: (
    email: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  loginMember: (email: string, fullName?: string) => void;
  registerMember: (data: { fullName: string; email: string; phone?: string }) => void;
  logoutMember: () => void;
  memberProfile: MemberProfile;
  updateMemberProfile: (patch: Partial<MemberProfile>) => void;
  addresses: SavedAddress[];
  addAddress: (addr: Omit<SavedAddress, 'id'>) => void;
  updateAddress: (id: string, patch: Partial<SavedAddress>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  savedPayments: SavedPaymentMethod[];
  addPaymentMethod: (pm: Omit<SavedPaymentMethod, 'id' | 'vaultToken'>) => void;
  removePaymentMethod: (id: string) => void;
  setDefaultPayment: (id: string) => void;
  // Orders & RMA
  orders: Order[];
  lastOrderId: string | null;
  addOrder: (order: Order) => void;
  rmaRequests: RmaRequest[];
  submitRmaRequest: (
    payload: Omit<RmaRequest, 'rmaId' | 'createdAt' | 'labelCode' | 'status'>,
  ) => RmaRequest;
  // Product Q&A
  productQuestions: ProductQuestion[];
  addProductQuestion: (productId: string, author: string, question: string) => void;
  // Cookie Consent
  cookieConsent: CookieConsent;
  saveCookieConsent: (patch: { analytics: boolean; marketing: boolean }) => void;
  // Catalog filters & UI state
  gridDensity: GridDensity;
  setGridDensity: (density: GridDensity) => void;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  isWishlistOpen: boolean;
  setWishlistOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  isSizeGuideOpen: boolean;
  sizeGuideTab: 'boots' | 'jerseys';
  openSizeGuide: (tab?: 'boots' | 'jerseys') => void;
  closeSizeGuide: () => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;
  toasts: ToastItem[];
  pushToast: (
    message: string,
    actionLabel?: string,
    onAction?: () => void,
    options?: ToastOptions,
  ) => void;
  dismissToast: (id: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readWishlistFromLocalStorage(
  key: string,
  fallback: string[],
): { ids: string[]; updatedAt: string | null; found: boolean } {
  try {
    const raw = window.localStorage.getItem(key);
    return parseWishlistStoragePayload(raw, fallback, VALID_PRODUCT_IDS);
  } catch {
    return {
      ids: sanitizeWishlistIds(fallback, VALID_PRODUCT_IDS),
      updatedAt: null,
      found: false,
    };
  }
}

/**
 * Self-contained WishlistStore slice with bidirectional `localStorage` sync:
 * - Hydrates guest (`sport_castle_guest_wishlist_v2`) or member (`sport_castle_wishlist_v2`) saved items
 * - Persists every mutation to `localStorage` across browser sessions for logged-out guests & members
 * - Listens to cross-tab `storage` events to keep multiple open tabs synchronized
 * - Merges guest-saved items into the member list upon sign-in/registration
 */
function useWishlistStoreSlice(
  isAuthenticated: boolean,
  onToggleFeedback: (product: CatalogProduct | undefined, added: boolean) => void,
): {
  wishlistStore: WishlistStore;
  syncGuestIntoMember: () => void;
  switchToGuestSession: () => void;
  hydrateItems: (nextIds: string[]) => void;
} {
  const storageKey = getWishlistStorageKey(isAuthenticated);

  const initialHydration = useMemo(() => {
    const fallback = isAuthenticated ? DEFAULT_WISHLIST_SEED : [];
    const primary = readWishlistFromLocalStorage(storageKey, fallback);
    if (primary.found) return primary;

    // If a logged-out guest has legacy items under the member key before migration, preserve them
    if (!isAuthenticated) {
      const legacy = readWishlistFromLocalStorage(MEMBER_WISHLIST_STORAGE_KEY, []);
      if (legacy.found) return legacy;
    }
    return primary;
    // Only evaluate once on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [items, setItems] = useState<string[]>(initialHydration.ids);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    initialHydration.updatedAt,
  );

  // LocalStorage write sync effect — guarantees guest & member saved items persist across browser sessions
  useEffect(() => {
    const timestamp = new Date().toISOString();
    try {
      const serialized = serializeWishlistStoragePayload(
        items,
        isAuthenticated,
        timestamp,
      );
      window.localStorage.setItem(storageKey, serialized);
      setLastSyncedAt(timestamp);
    } catch {
      // Ignore storage quota or private-browsing restrictions
    }
  }, [items, isAuthenticated, storageKey]);

  // Cross-tab localStorage sync effect — keeps logged-out guests & members synced across tabs
  useEffect(() => {
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key !== storageKey && event.key !== null) return;

      const parsed = parseWishlistStoragePayload(
        event.newValue,
        [],
        VALID_PRODUCT_IDS,
      );
      setItems((prev) => {
        if (
          prev.length === parsed.ids.length &&
          prev.every((id, idx) => id === parsed.ids[idx])
        ) {
          return prev;
        }
        return parsed.ids;
      });
      if (parsed.updatedAt) {
        setLastSyncedAt(parsed.updatedAt);
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, [storageKey]);

  const toggle = (productId: string) => {
    if (!VALID_PRODUCT_IDS.has(productId)) return;
    const product = getCatalogProductById(productId);
    const willAdd = !items.includes(productId);
    setItems((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [productId, ...prev],
    );
    onToggleFeedback(product, willAdd);
  };

  const add = (productId: string) => {
    if (!VALID_PRODUCT_IDS.has(productId)) return;
    setItems((prev) => (prev.includes(productId) ? prev : [productId, ...prev]));
  };

  const remove = (productId: string) => {
    setItems((prev) => prev.filter((id) => id !== productId));
  };

  const clear = () => {
    setItems([]);
  };

  const has = (productId: string) => items.includes(productId);

  const syncGuestIntoMember = () => {
    const guestPersisted = readWishlistFromLocalStorage(
      GUEST_WISHLIST_STORAGE_KEY,
      [],
    );
    const memberPersisted = readWishlistFromLocalStorage(
      MEMBER_WISHLIST_STORAGE_KEY,
      DEFAULT_WISHLIST_SEED,
    );
    const merged = mergeGuestWishlistIntoMember(
      guestPersisted.found ? guestPersisted.ids : items,
      memberPersisted.ids,
      VALID_PRODUCT_IDS,
    );
    setItems(merged);
  };

  const switchToGuestSession = () => {
    const guestPersisted = readWishlistFromLocalStorage(
      GUEST_WISHLIST_STORAGE_KEY,
      [],
    );
    if (guestPersisted.found) {
      setItems(guestPersisted.ids);
      setLastSyncedAt(guestPersisted.updatedAt);
    } else {
      // Carry current saved items into the guest session so logging out doesn't abruptly blank their list
      setItems((prev) => sanitizeWishlistIds(prev, VALID_PRODUCT_IDS));
    }
  };

  const hydrateItems = (nextIds: string[]) => {
    setItems(sanitizeWishlistIds(nextIds, VALID_PRODUCT_IDS));
  };

  const wishlistStore: WishlistStore = {
    items,
    count: items.length,
    storageKey,
    isGuestSession: !isAuthenticated,
    lastSyncedAt,
    toggle,
    add,
    remove,
    clear,
    has,
  };

  return { wishlistStore, syncGuestIntoMember, switchToGuestSession, hydrateItems };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<PageRoute>(() =>
    parseHashToRoute(window.location.hash),
  );
  const [activeMorphSlug, setActiveMorphSlug] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() =>
    loadStorage<CartItem[]>(STORAGE_KEYS.cart, []),
  );
  const [giftNote, setGiftNote] = useState<string>(() =>
    loadStorage<string>(STORAGE_KEYS.giftNote, ''),
  );
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() =>
    loadStorage<string[]>(STORAGE_KEYS.recentlyViewed, [
      'boot-predator-25-elite-ft',
      'jersey-barca-2627-home',
      'boot-mizuno-alpha-japan',
      'jersey-madrid-2627-home',
    ]),
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    loadStorage<boolean>(STORAGE_KEYS.auth, true),
  );
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const skipNextWishlistApiSyncRef = useRef(false);
  const [memberProfile, setMemberProfile] = useState<MemberProfile>(() =>
    loadStorage<MemberProfile>(STORAGE_KEYS.member, DEFAULT_MEMBER),
  );
  const [addresses, setAddresses] = useState<SavedAddress[]>(() =>
    loadStorage<SavedAddress[]>(STORAGE_KEYS.addresses, DEFAULT_ADDRESSES),
  );
  const [savedPayments, setSavedPayments] = useState<SavedPaymentMethod[]>(() =>
    loadStorage<SavedPaymentMethod[]>(STORAGE_KEYS.payments, DEFAULT_PAYMENTS),
  );
  const [orders, setOrders] = useState<Order[]>(() =>
    loadStorage<Order[]>(STORAGE_KEYS.orders, getInitialMemberOrders()),
  );
  const [lastOrderId, setLastOrderId] = useState<string | null>(
    () => orders[0]?.id ?? SEEDED_SAMPLE_ORDER.id,
  );
  const [rmaRequests, setRmaRequests] = useState<RmaRequest[]>(() =>
    loadStorage<RmaRequest[]>(STORAGE_KEYS.rmas, []),
  );
  const [productQuestions, setProductQuestions] = useState<ProductQuestion[]>(() =>
    loadStorage<ProductQuestion[]>(STORAGE_KEYS.questions, INITIAL_PRODUCT_QUESTIONS),
  );
  const [cookieConsent, setCookieConsent] = useState<CookieConsent>(() =>
    loadStorage<CookieConsent>(STORAGE_KEYS.cookie, DEFAULT_COOKIE_CONSENT),
  );
  const [gridDensity, setGridDensity] = useState<GridDensity>(3);
  const [promoCode, setPromoCode] = useState<string>(() =>
    loadStorage<string>(STORAGE_KEYS.promo, ''),
  );

  const [isCartOpen, setCartOpen] = useState(false);
  const [isWishlistOpen, setWishlistOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isSizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [sizeGuideTab, setSizeGuideTab] = useState<'boots' | 'jerseys'>('boots');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // LocalStorage persistence effects
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart)); } catch {}
  }, [cart]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEYS.giftNote, JSON.stringify(giftNote)); } catch {}
  }, [giftNote]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEYS.recentlyViewed, JSON.stringify(recentlyViewed)); } catch {}
  }, [recentlyViewed]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(isAuthenticated)); } catch {}
  }, [isAuthenticated]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEYS.member, JSON.stringify(memberProfile)); } catch {}
  }, [memberProfile]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEYS.addresses, JSON.stringify(addresses)); } catch {}
  }, [addresses]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEYS.payments, JSON.stringify(savedPayments)); } catch {}
  }, [savedPayments]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders)); } catch {}
  }, [orders]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEYS.rmas, JSON.stringify(rmaRequests)); } catch {}
  }, [rmaRequests]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEYS.questions, JSON.stringify(productQuestions)); } catch {}
  }, [productQuestions]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEYS.cookie, JSON.stringify(cookieConsent)); } catch {}
  }, [cookieConsent]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEYS.promo, JSON.stringify(promoCode)); } catch {}
  }, [promoCode]);

  useEffect(() => {
    const syncRouteFromLocation = () => {
      const parsed = parseHashToRoute(window.location.hash);
      setCartOpen(false);
      setWishlistOpen(false);
      setSearchOpen(false);
      setQuickViewProduct(null);
      setRoute((prev) => {
        const isSameCollection =
          prev.page === 'shop' &&
          parsed.page === 'shop' &&
          prev.collectionSlug === parsed.collectionSlug;
        if (!isSameCollection) {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
        return parsed;
      });
    };
    window.addEventListener('hashchange', syncRouteFromLocation);
    window.addEventListener('popstate', syncRouteFromLocation);
    return () => {
      window.removeEventListener('hashchange', syncRouteFromLocation);
      window.removeEventListener('popstate', syncRouteFromLocation);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const [catalogOverrides, setCatalogOverrides] = useState<
    Record<string, CatalogProductOverride>
  >(() => {
    try {
      return parseSafeRecord<CatalogProductOverride>(
        window.localStorage.getItem(CATALOG_OVERRIDES_STORAGE_KEY),
      );
    } catch {
      return {};
    }
  });

  const [wishlistSnapshots, setWishlistSnapshots] = useState<
    Record<string, WishlistWatchSnapshot>
  >(() => {
    try {
      return parseSafeRecord<WishlistWatchSnapshot>(
        window.localStorage.getItem(WISHLIST_SNAPSHOTS_STORAGE_KEY),
      );
    } catch {
      return {};
    }
  });

  const [deliveredAlertKeys, setDeliveredAlertKeys] = useState<string[]>(() => {
    try {
      return parseSafeStringArray(
        window.localStorage.getItem(WISHLIST_ALERT_KEYS_STORAGE_KEY),
      );
    } catch {
      return [];
    }
  });

  const [recentAlertEvents, setRecentAlertEvents] = useState<WishlistAlertEvent[]>([]);
  const [serverCatalog, setServerCatalog] = useState<CatalogProduct[] | null>(null);

  const refreshLiveCatalog = useCallback(async () => {
    try {
      const products = await fetchLiveCatalogApi();
      if (Array.isArray(products) && products.length > 0) {
        setServerCatalog(products);
      }
    } catch {
      // Keep bundled catalog seamlessly when offline or during static preview
    }
  }, []);

  useEffect(() => {
    void refreshLiveCatalog();
  }, [refreshLiveCatalog]);

  const liveCatalog = useMemo(
    () =>
      applyCatalogOverrides(
        serverCatalog ?? MOCK_STORE_CATALOG,
        catalogOverrides,
      ),
    [serverCatalog, catalogOverrides],
  );

  const liveCatalogById = useMemo(
    () => new Map(liveCatalog.map((item) => [item.id, item])),
    [liveCatalog],
  );

  const liveCatalogBySlug = useMemo(
    () => new Map(liveCatalog.map((item) => [item.slug, item])),
    [liveCatalog],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CATALOG_OVERRIDES_STORAGE_KEY,
        JSON.stringify(catalogOverrides),
      );
    } catch {}
  }, [catalogOverrides]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        WISHLIST_SNAPSHOTS_STORAGE_KEY,
        JSON.stringify(wishlistSnapshots),
      );
    } catch {}
  }, [wishlistSnapshots]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        WISHLIST_ALERT_KEYS_STORAGE_KEY,
        JSON.stringify(deliveredAlertKeys),
      );
    } catch {}
  }, [deliveredAlertKeys]);

  // Cross-tab catalog update sync so price drops / restocks in another tab trigger live alerts
  useEffect(() => {
    const handleCatalogStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key === CATALOG_OVERRIDES_STORAGE_KEY) {
        setCatalogOverrides(
          parseSafeRecord<CatalogProductOverride>(event.newValue),
        );
      }
    };
    window.addEventListener('storage', handleCatalogStorage);
    return () => window.removeEventListener('storage', handleCatalogStorage);
  }, []);

  const pushToast: StoreContextValue['pushToast'] = (
    message,
    actionLabel,
    onAction,
    options,
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nextToast: ToastItem = {
      id,
      message,
      actionLabel,
      onAction,
      variant: options?.variant ?? 'default',
      title: options?.title,
      meta: options?.meta,
      image: options?.image,
      durationMs:
        options?.durationMs ??
        (options?.variant && options.variant !== 'default' ? 7000 : 3600),
    };
    setToasts((prev) => [...prev.slice(-3), nextToast]);
  };

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const navigate = (next: PageRoute, morphSlug?: string) => {
    const targetHash = routeToHash(next);
    if (morphSlug) {
      setActiveMorphSlug(morphSlug);
    } else if (next.page === 'product') {
      setActiveMorphSlug(next.slug);
    }

    runWithViewTransition(() => {
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
      setRoute(next);
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  };

  const navigateToShop: StoreContextValue['navigateToShop'] = (preset = {}) => {
    const { collectionSlug, sort, params, ...filterPreset } = preset;
    const sortOption = sort && sort !== 'featured' ? sort : undefined;
    const extra = parseShopParams(params ?? '', presetToShopQuery(filterPreset));

    // A plain collection link keeps its own URL (and editorial header).
    if (collectionSlug && countActiveFilters(extra) === 0) {
      navigate({ page: 'shop', collectionSlug, sort: sortOption });
      return;
    }

    const base = presetToShopQuery(
      collectionSlug ? COLLECTION_BY_SLUG.get(collectionSlug)?.preset : undefined,
    );
    const category = filterPreset.category ?? base.category;
    const merged = parseShopParams(serializeShopParams(extra), { ...base, category });
    const serialized = serializeShopParams(merged);
    navigate({
      page: 'shop',
      collectionSlug: CATEGORY_COLLECTION_SLUG[category],
      sort: sortOption,
      ...(serialized ? { params: serialized } : {}),
    });
  };

  const updateShopRoute: StoreContextValue['updateShopRoute'] = (next) => {
    const nextRoute: PageRoute = {
      page: 'shop',
      collectionSlug: next.collectionSlug,
      ...(next.params ? { params: next.params } : {}),
      ...(next.sort && next.sort !== 'featured' ? { sort: next.sort } : {}),
    };
    const hash = routeToHash(nextRoute);
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash);
    }
    setRoute(nextRoute);
  };

  const addToCart: StoreContextValue['addToCart'] = (
    product,
    size,
    quantity = 1,
    customPrint,
    openDrawer = false,
    variant,
  ) => {
    const normalizedPrint = customPrint?.enabled
      ? {
          enabled: true,
          playerName: customPrint.playerName.trim().toUpperCase().slice(0, 14),
          squadNumber: customPrint.squadNumber.replace(/\D/g, '').slice(0, 2),
          patch: customPrint.patch,
          fontStyle: customPrint.fontStyle ?? 'pro-condensed',
        }
      : undefined;

    const variantKey = variant ? `::${variant.version}-${variant.fit}-${variant.sleeve}` : '';
    const lineId = `${getCartLineId(product.id, size, normalizedPrint)}${variantKey}`;
    const basePrice = getVariantPrice(product, variant);
    const unitPrice = getCartItemUnitPrice(basePrice, normalizedPrint);

    setCart((prev) => {
      const existing = prev.find((item) => item.lineId === lineId);
      if (existing) {
        return prev.map((item) =>
          item.lineId === lineId
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [
        ...prev,
        {
          lineId,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          category: product.category,
          colorway: product.colorway,
          image: product.image,
          imageCropClass: product.imageCropClass,
          imageFilterStyle: product.imageFilterStyle,
          size,
          basePrice,
          unitPrice,
          quantity,
          customPrint: normalizedPrint,
          ...(variant ? { variant } : {}),
        },
      ];
    });

    if (openDrawer) {
      setCartOpen(true);
    } else {
      pushToast(
        `Added ${product.shortName} (${size}) to bag`,
        'View Bag',
        () => setCartOpen(true),
      );
    }
  };

  const addGiftCardToCart: StoreContextValue['addGiftCardToCart'] = (config) => {
    const lineId = `gift-card:${config.format}:${config.amount}:${config.recipientEmail.toLowerCase()}`;
    const label =
      config.format === 'digital'
        ? `Sport Castle Digital Gift Card — $${config.amount}`
        : `Sport Castle Anodized Metal Gift Card — $${config.amount}`;

    setCart((prev) => [
      ...prev.filter((i) => i.lineId !== lineId),
      {
        lineId,
        productId: 'sport-castle-gift-card',
        slug: 'gift-card',
        name: label,
        brand: 'Sport Castle',
        category: 'essentials',
        colorway: config.format === 'digital' ? 'Instant Email Dispatch' : 'Obsidian Metal Box',
        image: STUDIO_IMAGES.giftCardMetal,
        size: config.format === 'digital' ? 'Digital' : 'Physical Box',
        basePrice: config.amount,
        unitPrice: config.amount,
        quantity: 1,
        giftCardMeta: {
          format: config.format,
          recipientEmail: config.recipientEmail,
          recipientName: config.recipientName,
          message: config.message,
          deliveryDate: config.deliveryDate,
        },
      },
    ]);
    setCartOpen(true);
    pushToast(`Added $${config.amount} Gift Card for ${config.recipientName} to bag`);
  };

  const addBundleToCart = (productsToAdd: Product[], bundleTitle: string) => {
    productsToAdd.forEach((product) => {
      const preferredSize =
        product.category === 'boots'
          ? product.sizes.includes(memberProfile.preferredBootSize)
            ? memberProfile.preferredBootSize
            : product.sizes[Math.min(3, product.sizes.length - 1)]
          : product.category === 'jerseys' || product.category === 'f1'
            ? product.sizes.includes(memberProfile.preferredJerseySize)
              ? memberProfile.preferredJerseySize
              : product.sizes[Math.min(1, product.sizes.length - 1)]
            : product.sizes[0];
      addToCart(product, preferredSize, 1, undefined, false);
    });
    if (!promoCode) {
      setPromoCode('CASTLE10');
    }
    pushToast(
      `Added ${bundleTitle} (${productsToAdd.length} items + CASTLE10 10% off)`,
      'Open Bag',
      () => setCartOpen(true),
    );
  };

  const reorderOrder = (order: Order) => {
    order.items.forEach((item) => {
      const match = getCatalogProductById(item.productId);
      if (match) {
        addToCart(match, item.size, item.quantity, item.customPrint, false);
      }
    });
    setCartOpen(true);
    pushToast(`Re-added ${order.items.length} item(s) from #${order.id}`);
  };

  const updateCartQuantity = (lineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.lineId === lineId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (lineId: string) => {
    setCart((prev) => prev.filter((item) => item.lineId !== lineId));
  };

  const clearCart = () => {
    setCart([]);
    setGiftNote('');
  };

  const {
    wishlistStore,
    syncGuestIntoMember,
    switchToGuestSession,
    hydrateItems: hydrateWishlistItems,
  } = useWishlistStoreSlice(isAuthenticated, (product, added) => {
    if (!product) return;
    if (added) {
      pushToast(`Saved ${product.shortName} to wishlist`, 'View Saved', () =>
        setWishlistOpen(true),
      );
    } else {
      pushToast(`Removed ${product.shortName} from saved gear`);
    }
  });

  const wishlist = wishlistStore.items;
  const toggleWishlist = wishlistStore.toggle;
  const isWishlisted = wishlistStore.has;

  // Hydrate persisted product Q&A from PostgreSQL on initial mount
  useEffect(() => {
    let active = true;
    fetchQuestionsApi()
      .then((dbQuestions) => {
        if (!active || dbQuestions.length === 0) return;
        setProductQuestions((prev) => {
          const existingIds = new Set(prev.map((q) => q.id));
          const fresh = dbQuestions.filter((q) => !existingIds.has(q.id));
          return fresh.length > 0 ? [...fresh, ...prev] : prev;
        });
      })
      .catch(() => {
        // Gracefully keep local Q&A when offline
      });
    return () => {
      active = false;
    };
  }, []);

  // Subscribe to Firebase Authentication state & bootstrap member data from PostgreSQL
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) return;

      setIsAuthenticated(true);
      try {
        const bootstrap = await fetchAccountBootstrap();
        setMemberProfile((prev) => ({
          ...prev,
          ...bootstrap.profile,
        }));
        if (bootstrap.addresses.length > 0) {
          setAddresses(bootstrap.addresses);
        }
        if (bootstrap.savedPayments.length > 0) {
          setSavedPayments(bootstrap.savedPayments);
        }
        if (bootstrap.orders.length > 0) {
          setOrders(bootstrap.orders);
          setLastOrderId(bootstrap.orders[0].id);
        }
        if (bootstrap.rmaRequests.length > 0) {
          setRmaRequests(bootstrap.rmaRequests);
        }
        if (bootstrap.wishlist.length > 0) {
          skipNextWishlistApiSyncRef.current = true;
          hydrateWishlistItems(bootstrap.wishlist);
        }
      } catch {
        // Preserve local session state if backend bootstrap is temporarily unavailable
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync wishlist mutations to PostgreSQL when signed in with Firebase Auth
  useEffect(() => {
    if (!firebaseUser) return;
    if (skipNextWishlistApiSyncRef.current) {
      skipNextWishlistApiSyncRef.current = false;
      return;
    }
    syncWishlistApi(wishlist).catch(() => {
      // Ignore transient network sync errors; localStorage remains intact
    });
  }, [wishlist, firebaseUser]);

  // Keep baseline price & stock snapshots synchronized whenever items are added/removed from wishlist
  useEffect(() => {
    setWishlistSnapshots((prev) => {
      const synced = syncWishlistSnapshots(wishlist, prev, liveCatalogById);
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(synced);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((key) => prev[key] === synced[key])
      ) {
        return prev;
      }
      return synced;
    });
  }, [wishlist, liveCatalogById]);

  // Reactive wishlist alert monitor: fires rich ToastContainer notifications whenever a watched item drops in price or restocks
  useEffect(() => {
    if (wishlist.length === 0) return;
    const deliveredSet = new Set(deliveredAlertKeys);
    const detected = detectWishlistAlerts(
      wishlist,
      wishlistSnapshots,
      liveCatalogById,
      deliveredSet,
    );
    if (detected.length === 0) return;

    setDeliveredAlertKeys((prev) => {
      const merged = new Set(prev);
      for (const evt of detected) {
        merged.add(evt.dedupeKey);
      }
      return Array.from(merged);
    });

    setWishlistSnapshots((prev) =>
      advanceSnapshotsAfterAlerts(prev, detected, liveCatalogById),
    );

    setRecentAlertEvents((prev) => {
      const seen = new Set(prev.map((e) => e.dedupeKey));
      const fresh = detected.filter((e) => !seen.has(e.dedupeKey));
      return [...fresh, ...prev].slice(0, 12);
    });

    detected.forEach((evt) => {
      pushToast(
        evt.message,
        evt.type === 'price-drop' ? 'Shop Drop' : 'View Item',
        () => {
          setWishlistOpen(false);
          navigate({ page: 'product', slug: evt.slug }, evt.slug);
        },
        {
          variant: evt.type,
          title: evt.title,
          meta: evt.meta,
          image: evt.image,
          durationMs: 7500,
        },
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlist, wishlistSnapshots, liveCatalogById, deliveredAlertKeys]);

  const applyCatalogUpdate: WishlistAlertsApi['applyCatalogUpdate'] = (
    productId,
    patch,
  ) => {
    const existingProduct = liveCatalogById.get(productId);
    if (!existingProduct) return;

    setCatalogOverrides((prev) => {
      const currentPatch = prev[productId];
      const nextPrice =
        typeof patch.price === 'number' ? patch.price : currentPatch?.price;
      const nextOriginalPrice =
        typeof patch.originalPrice === 'number'
          ? patch.originalPrice
          : typeof patch.price === 'number' && patch.price < existingProduct.price
            ? (existingProduct.originalPrice ?? existingProduct.price)
            : currentPatch?.originalPrice;

      return {
        ...prev,
        [productId]: {
          ...currentPatch,
          price: nextPrice,
          originalPrice: nextOriginalPrice,
          branchStock: patch.branchStock
            ? { ...existingProduct.branchStock, ...patch.branchStock }
            : currentPatch?.branchStock,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const checkForWishlistUpdates: WishlistAlertsApi['checkForUpdates'] = (
    options,
  ) => {
    const syncedSnapshots = syncWishlistSnapshots(
      wishlist,
      wishlistSnapshots,
      liveCatalogById,
    );
    const { nextOverrides, updatedProductIds } = resolveWishlistCatalogUpdates(
      wishlist,
      syncedSnapshots,
      liveCatalogById,
      catalogOverrides,
      { maxUpdates: 2 },
    );

    if (updatedProductIds.length > 0) {
      setWishlistSnapshots(syncedSnapshots);
      setCatalogOverrides(nextOverrides);
      return updatedProductIds.length;
    }

    if (!options?.silentIfNone) {
      pushToast(
        wishlist.length === 0
          ? 'Save items to your wishlist to receive restock & price-drop alerts'
          : 'All watched wishlist items are at their latest Phnom Penh stock & price',
      );
    }
    return 0;
  };

  // Automatic initial session check for saved wishlist items with alerts enabled
  useEffect(() => {
    if (wishlist.length === 0 || deliveredAlertKeys.length > 0) return;
    const timer = window.setTimeout(() => {
      checkForWishlistUpdates({ silentIfNone: true });
    }, 1800);
    return () => window.clearTimeout(timer);
    // Run once on initial mount when a visitor has unalerted saved items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAlertEnabled = (productId: string): boolean => {
    const snap = wishlistSnapshots[productId];
    return snap ? snap.alertsEnabled : wishlist.includes(productId);
  };

  const toggleItemAlert = (productId: string) => {
    const product = liveCatalogById.get(productId);
    if (!product) return;

    const currentlyEnabled = isAlertEnabled(productId);
    const nextEnabled = !currentlyEnabled;

    setWishlistSnapshots((prev) => {
      const existing = prev[productId];
      return {
        ...prev,
        [productId]: existing
          ? { ...existing, alertsEnabled: nextEnabled }
          : {
              productId,
              price: product.price,
              originalPrice: product.originalPrice,
              branchStock: { ...product.branchStock },
              alertsEnabled: nextEnabled,
              capturedAt: new Date().toISOString(),
            },
      };
    });

    pushToast(
      nextEnabled
        ? `Restock & price-drop alerts enabled for ${product.shortName}`
        : `Alerts paused for ${product.shortName}`,
    );
  };

  const wishlistAlerts: WishlistAlertsApi = {
    isAlertEnabled,
    toggleItemAlert,
    activeAlertCount: wishlist.filter((id) => isAlertEnabled(id)).length,
    recentEvents: recentAlertEvents,
    getLatestEventForProduct: (productId) =>
      recentAlertEvents.find((evt) => evt.productId === productId),
    checkForUpdates: checkForWishlistUpdates,
    applyCatalogUpdate,
  };

  const recordProductView = (productId: string) => {
    setRecentlyViewed((prev) => updateRecentlyViewed(prev, productId, 6));
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      const user = await signInWithGooglePopup();
      setFirebaseUser(user);
      setIsAuthenticated(true);
      syncGuestIntoMember();
      setMemberProfile((prev) => ({
        ...prev,
        email: user.email || prev.email,
        fullName: user.displayName || prev.fullName,
      }));
      pushToast(`Signed in as ${user.displayName || user.email || 'Club Member'}`);
      return true;
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        pushToast('Unable to complete Google sign-in. Please allow popups and try again.');
      }
      return false;
    }
  };

  const signInWithEmail = async (
    email: string,
    password: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const user = await signInWithEmailPassword(email, password);
      setFirebaseUser(user);
      setIsAuthenticated(true);
      syncGuestIntoMember();
      setMemberProfile((prev) => ({
        ...prev,
        email: user.email || email.trim(),
        fullName: user.displayName || prev.fullName,
      }));
      pushToast(`Signed in as ${user.displayName || user.email || 'Club Member'}`);
      return { ok: true };
    } catch (error) {
      const message = formatFirebaseAuthError(error);
      return { ok: false, error: message || 'Unable to sign in.' };
    }
  };

  const signUpWithEmail = async (data: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const user = await registerWithEmailPassword({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      });
      setFirebaseUser(user);
      setIsAuthenticated(true);
      syncGuestIntoMember();
      const profilePatch: Partial<MemberProfile> = {
        fullName: data.fullName.trim(),
        email: user.email || data.email.trim(),
        ...(data.phone?.trim() ? { phone: data.phone.trim() } : {}),
      };
      setMemberProfile((prev) => ({ ...prev, ...profilePatch }));
      updateProfileApi(profilePatch).catch(() => {});
      pushToast(`Welcome to Sport Castle Club, ${data.fullName.trim()}`);
      return { ok: true };
    } catch (error) {
      const message = formatFirebaseAuthError(error);
      return { ok: false, error: message || 'Unable to create account.' };
    }
  };

  const requestPasswordReset = async (
    email: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      await sendFirebasePasswordReset(email);
      pushToast(`Password reset email sent to ${email.trim()}`);
      return { ok: true };
    } catch (error) {
      const message = formatFirebaseAuthError(error);
      return { ok: false, error: message || 'Unable to send reset email.' };
    }
  };

  const loginMember = (email: string, fullName?: string) => {
    setIsAuthenticated(true);
    syncGuestIntoMember();
    setMemberProfile((prev) => ({
      ...prev,
      email: email.trim() || prev.email,
      fullName: fullName?.trim() || prev.fullName,
    }));
    pushToast('Signed in to Sport Castle Club');
  };

  const registerMember = (data: { fullName: string; email: string; phone?: string }) => {
    setIsAuthenticated(true);
    syncGuestIntoMember();
    setMemberProfile((prev) => ({
      ...prev,
      fullName: data.fullName.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || prev.phone,
    }));
    pushToast(`Welcome to Sport Castle Club, ${data.fullName.trim()}`);
  };

  const logoutMember = () => {
    signOutFirebase().catch(() => {});
    setFirebaseUser(null);
    setIsAuthenticated(false);
    switchToGuestSession();
    pushToast('Signed out of Sport Castle Club');
  };

  const updateMemberProfile = (patch: Partial<MemberProfile>) => {
    setMemberProfile((prev) => ({ ...prev, ...patch }));
    if (firebaseUser) {
      updateProfileApi(patch)
        .then((saved) => setMemberProfile(saved))
        .catch(() => {});
    }
    pushToast('Club profile & fit preferences updated');
  };

  const addAddress = (addr: Omit<SavedAddress, 'id'>) => {
    const tempId = `addr-${Date.now()}`;
    setAddresses((prev) => {
      const base = addr.isDefault
        ? prev.map((a) => ({ ...a, isDefault: false }))
        : prev;
      return [{ ...addr, id: tempId }, ...base];
    });
    if (firebaseUser) {
      createAddressApi(addr)
        .then((created) => {
          setAddresses((prev) =>
            prev.map((a) => (a.id === tempId ? created : a)),
          );
        })
        .catch(() => {});
    }
    pushToast(`Saved address "${addr.label}"`);
  };

  const updateAddress = (id: string, patch: Partial<SavedAddress>) => {
    setAddresses((prev) =>
      prev.map((a) => {
        if (a.id === id) return { ...a, ...patch };
        if (patch.isDefault) return { ...a, isDefault: false };
        return a;
      }),
    );
    if (firebaseUser) {
      updateAddressApi(id, patch).catch(() => {});
    }
    pushToast('Address updated');
  };

  const deleteAddress = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    if (firebaseUser) {
      deleteAddressApi(id).catch(() => {});
    }
    pushToast('Address removed');
  };

  const setDefaultAddress = (id: string) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    if (firebaseUser) {
      updateAddressApi(id, { isDefault: true }).catch(() => {});
    }
    pushToast('Default delivery address updated');
  };

  const addPaymentMethod = (pm: Omit<SavedPaymentMethod, 'id' | 'vaultToken'>) => {
    const tempId = `pay-${Date.now()}`;
    const vaultToken = `tok_pci_${pm.brand.toLowerCase().replace(/\s+/g, '')}_${pm.last4}`;
    setSavedPayments((prev) => {
      const base = pm.isDefault
        ? prev.map((p) => ({ ...p, isDefault: false }))
        : prev;
      return [{ ...pm, id: tempId, vaultToken }, ...base];
    });
    if (firebaseUser) {
      createPaymentApi(pm)
        .then((created) => {
          setSavedPayments((prev) =>
            prev.map((p) => (p.id === tempId ? created : p)),
          );
        })
        .catch(() => {});
    }
    pushToast(`Tokenized ${pm.brand} ending in ${pm.last4}`);
  };

  const removePaymentMethod = (id: string) => {
    setSavedPayments((prev) => prev.filter((p) => p.id !== id));
    if (firebaseUser) {
      deletePaymentApi(id).catch(() => {});
    }
    pushToast('Payment method removed from vault');
  };

  const setDefaultPayment = (id: string) => {
    setSavedPayments((prev) => prev.map((p) => ({ ...p, isDefault: p.id === id })));
    if (firebaseUser) {
      setDefaultPaymentApi(id).catch(() => {});
    }
    pushToast('Default payment method updated');
  };

  const addOrder = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
    setLastOrderId(order.id);
    // Persist both guest and authenticated orders to Cloud SQL PostgreSQL
    createOrderApi(order)
      .then((persisted) => {
        setOrders((prev) =>
          prev.map((existing) => (existing.id === order.id ? persisted : existing)),
        );
      })
      .catch(() => {
        // Keep local order intact if backend call fails transiently
      });
  };

  const submitRmaRequest: StoreContextValue['submitRmaRequest'] = (payload) => {
    const rma: RmaRequest = {
      ...payload,
      rmaId: generateRmaId(),
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      labelCode: `SC-PREPAID-PP-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Label Generated',
    };
    setRmaRequests((prev) => [rma, ...prev]);
    if (firebaseUser) {
      createRmaApi(payload)
        .then((saved) => {
          setRmaRequests((prev) =>
            prev.map((item) => (item.rmaId === rma.rmaId ? saved : item)),
          );
        })
        .catch(() => {});
    }
    pushToast(`Return authorized (${rma.rmaId}) — prepaid label ready`);
    return rma;
  };

  const addProductQuestion = (productId: string, author: string, question: string) => {
    const tempId = `qa-${Date.now()}`;
    const entry: ProductQuestion = {
      id: tempId,
      productId,
      author: author.trim() || 'Phnom Penh Player',
      question: question.trim(),
      answer:
        'Received by our Sonthormuk Boot & Kit Specialists — typical reply time is under 15 minutes during store hours (8:30 AM – 8:30 PM).',
      date: 'Just now',
    };
    setProductQuestions((prev) => [entry, ...prev]);
    createQuestionApi({
      productId,
      author: entry.author,
      question: entry.question,
    })
      .then((saved) => {
        setProductQuestions((prev) =>
          prev.map((q) => (q.id === tempId ? saved : q)),
        );
      })
      .catch(() => {});
    pushToast('Question submitted to Sport Castle specialists');
  };

  const saveCookieConsent = (patch: { analytics: boolean; marketing: boolean }) => {
    setCookieConsent({
      essential: true,
      analytics: patch.analytics,
      marketing: patch.marketing,
      decided: true,
      updatedAt: new Date().toISOString(),
    });
    pushToast('Cookie & privacy preferences saved');
  };


  const openSizeGuide = (tab: 'boots' | 'jerseys' = 'boots') => {
    setSizeGuideTab(tab);
    setSizeGuideOpen(true);
  };

  const closeSizeGuide = () => setSizeGuideOpen(false);

  const jerseysCatalog = useMemo(
    () => liveCatalog.filter((p) => p.category === 'jerseys'),
    [liveCatalog],
  );
  const championsLeagueJerseys = useMemo(
    () => liveCatalog.filter((p) => p.category === 'jerseys' && p.isChampionsLeague),
    [liveCatalog],
  );
  const top5LeagueJerseys = useMemo(
    () =>
      liveCatalog.filter(
        (p) =>
          p.category === 'jerseys' &&
          p.league &&
          ['La Liga', 'Premier League', 'Serie A', 'Bundesliga', 'Ligue 1'].includes(
            p.league,
          ),
      ),
    [liveCatalog],
  );
  const bootsCatalog = useMemo(
    () => liveCatalog.filter((p) => p.category === 'boots'),
    [liveCatalog],
  );
  const getLiveProductBySlug = (slug: string) =>
    liveCatalogBySlug.get(slug) ?? getCatalogProductBySlug(slug);
  const getLiveProductById = (id: string) =>
    liveCatalogById.get(id) ?? getCatalogProductById(id);
  const getLiveProductsByCategory = (category: ProductCategory | 'all') =>
    category === 'all'
      ? liveCatalog
      : liveCatalog.filter((item) => item.category === category);

  const value = useMemo<StoreContextValue>(
    () => ({
      catalog: liveCatalog,
      isCatalogSyncedFromServer: serverCatalog !== null,
      refreshLiveCatalog,
      categories: CATEGORY_DIRECTORY,
      jerseysCatalog,
      championsLeagueJerseys,
      top5LeagueJerseys,
      bootsCatalog,
      branches: STORE_BRANCHES,
      getProductBySlug: getLiveProductBySlug,
      getProductById: getLiveProductById,
      getProductsByCategory: getLiveProductsByCategory,
      route,
      activeMorphSlug,
      navigate,
      navigateToShop,
      cart,
      addToCart,
      addGiftCardToCart,
      addBundleToCart,
      reorderOrder,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      giftNote,
      setGiftNote,
      promoCode,
      setPromoCode,
      wishlistStore,
      wishlistAlerts,
      wishlist,
      toggleWishlist,
      isWishlisted,
      recentlyViewed,
      recordProductView,
      isAuthenticated,
      isGoogleAuthenticated: Boolean(firebaseUser),
      firebaseUserEmail: firebaseUser?.email ?? null,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      requestPasswordReset,
      loginMember,
      registerMember,
      logoutMember,
      memberProfile,
      updateMemberProfile,
      addresses,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      savedPayments,
      addPaymentMethod,
      removePaymentMethod,
      setDefaultPayment,
      orders,
      lastOrderId,
      addOrder,
      rmaRequests,
      submitRmaRequest,
      productQuestions,
      addProductQuestion,
      cookieConsent,
      saveCookieConsent,
      gridDensity,
      setGridDensity,
      updateShopRoute,
      isCartOpen,
      setCartOpen,
      isWishlistOpen,
      setWishlistOpen,
      isSearchOpen,
      setSearchOpen,
      isSizeGuideOpen,
      sizeGuideTab,
      openSizeGuide,
      closeSizeGuide,
      quickViewProduct,
      setQuickViewProduct,
      toasts,
      pushToast,
      dismissToast,
    }),
    [
      liveCatalog,
      serverCatalog,
      refreshLiveCatalog,
      jerseysCatalog,
      championsLeagueJerseys,
      top5LeagueJerseys,
      bootsCatalog,
      route,
      activeMorphSlug,
      cart,
      giftNote,
      promoCode,
      wishlist,
      wishlistStore.lastSyncedAt,
      wishlistSnapshots,
      recentAlertEvents,
      deliveredAlertKeys,
      recentlyViewed,
      isAuthenticated,
      firebaseUser,
      memberProfile,
      addresses,
      savedPayments,
      orders,
      lastOrderId,
      rmaRequests,
      productQuestions,
      cookieConsent,
      gridDensity,
      isCartOpen,
      isWishlistOpen,
      isSearchOpen,
      isSizeGuideOpen,
      sizeGuideTab,
      quickViewProduct,
      toasts,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export function useWishlistStore(): WishlistStore {
  return useStore().wishlistStore;
}
