import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS, SEEDED_SAMPLE_ORDER } from '../data/catalog';
import { MATCHDAY_LOOKBOOKS } from '../data/lookbooks';
import {
  BLOG_ARTICLES,
  COLLECTION_CATALOG,
} from '../data/editorial';
import {
  calculateCartTotals,
  calculateLookbookBundlePricing,
  calculateLoyaltyTier,
  calculateRmaRefund,
  F1_TEAMS,
  filterAndSortProducts,
  filterKitsByEdition,
  formatJerseySizeWithEu,
  formatKhr,
  formatTelegramOrderMessage,
  formatUsd,
  fuzzySearchSite,
  getCartItemUnitPrice,
  getCartLineId,
  getKitUnavailableSizes,
  getNextCarouselIndex,
  getProductSiblings,
  getProductSwatchColor,
  isKitCollectionView,
  isKitProduct,
  matchBootsForPlayer,
  recommendBootSizeFromCm,
  sanitizePlayerName,
  sanitizeSquadNumber,
  updateRecentlyViewed,
  validateCheckoutDetails,
  validateGiftCardInput,
  validatePasswordStrength,
} from './commerce';
import {
  buildCollectionHashWithSort,
  buildRobotsTxt,
  buildXmlSitemap,
  parseHashToRoute,
  parseSortParam,
  routeToHash,
} from './router';
import {
  buildMobileTrackingUrl,
  buildOrderQrPayload,
  generateOrderQrData,
  normalizeOrderIdForQr,
  sanitizeQrDownloadFilename,
} from './orderQr';
import {
  getKitBackPrintDefaults,
  getNextKitCardPinnedView,
  resolveKitCardShowingBack,
} from './kitCardView';
import {
  buildDonutArcGeometry,
  calculatePurchaseInsights,
} from './purchaseInsights';
import {
  CATEGORY_DIRECTORY,
  CHAMPIONS_LEAGUE_JERSEYS,
  FOOTBALL_BOOTS_CATALOG,
  formatTagLabel,
  getCatalogByCategory,
  getCatalogProductById,
  getCatalogProductBySlug,
  getRecommendedProducts,
  MOCK_STORE_CATALOG,
  STORE_BRANCHES,
  TOP_5_LEAGUE_JERSEYS,
} from '../lib/mock-store/catalog';
import {
  buildDefaultSiteSeo,
  buildProductSeoMetadata,
  resolveAbsoluteUrl,
  truncateMetaText,
} from './seo';
import {
  GUEST_WISHLIST_STORAGE_KEY,
  MEMBER_WISHLIST_STORAGE_KEY,
  getWishlistStorageKey,
  mergeGuestWishlistIntoMember,
  parseWishlistStoragePayload,
  sanitizeWishlistIds,
  serializeWishlistStoragePayload,
} from './wishlistStorage';
import {
  BRANCH_COORDINATES,
  buildOrderBriefSummary,
  buildShippingTimeline,
  calculateDistanceKm,
  getBuiltInTrackableOrders,
  resolveOrderTracking,
  resolvePhnomPenhLocationFromCoords,
  validateTrackingLookup,
} from './orderTracking';
import {
  buildListingTransitionKey,
  getListingSkeletonCount,
  resolveSkeletonDurationMs,
} from './skeletons';
import {
  buildOrderTransitTimeline,
  filterOrdersByStatus,
  formatOrderDate,
  formatOrderFulfillmentLabel,
  getInitialMemberOrders,
  getOrderHistorySummary,
  getOrderStatusCounts,
  getOrderStatusMeta,
  getRecentOrders,
} from './orderHistory';
import {
  advanceSnapshotsAfterAlerts,
  applyCatalogOverrides,
  detectWishlistAlerts,
  resolveWishlistCatalogUpdates,
  syncWishlistSnapshots,
} from './wishlistAlerts';
import {
  buildAllBranchPickupEstimates,
  calculateBranchPickupEstimate,
  formatIctClockTime,
  formatPickupDuration,
} from './storePickup';
import {
  BRONZE_SPEND_THRESHOLD,
  GOLD_SPEND_THRESHOLD,
  LOYALTY_TIERS,
  PRO_MEMBER_POINTS_THRESHOLD,
  PRO_MEMBER_SPEND_THRESHOLD,
  SILVER_SPEND_THRESHOLD,
  calculateProMemberProgress,
} from './loyaltyTier';
import {
  addressCreateSchema,
  createOrderSchema,
  paymentCreateSchema,
  productQuestionCreateSchema,
  profileUpdateSchema,
  trackOrderSchema,
} from '../../backend/validators/schemas.ts';
import { createBackendApp } from '../../backend/app.ts';
import {
  buildConnectionLogsCsv,
  buildConnectionLogsCsvFilename,
  buildHourlyAverageLatencySeries,
  buildHourlyLatencyHistogram,
  buildLatencyTrendSeries,
  buildUptime24hSeries,
  calculateAvailabilityPercent,
  calculatePercentile,
  classifyChartPointLatencyTier,
  classifyHistogramBucketBand,
  countCriticalLatencyPoints,
  countEnabledAlertPreferences,
  countLatencyThresholdBreaches,
  DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
  DEFAULT_HEALTH_ALERT_PREFERENCES,
  DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  detectLatencyAnomalies,
  escapeCsvCell,
  evaluateLatencyAlert,
  evaluateSystemHealthAlerts,
  formatLatencyMs,
  formatUptimeDuration,
  getRecentConnectionAttemptLogs,
  isCriticalLatency,
  sanitizeAnomalyMultiplier,
  sanitizeCriticalLatencyThresholdMs,
  sanitizeHealthAlertPreferences,
  sanitizeLatencyThresholdMs,
  sanitizeMetricsLimit,
  summarizeLatencyMetrics,
  type SystemHealthMetricsResponse,
  type SystemHealthSnapshot,
} from '../../backend/health/systemHealthTypes.ts';
import {
  clearHealthHistory,
  getSystemHealthSnapshot,
} from '../../backend/health/systemHealthService.ts';
import { renderSystemHealthHtml } from '../../backend/health/systemHealthRouter.ts';
import {
  build24hHealthReportSummary,
  buildSystemHealthPdfFilename,
  generateSystemHealthPdfBytes,
} from '../../backend/health/systemHealthPdfReport.ts';
import {
  computeHmacSha256Hex,
  normalizeAbaKhqrWebhookOutcome,
  normalizeStripeWebhookOutcome,
  verifyAbaKhqrSignature,
  verifyStripeSignature,
} from '../../backend/payments/webhookCrypto.ts';
import {
  buildOrderNotificationContent,
  dispatchOrderNotifications,
  escapeEmailHtml,
  type NotificationDeliveryResult,
} from '../../backend/notifications/notificationService.ts';
import {
  mergeInventoryOverridesIntoCatalog,
  type AdminOrderRecord,
  type InventoryOverrideRecord,
  type WebhookEventAuditRecord,
} from '../../backend/repositories/adminRepository.ts';
import { isAdminEmail } from '../../backend/middleware/auth.ts';
import { InMemoryRateLimitStore } from '../../backend/middleware/rateLimit.ts';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { CartItem, PageRoute, ProductFilters } from '../types/store';

test('catalog contains all 80 products (15 boots + 44 jerseys + 12 F1 + 6 balls + 3 essentials) with local official images', () => {
  assert.equal(PRODUCTS.length, 80);
  const categories = new Set(PRODUCTS.map((p) => p.category));
  assert.deepEqual(
    [...categories].sort(),
    ['balls', 'boots', 'essentials', 'f1', 'jerseys'],
  );
  const boots = PRODUCTS.filter((p) => p.category === 'boots');
  assert.equal(boots.length, 15);

  const f1Items = PRODUCTS.filter((p) => p.category === 'f1');
  assert.equal(f1Items.length, 12);
  assert.ok(f1Items.filter((item) => item.garmentType === 'jersey').length === 8);
  assert.ok(f1Items.filter((item) => item.garmentType === 'jacket').length === 4);

  // Verify every product image is stored locally (zero remote URLs)
  assert.ok(
    PRODUCTS.every(
      (p) =>
        p.image.startsWith('/src/assets/images/') ||
        p.image.startsWith('/assets/aistudio/'),
    ),
    'All product images must use local studio or attached asset paths',
  );

  // Verify flagship 2026 boots, Messi edition, 2026/27 European & National kits, Retro, Balls, and F1 items exist
  const requiredIds = [
    'boot-predator-25-elite-ft',
    'boot-adidas-f50-messi-fg',
    'boot-phantom-luna-2-elite',
    'boot-puma-ultra-5-carbon',
    'boot-nb-furon-v7-pro',
    'boot-mizuno-alpha-japan',
    'boot-nike-vapor-16-elite-ag',
    'boot-puma-king-ultimate-fg',
    'jersey-barca-2627-home',
    'jersey-barca-2627-away',
    'jersey-barca-2627-third',
    'jersey-barca-1999-retro',
    'jersey-madrid-2627-home',
    'jersey-madrid-2627-away',
    'jersey-madrid-2627-third',
    'jersey-madrid-125-anniversary',
    'jersey-psg-2627-third-ucl',
    'jersey-france-2627-home',
    'jersey-spain-2627-home',
    'jersey-germany-2627-home',
    'jersey-italy-2627-home',
    'jersey-brazil-2627-home',
    'jersey-brazil-2002-retro',
    'jersey-japan-2627-home',
    'jersey-korea-2627-home',
    'ball-adidas-ucl-2627-pro',
    'ball-puma-orbita-laliga-2627',
    'f1-ferrari-paddock-jacket',
    'f1-mclaren-paddock-jacket',
  ];
  for (const id of requiredIds) {
    assert.ok(PRODUCTS.some((p) => p.id === id), `Missing expected product: ${id}`);
  }
});

test('custom jersey print fees and line IDs differentiate printed vs plain jerseys', () => {
  const plainPrice = getCartItemUnitPrice(35, {
    enabled: false,
    playerName: 'CHAN',
    squadNumber: '11',
    patch: 'cpl',
  });
  assert.equal(plainPrice, 35);

  const printedPrice = getCartItemUnitPrice(35, {
    enabled: true,
    playerName: 'CHAN',
    squadNumber: '11',
    patch: 'cpl',
  });
  // $35 base + $8 print + $4 CPL patch = $47
  assert.equal(printedPrice, 47);

  const linePlain = getCartLineId('jersey-cambodia-home', 'L');
  const linePrint = getCartLineId('jersey-cambodia-home', 'L', {
    enabled: true,
    playerName: 'chan vathanaka',
    squadNumber: '11',
    patch: 'cpl',
  });
  assert.notEqual(linePlain, linePrint);
  assert.equal(sanitizePlayerName('chan vathanaka!!123456'), 'CHAN VATHANAKA');
  assert.equal(sanitizeSquadNumber('099'), '9');
  assert.equal(sanitizeSquadNumber('11'), '11');
});

test('cart totals apply CASTLE10 promo, free shipping >= $50, team bulk discount, and KHR conversion', () => {
  const singleItem: CartItem[] = [
    {
      lineId: 'a',
      productId: 'jersey-cambodia-home',
      slug: 'cambodia-national-team-home-jersey-varaman',
      name: 'Cambodia Home',
      brand: 'Varaman',
      category: 'jerseys',
      colorway: 'Royal Blue',
      image: '/test.jpg',
      size: 'M',
      basePrice: 35,
      unitPrice: 35,
      quantity: 1,
    },
  ];

  // Under $50 delivery -> $2.50 shipping
  const underThreshold = calculateCartTotals(singleItem, '', 'delivery');
  assert.equal(underThreshold.shippingFee, 2.5);
  assert.equal(underThreshold.freeShippingRemaining, 15);
  assert.equal(underThreshold.totalUsd, 37.5);
  assert.equal(formatUsd(37.5), '$37.50');
  assert.equal(formatKhr(10), '41,000 ៛');

  // Pickup -> $0 shipping
  const pickupTotals = calculateCartTotals(singleItem, '', 'pickup');
  assert.equal(pickupTotals.shippingFee, 0);
  assert.equal(pickupTotals.totalUsd, 35);

  // CASTLE10 + 5 jerseys triggers automatic 10% squad team discount + 10% CASTLE10 + free delivery
  const teamOrder: CartItem[] = [{ ...singleItem[0], quantity: 5 }];
  const teamTotals = calculateCartTotals(teamOrder, 'CASTLE10', 'delivery');
  // subtotal 175 -> teamDiscount 17.5 -> afterTeam 157.5 -> promoDiscount 15.75 -> total 141.75
  assert.equal(teamTotals.subtotal, 175);
  assert.equal(teamTotals.teamDiscount, 17.5);
  assert.equal(teamTotals.promoDiscount, 15.75);
  assert.equal(teamTotals.shippingFee, 0);
  assert.equal(teamTotals.totalUsd, 141.75);
  assert.equal(teamTotals.promoValid, true);
});

test('multi-facet catalog filtering works for surface, league, UCL, brand, category, branch, and search', () => {
  const baseFilters: ProductFilters = {
    category: 'all',
    surfaces: [],
    brands: [],
    maxPrice: 300,
    branch: 'all',
    customizableOnly: false,
    league: 'all',
    uclOnly: false,
    searchQuery: '',
  };

  const turfResults = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, surfaces: ['TF'] },
    'featured',
  );
  assert.ok(turfResults.some((p) => p.id === 'boot-tiempo-10-tf'));
  assert.ok(turfResults.every((p) => p.surface === 'TF' || p.surface === 'MG'));

  const laLigaResults = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, league: 'La Liga', category: 'jerseys' },
    'featured',
  );
  assert.equal(laLigaResults.length, 9);
  assert.ok(laLigaResults.some((p) => p.id === 'jersey-barca-2627-away'));
  assert.ok(laLigaResults.some((p) => p.id === 'jersey-barca-1999-retro'));
  assert.ok(laLigaResults.some((p) => p.id === 'jersey-madrid-2627-third'));

  const premierLeagueResults = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, league: 'Premier League' },
    'featured',
  );
  assert.equal(premierLeagueResults.length, 7);

  const uclResults = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, uclOnly: true },
    'featured',
  );
  assert.equal(uclResults.length, 22);
  assert.ok(uclResults.every((p) => p.isChampionsLeague === true));

  // Verify UCL Starball sleeve patch pricing ($98 base + $8 print + $5 UCL patch = $111)
  const uclPrintedPrice = getCartItemUnitPrice(98, {
    enabled: true,
    playerName: 'YAMAL',
    squadNumber: '10',
    patch: 'ucl',
  });
  assert.equal(uclPrintedPrice, 111);

  const f1Search = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, searchQuery: 'ferrari' },
    'featured',
  );
  assert.equal(f1Search.length, 3);
  assert.ok(f1Search.every((item) => item.category === 'f1'));

  const sortedLow = filterAndSortProducts(PRODUCTS, baseFilters, 'price-asc');
  assert.ok(sortedLow[0].price <= sortedLow[sortedLow.length - 1].price);
});

test('checkout validation enforces required fields for Phnom Penh delivery vs branch pickup', () => {
  const deliveryErrors = validateCheckoutDetails(
    {
      fullName: '',
      phone: '123',
      telegram: '',
      khan: '',
      sangkat: '',
      streetAddress: '',
      notes: '',
    },
    'delivery',
  );
  assert.ok(deliveryErrors.fullName);
  assert.ok(deliveryErrors.phone);
  assert.ok(deliveryErrors.khan);
  assert.ok(deliveryErrors.streetAddress);

  const pickupErrors = validateCheckoutDetails(
    {
      fullName: 'Sokha Meas',
      phone: '+855 12 345 678',
      telegram: '@sokha_fc',
      khan: '',
      sangkat: '',
      streetAddress: '',
      notes: '',
    },
    'pickup',
  );
  assert.deepEqual(pickupErrors, {});
});

test('boot matcher and size recommender return accurate matches for Phnom Penh pitches', () => {
  const turfMatches = matchBootsForPlayer(PRODUCTS, {
    pitch: 'artificial-turf',
    playstyle: 'heritage',
    maxBudget: 160,
  });
  assert.ok(turfMatches.length >= 1);
  assert.equal(turfMatches[0].id, 'boot-tiempo-10-tf');

  const rec = recommendBootSizeFromCm(27.0);
  assert.equal(rec.eu, '42.5');
  assert.equal(rec.us, '9');

  const msg = formatTelegramOrderMessage({
    id: 'SC-9999',
    createdAt: new Date().toISOString(),
    status: 'Confirmed',
    fulfillmentMethod: 'pickup',
    pickupBranch: 'sonthormuk',
    customer: {
      fullName: 'Vireak',
      phone: '+85512889261',
      telegram: '@vireak',
      khan: '',
      sangkat: '',
      streetAddress: '',
      notes: '',
    },
    paymentMethod: 'aba-khqr',
    items: [],
    subtotal: 0,
    teamDiscount: 0,
    promoDiscount: 0,
    shippingFee: 0,
    totalUsd: 0,
    totalKhr: 0,
  });
  assert.ok(msg.includes('SPORT CASTLE ORDER #SC-9999'));
  assert.ok(msg.includes('SONTHORMUK Branch'));
});

test('sibling edition grouping, swatch colors, lookbook bundles, loyalty tiers, and recently viewed queue work accurately', () => {
  const barcaHome = PRODUCTS.find((p) => p.id === 'jersey-barca-2627-home')!;
  const barcaSiblings = getProductSiblings(PRODUCTS, barcaHome);
  assert.equal(barcaSiblings.length, 4);
  assert.ok(barcaSiblings.some((s) => s.id === 'jersey-barca-2627-away'));
  assert.ok(barcaSiblings.some((s) => s.id === 'jersey-barca-2627-third'));
  assert.ok(barcaSiblings.some((s) => s.id === 'jersey-barca-1999-retro'));

  const madridHome = PRODUCTS.find((p) => p.id === 'jersey-madrid-2627-home')!;
  const madridSiblings = getProductSiblings(PRODUCTS, madridHome);
  assert.equal(madridSiblings.length, 4);

  const predator = PRODUCTS.find((p) => p.id === 'boot-predator-25-elite-ft')!;
  assert.equal(getProductSwatchColor(predator), '#D81E2B');

  // Verify every Matchday Lookbook resolves all products and computes 10% savings
  assert.equal(MATCHDAY_LOOKBOOKS.length, 4);
  for (const look of MATCHDAY_LOOKBOOKS) {
    const pricing = calculateLookbookBundlePricing(
      look.productIds,
      look.discountPercent,
      PRODUCTS,
    );
    assert.equal(pricing.items.length, look.productIds.length);
    assert.ok(pricing.bundleTotal < pricing.originalTotal);
    assert.equal(
      pricing.bundleTotal,
      Number((pricing.originalTotal - pricing.savings).toFixed(2)),
    );
  }

  // Loyalty tier calculation across all 3 tiers
  const seededPoints = Math.round(SEEDED_SAMPLE_ORDER.totalUsd * 10);
  const seededTier = calculateLoyaltyTier([SEEDED_SAMPLE_ORDER]);
  assert.equal(seededTier.points, seededPoints);
  assert.equal(
    seededTier.tier,
    seededPoints >= 5000 ? 'Kouprey Gold' : seededPoints >= 2000 ? 'Matchday Pro' : 'Pitch Rookie',
  );
  const proTier = calculateLoyaltyTier([{ ...SEEDED_SAMPLE_ORDER, totalUsd: 260 }]);
  assert.equal(proTier.tier, 'Matchday Pro');
  const goldTier = calculateLoyaltyTier([{ ...SEEDED_SAMPLE_ORDER, totalUsd: 540 }]);
  assert.equal(goldTier.tier, 'Kouprey Gold');

  // Recently viewed deduplicated LIFO queue
  const queue = updateRecentlyViewed(['a', 'b', 'c'], 'b', 4);
  assert.deepEqual(queue, ['b', 'a', 'c']);
  const capped = updateRecentlyViewed(['1', '2', '3', '4'], '5', 4);
  assert.deepEqual(capped, ['5', '1', '2', '3']);
});

test('all 35 canonical enterprise e-commerce routes parse and serialize cleanly', () => {
  const cases: Array<[string, PageRoute]> = [
    ['#/', { page: 'home' }],
    ['#/collections/all', { page: 'shop', collectionSlug: 'all' }],
    ['#/collections/ucl-2026-27', { page: 'shop', collectionSlug: 'ucl-2026-27' }],
    ['#/brands/nike', { page: 'brand', slug: 'nike' }],
    ['#/search?q=barcelona', { page: 'search', query: 'barcelona' }],
    ['#/products/adidas-predator-25-elite-ft', { page: 'product', slug: 'adidas-predator-25-elite-ft' }],
    ['#/products/gift-card', { page: 'gift-card' }],
    ['#/cart', { page: 'cart' }],
    ['#/checkout', { page: 'checkout' }],
    ['#/checkout/thank-you?order=SC-8810', { page: 'thank-you', orderId: 'SC-8810' }],
    ['#/account/login', { page: 'login' }],
    ['#/account/register', { page: 'register' }],
    ['#/account/recover', { page: 'recover' }],
    ['#/account', { page: 'account', section: 'overview' }],
    ['#/account/orders', { page: 'account', section: 'orders', orderId: undefined }],
    ['#/account/orders/SC-8810', { page: 'account', section: 'orders', orderId: 'SC-8810' }],
    ['#/account/addresses', { page: 'account', section: 'addresses' }],
    ['#/account/payments', { page: 'account', section: 'payments' }],
    ['#/account/wishlist', { page: 'account', section: 'wishlist' }],
    ['#/pages/track-order', { page: 'orders' }],
    ['#/pages/returns', { page: 'returns' }],
    ['#/pages/faq', { page: 'faq' }],
    ['#/pages/contact', { page: 'contact' }],
    ['#/pages/stores', { page: 'branches' }],
    ['#/pages/about', { page: 'about' }],
    ['#/blogs/news', { page: 'blog' }],
    ['#/blogs/news/phnom-penh-artificial-turf-stud-guide', { page: 'blog-post', slug: 'phnom-penh-artificial-turf-stud-guide' }],
    ['#/pages/black-friday-pitch-drop', { page: 'campaign', slug: 'black-friday-pitch-drop' }],
    ['#/policies/privacy-policy', { page: 'policy', slug: 'privacy-policy' }],
    ['#/policies/terms-of-service', { page: 'policy', slug: 'terms-of-service' }],
    ['#/policies/shipping-policy', { page: 'policy', slug: 'shipping-policy' }],
    ['#/policies/refund-policy', { page: 'policy', slug: 'refund-policy' }],
    ['#/policies/cookie-policy', { page: 'policy', slug: 'cookie-policy' }],
    ['#/404', { page: 'not-found', attemptedPath: '/404' }],
    ['#/maintenance', { page: 'maintenance' }],
    ['#/pages/sitemap', { page: 'sitemap' }],
  ];

  for (const [hash, expected] of cases) {
    const parsed = parseHashToRoute(hash);
    assert.deepEqual(parsed, expected, `Failed parsing ${hash}`);
    const serialized = routeToHash(parsed);
    assert.equal(serialized, hash, `Failed round-trip serializing ${hash}`);
  }

  // Unknown paths route cleanly to 404 recovery page
  const unknown = parseHashToRoute('#/nonexistent/route');
  assert.equal(unknown.page, 'not-found');
});

test('fuzzy site search handles spell-check typos and zero-result fallbacks', () => {
  const typoBarca = fuzzySearchSite(PRODUCTS, BLOG_ARTICLES, COLLECTION_CATALOG, 'barcalona');
  assert.equal(typoBarca.usedCorrection, 'Barcelona');
  assert.ok(typoBarca.products.length >= 3);

  const typoPredator = fuzzySearchSite(PRODUCTS, BLOG_ARTICLES, COLLECTION_CATALOG, 'predater');
  assert.equal(typoPredator.usedCorrection, 'Predator');
  assert.ok(typoPredator.products.some((p) => p.id === 'boot-predator-25-elite-ft'));

  const noMatch = fuzzySearchSite(PRODUCTS, BLOG_ARTICLES, COLLECTION_CATALOG, 'zzzznotaproduct99');
  assert.equal(noMatch.products.length, 0);
  assert.equal(noMatch.usedCorrection, null);
});

test('auth password rules, gift card validation, RMA +5% store credit math, and SEO XML sitemap/robots', () => {
  const weak = validatePasswordStrength('short');
  assert.equal(weak.isValid, false);
  const strong = validatePasswordStrength('SportCastle26');
  assert.equal(strong.isValid, true);

  const badGift = validateGiftCardInput({ amount: 5, recipientEmail: 'bad', recipientName: '' });
  assert.ok(badGift.amount && badGift.recipientEmail && badGift.recipientName);
  const okGift = validateGiftCardInput({
    amount: 100,
    recipientEmail: 'player@pp.kh',
    recipientName: 'Rithy',
  });
  assert.deepEqual(okGift, {});

  const rmaCredit = calculateRmaRefund([{ unitPrice: 100, quantity: 2 }], 'store-credit');
  assert.equal(rmaCredit.subtotal, 200);
  assert.equal(rmaCredit.bonusCredit, 10);
  assert.equal(rmaCredit.totalRefund, 210);

  const xml = buildXmlSitemap('https://sportcastle.com.kh');
  assert.ok(xml.includes('<urlset'));
  assert.ok(xml.includes('/#/collections/ucl-2026-27'));
  assert.ok(xml.includes('/#/brands/nike'));
  assert.ok(xml.includes('/#/policies/cookie-policy'));

  const robots = buildRobotsTxt('https://sportcastle.com.kh');
  assert.ok(robots.includes('User-agent: *'));
  assert.ok(robots.includes('Sitemap: https://sportcastle.com.kh/sitemap.xml'));
});

test('minimalist kit scoping, auto-shift carousel circular math, and cross-variant edition availability', () => {
  const barcaHome = PRODUCTS.find((p) => p.category === 'jerseys' && p.club === 'FC Barcelona');
  const predator = PRODUCTS.find((p) => p.id === 'boot-predator-25-elite-ft');
  const ferrariF1 = PRODUCTS.find((p) => p.category === 'f1');
  assert.ok(barcaHome && predator && ferrariF1);

  // Strictly applies to jerseys and F1 kits, never boots
  assert.equal(isKitProduct(barcaHome), true);
  assert.equal(isKitProduct(ferrariF1), true);
  assert.equal(isKitProduct(predator), false);

  assert.equal(isKitCollectionView('jerseys'), true);
  assert.equal(isKitCollectionView('all', 'ucl-2026-27'), true);
  assert.equal(isKitCollectionView('boots', 'football-boots'), false);

  // Circular auto-shift carousel step math
  assert.equal(getNextCarouselIndex(0, 1, 8), 1);
  assert.equal(getNextCarouselIndex(7, 1, 8), 0);
  assert.equal(getNextCarouselIndex(0, -1, 8), 7);
  assert.equal(getNextCarouselIndex(0, 1, 0), 0);

  // Edition filtering & cross-variant sold-out sizes on Third kits
  const allJerseys = PRODUCTS.filter((p) => p.category === 'jerseys');
  const thirdKits = filterKitsByEdition(allJerseys, 'Third');
  assert.ok(thirdKits.length >= 1);
  assert.ok(thirdKits.every((p) => p.kitType === 'Third'));
  assert.ok(getKitUnavailableSizes(thirdKits[0]).includes('XXL'));
  assert.deepEqual(getKitUnavailableSizes(predator), []);
});

test('mock-store catalog provides clean category counts, variants, numeric stock, and category-accurate details tables', () => {
  assert.equal(MOCK_STORE_CATALOG.length, 80);
  assert.equal(STORE_BRANCHES.length, 3);

  // Category directory sums cleanly to all 80 SKUs with zero category leakage
  const totalCount = CATEGORY_DIRECTORY.reduce((sum, c) => sum + c.productCount, 0);
  assert.equal(totalCount, 80);
  assert.deepEqual(
    CATEGORY_DIRECTORY.map((c) => [c.id, c.productCount]),
    [
      ['jerseys', 44],
      ['boots', 15],
      ['f1', 12],
      ['balls', 6],
      ['essentials', 3],
    ],
  );

  // Curated subsets exposed via StoreProvider
  assert.ok(CHAMPIONS_LEAGUE_JERSEYS.length >= 20);
  assert.ok(TOP_5_LEAGUE_JERSEYS.length >= 20);
  assert.equal(FOOTBALL_BOOTS_CATALOG.length, 15);
  assert.equal(getCatalogByCategory('all').length, 80);
  assert.equal(getCatalogByCategory('boots').length, 15);

  // Every product has structured SKU, variants, branch stock matrix, and all 3 detailsTable groups
  for (const item of MOCK_STORE_CATALOG) {
    assert.ok(item.sku.startsWith('SC-'), `Invalid SKU on ${item.id}`);
    assert.ok(item.subcategory.length > 0);
    assert.ok(item.variants.length >= 1);
    assert.ok(item.variants[0].sizes.length === item.sizes.length);
    assert.ok(item.totalUnitsAvailable > 0);

    const groups = new Set(item.detailsTable.map((r) => r.group));
    assert.ok(groups.has('classification'));
    assert.ok(groups.has('technical'));
    assert.ok(groups.has('fulfillment'));
  }

  // Verify category-specific table separation (jerseys vs boots)
  const barca = getCatalogProductById('jersey-barca-2627-home');
  const predator = getCatalogProductBySlug('adidas-predator-25-elite-fold-over-tongue-fg');
  assert.ok(barca && predator);

  const barcaLabels = barca.detailsTable.map((r) => r.label);
  assert.ok(barcaLabels.includes('Competition / League'));
  assert.ok(barcaLabels.includes('Season & Kit Edition'));
  assert.ok(!barcaLabels.includes('Soleplate & Stud Geometry'));
  assert.equal(barca.variants.length, 2); // Standard + Custom Heat-Press variant

  const predatorLabels = predator.detailsTable.map((r) => r.label);
  assert.ok(predatorLabels.includes('Playing Surface'));
  assert.ok(predatorLabels.includes('Measured Weight'));
  assert.ok(predatorLabels.includes('Soleplate & Stud Geometry'));
  assert.ok(!predatorLabels.includes('Competition / League'));
});

test('dynamic product SEO metadata builds SERP-ready titles, descriptions, OG/Twitter images, and Product JSON-LD', () => {
  const barca = getCatalogProductById('jersey-barca-2627-home');
  const predator = getCatalogProductBySlug('adidas-predator-25-elite-fold-over-tongue-fg');
  assert.ok(barca && predator);

  const origin = 'https://sportcastle.com.kh';
  const barcaSeo = buildProductSeoMetadata(barca, origin, '/');
  assert.ok(barcaSeo.title.includes('FC Barcelona 2026/27 Home Jersey'));
  assert.ok(barcaSeo.title.includes('SPORT CASTLE'));
  assert.ok(barcaSeo.description.length >= 100 && barcaSeo.description.length <= 160);
  assert.equal(barcaSeo.ogType, 'product');
  assert.equal(
    barcaSeo.ogImage,
    `${origin}${barca.image}`,
  );
  assert.equal(barcaSeo.twitterImage, barcaSeo.ogImage);
  assert.equal(barcaSeo.canonicalUrl, `${origin}/#/products/${barca.slug}`);
  assert.equal(barcaSeo.productMeta?.priceAmount, '98.00');
  assert.equal(barcaSeo.productMeta?.priceCurrency, 'USD');
  assert.equal(barcaSeo.productMeta?.availability, 'in stock');
  assert.equal(barcaSeo.productMeta?.retailerItemId, barca.sku);

  // Verify Schema.org Product JSON-LD structure
  assert.equal(barcaSeo.jsonLd?.['@type'], 'Product');
  assert.equal(barcaSeo.jsonLd?.sku, barca.sku);
  assert.deepEqual(barcaSeo.jsonLd?.image, [barcaSeo.ogImage]);

  // Verify boot product gets distinct metadata & absolute URL resolution
  const predatorSeo = buildProductSeoMetadata(predator, origin, '/');
  assert.notEqual(predatorSeo.title, barcaSeo.title);
  assert.notEqual(predatorSeo.ogImage, barcaSeo.ogImage);
  assert.ok(predatorSeo.description.includes('$255.00'));

  // Verify URL resolution, clean word-boundary truncation, and default storefront restore
  assert.equal(
    resolveAbsoluteUrl('https://cdn.example.com/img.jpg', origin),
    'https://cdn.example.com/img.jpg',
  );
  assert.equal(
    resolveAbsoluteUrl('/src/assets/images/test.jpg', 'https://sportcastle.com.kh/'),
    'https://sportcastle.com.kh/src/assets/images/test.jpg',
  );
  const clipped = truncateMetaText(
    'Authentic performance football boots engineered for Phnom Penh artificial turf pitches with ultra-responsive cushioning and lockdown traction.',
    80,
  );
  assert.ok(clipped.length <= 80);
  assert.ok(clipped.endsWith('…'));

  const defaults = buildDefaultSiteSeo(origin, '/');
  assert.equal(defaults.ogType, 'website');
  assert.equal(defaults.productMeta, undefined);
  assert.equal(defaults.jsonLd, undefined);
});

test('WishlistStore localStorage serialization, sanitization, guest/member scoping, and merge preserve guest items', () => {
  const validIds = new Set(MOCK_STORE_CATALOG.map((p) => p.id));

  // Guest vs member storage keys remain cleanly isolated
  assert.equal(getWishlistStorageKey(false), GUEST_WISHLIST_STORAGE_KEY);
  assert.equal(getWishlistStorageKey(true), MEMBER_WISHLIST_STORAGE_KEY);

  // Deduplicates and removes stale/invalid IDs cleanly
  const sanitized = sanitizeWishlistIds(
    [
      'jersey-barca-2627-home',
      'jersey-barca-2627-home',
      'non-existent-sku',
      42,
      '  boot-predator-25-elite-ft  ',
    ],
    validIds,
  );
  assert.deepEqual(sanitized, [
    'jersey-barca-2627-home',
    'boot-predator-25-elite-ft',
  ]);

  // Round-trip v2 guest payload serialization & parsing
  const serialized = serializeWishlistStoragePayload(
    ['jersey-madrid-2627-home', 'boot-mizuno-alpha-japan'],
    false,
    '2026-11-20T03:15:00.000Z',
  );
  const parsed = parseWishlistStoragePayload(serialized, [], validIds);
  assert.equal(parsed.found, true);
  assert.equal(parsed.updatedAt, '2026-11-20T03:15:00.000Z');
  assert.deepEqual(parsed.ids, [
    'jersey-madrid-2627-home',
    'boot-mizuno-alpha-japan',
  ]);

  // Explicitly emptied guest wishlist (`items: []`) does NOT revert to fallback seed
  const emptySerialized = serializeWishlistStoragePayload([], false);
  const parsedEmpty = parseWishlistStoragePayload(
    emptySerialized,
    ['jersey-barca-2627-home'],
    validIds,
  );
  assert.equal(parsedEmpty.found, true);
  assert.deepEqual(parsedEmpty.ids, []);

  // Legacy plain JSON string[] format remains backward-compatible
  const legacyParsed = parseWishlistStoragePayload(
    JSON.stringify(['jersey-psg-2627-third-ucl', 'bad-id']),
    [],
    validIds,
  );
  assert.equal(legacyParsed.found, true);
  assert.deepEqual(legacyParsed.ids, ['jersey-psg-2627-third-ucl']);

  // Malformed JSON falls back safely without throwing
  const corrupt = parseWishlistStoragePayload(
    '{broken-json',
    ['jersey-barca-2627-home'],
    validIds,
  );
  assert.equal(corrupt.found, false);
  assert.deepEqual(corrupt.ids, ['jersey-barca-2627-home']);

  // Merging guest items into member account places newly saved guest items first without duplicates
  const merged = mergeGuestWishlistIntoMember(
    ['jersey-psg-2627-third-ucl', 'jersey-barca-2627-home'],
    ['jersey-barca-2627-home', 'boot-predator-25-elite-ft'],
    validIds,
  );
  assert.deepEqual(merged, [
    'jersey-psg-2627-third-ucl',
    'jersey-barca-2627-home',
    'boot-predator-25-elite-ft',
  ]);
});

test('persistent URL-based collection sorting parses query params, builds clean hashes, and dynamically orders catalog.ts products', () => {
  // 1. Query param parsing (canonical values, aliases, invalid fallback)
  assert.equal(parseSortParam('price-asc'), 'price-asc');
  assert.equal(parseSortParam('price_desc'), 'price-desc');
  assert.equal(parseSortParam('top-rated'), 'rating-desc');
  assert.equal(parseSortParam('rating-desc'), 'rating-desc');
  assert.equal(parseSortParam('lightest'), 'weight-asc');
  assert.equal(parseSortParam('unknown-sort'), 'featured');
  assert.equal(parseSortParam(null), 'featured');

  // 2. Hash route parsing and serialization round-trip with ?sort=
  const sortedJerseysRoute = parseHashToRoute(
    '#/collections/jerseys-kits?sort=price-asc',
  );
  assert.deepEqual(sortedJerseysRoute, {
    page: 'shop',
    collectionSlug: 'jerseys-kits',
    sort: 'price-asc',
  });
  assert.equal(
    routeToHash(sortedJerseysRoute),
    '#/collections/jerseys-kits?sort=price-asc',
  );

  const sortedBootsRoute = parseHashToRoute(
    '#/collections/football-boots?sort=rating-desc',
  );
  assert.deepEqual(sortedBootsRoute, {
    page: 'shop',
    collectionSlug: 'football-boots',
    sort: 'rating-desc',
  });
  assert.equal(
    routeToHash(sortedBootsRoute),
    '#/collections/football-boots?sort=rating-desc',
  );

  // Default 'featured' sort omits ?sort= from hash
  assert.deepEqual(parseHashToRoute('#/collections/all?sort=featured'), {
    page: 'shop',
    collectionSlug: 'all',
  });
  assert.equal(
    routeToHash({ page: 'shop', collectionSlug: 'all', sort: 'featured' }),
    '#/collections/all',
  );

  // 3. buildCollectionHashWithSort updates or strips ?sort= while preserving collection path
  assert.equal(
    buildCollectionHashWithSort('#/collections/jerseys-kits', 'price-asc'),
    '#/collections/jerseys-kits?sort=price-asc',
  );
  assert.equal(
    buildCollectionHashWithSort(
      '#/collections/jerseys-kits?sort=price-asc',
      'rating-desc',
    ),
    '#/collections/jerseys-kits?sort=rating-desc',
  );
  assert.equal(
    buildCollectionHashWithSort(
      '#/collections/jerseys-kits?sort=rating-desc',
      'featured',
    ),
    '#/collections/jerseys-kits',
  );

  // 4. Dynamic sorting against MOCK_STORE_CATALOG (catalog.ts)
  const baseFilters: ProductFilters = {
    category: 'all',
    surfaces: [],
    brands: [],
    maxPrice: 300,
    branch: 'all',
    customizableOnly: false,
    league: 'all',
    uclOnly: false,
    searchQuery: '',
  };

  const asc = filterAndSortProducts(MOCK_STORE_CATALOG, baseFilters, 'price-asc');
  assert.equal(asc.length, MOCK_STORE_CATALOG.length);
  for (let i = 1; i < asc.length; i += 1) {
    assert.ok(asc[i - 1].price <= asc[i].price);
  }

  const desc = filterAndSortProducts(MOCK_STORE_CATALOG, baseFilters, 'price-desc');
  for (let i = 1; i < desc.length; i += 1) {
    assert.ok(desc[i - 1].price >= desc[i].price);
  }

  const topRated = filterAndSortProducts(
    MOCK_STORE_CATALOG,
    baseFilters,
    'rating-desc',
  );
  for (let i = 1; i < topRated.length; i += 1) {
    assert.ok(topRated[i - 1].rating >= topRated[i].rating);
  }

  const lightestBoots = filterAndSortProducts(
    MOCK_STORE_CATALOG,
    { ...baseFilters, category: 'boots' },
    'weight-asc',
  );
  assert.ok(lightestBoots.length >= 10);
  for (let i = 1; i < lightestBoots.length; i += 1) {
    assert.ok(
      (lightestBoots[i - 1].weightGrams ?? 999) <=
        (lightestBoots[i].weightGrams ?? 999),
    );
  }
});

test('catalog.ts builds normalized product tags and ranks You May Also Like recommendations by category and tags', () => {
  // Every catalog item has deduplicated, non-empty normalized tags containing its category
  for (const item of MOCK_STORE_CATALOG) {
    assert.ok(item.tags.length >= 2, `Expected tags for ${item.id}`);
    assert.equal(new Set(item.tags).size, item.tags.length);
    assert.ok(item.tags.includes(item.category));
  }

  assert.equal(formatTagLabel('ucl'), 'UCL');
  assert.equal(formatTagLabel('la-liga'), 'La Liga');
  assert.equal(formatTagLabel('lightweight-speed'), 'Speed');
  assert.equal(formatTagLabel('fc-barcelona'), 'FC Barcelona');

  // 1. UCL La Liga Jersey -> excludes itself, prioritizes same-club/same-league UCL jerseys
  const barcaHome = getCatalogProductById('jersey-barca-2627-home')!;
  const barcaRecs = getRecommendedProducts(barcaHome, MOCK_STORE_CATALOG, 8);
  assert.equal(barcaRecs.length, 8);
  assert.ok(barcaRecs.every((r) => r.product.id !== barcaHome.id));
  assert.ok(barcaRecs.slice(0, 2).every((r) => r.product.club === 'FC Barcelona'));
  assert.ok(barcaRecs.every((r) => r.sameCategory && r.matchedTags.length > 0));
  for (let i = 1; i < barcaRecs.length; i += 1) {
    assert.ok(barcaRecs[i - 1].score >= barcaRecs[i].score);
  }

  // 2. Studded AG Soccer Cleat -> prioritizes other boots (including AG & same brand), never self, and zero IC sneakers in boots catalog
  const allBoots = PRODUCTS.filter((p) => p.category === 'boots');
  assert.equal(allBoots.length, 15);
  assert.ok(
    allBoots.every((b) => b.surface !== 'IC'),
    'All footwear in boots category must be studded soccer boots (FG/AG/FG-AG/MG/TF), zero flat IC sneakers',
  );
  const vaporAg = getCatalogProductById('boot-nike-vapor-16-elite-ag')!;
  const bootRecs = getRecommendedProducts(vaporAg, MOCK_STORE_CATALOG, 8);
  assert.equal(bootRecs.length, 8);
  assert.ok(bootRecs.every((r) => r.product.id !== vaporAg.id));
  assert.ok(bootRecs.slice(0, 4).every((r) => r.product.category === 'boots'));
  assert.ok(
    bootRecs[0].matchedTags.includes('ag') ||
      bootRecs[0].matchedTags.includes('nike') ||
      bootRecs[0].matchedTags.includes('speed'),
  );

  // 3. Smaller category (F1 has 3 items total) -> ranks the other 2 F1 items first, then fills to limit with tag-related items
  const ferrariF1 = MOCK_STORE_CATALOG.find((p) => p.category === 'f1')!;
  const f1Recs = getRecommendedProducts(ferrariF1, MOCK_STORE_CATALOG, 8);
  assert.equal(f1Recs.length, 8);
  assert.equal(f1Recs[0].product.category, 'f1');
  assert.equal(f1Recs[1].product.category, 'f1');
  assert.ok(f1Recs.every((r) => r.product.id !== ferrariF1.id));
});

test('order tracking validates Order ID + email, builds 5-stage timelines, and deep-links /pages/track-order', () => {
  // 1. Validation rejects empty & malformed inputs
  const emptyErrs = validateTrackingLookup('', '');
  assert.ok(emptyErrs.orderId);
  assert.ok(emptyErrs.email);

  const badFormatErrs = validateTrackingLookup('12', 'not-an-email');
  assert.ok(badFormatErrs.orderId);
  assert.ok(badFormatErrs.email);

  assert.deepEqual(
    validateTrackingLookup('SC-8810', 'sokha.chan@phnompenhfc.kh'),
    {},
  );

  // 2. Built-in sample orders resolve with case-insensitive Order ID & email verification
  const pool = getBuiltInTrackableOrders();
  assert.ok(pool.length >= 3);

  const matched = resolveOrderTracking(
    'sc-8810',
    'SOKHA.CHAN@PHNOMPENHFC.KH',
    [SEEDED_SAMPLE_ORDER],
  );
  assert.equal(matched.error, null);
  assert.ok(matched.result);
  assert.equal(matched.result.order.id, 'SC-8810');
  assert.equal(matched.result.milestones.length, 5);
  assert.ok(
    matched.result.progressPercent >= 20 &&
      matched.result.progressPercent <= 100,
  );
  assert.ok(matched.result.milestones.some((s) => s.state === 'completed'));

  const wrongEmail = resolveOrderTracking(
    'SC-8810',
    'wrong@example.com',
    [SEEDED_SAMPLE_ORDER],
  );
  assert.equal(wrongEmail.result, null);
  assert.ok(wrongEmail.error?.includes('email'));

  const missingOrder = resolveOrderTracking(
    'SC-0000',
    'sokha.chan@phnompenhfc.kh',
    [SEEDED_SAMPLE_ORDER],
  );
  assert.equal(missingOrder.result, null);
  assert.ok(missingOrder.error?.includes('SC-0000'));

  // 3. Timeline reflects Delivered vs Heat-Press Printing statuses accurately
  const deliveredOrder = pool.find((o) => o.id === 'SC-7742');
  assert.ok(deliveredOrder);
  const deliveredSteps = buildShippingTimeline(deliveredOrder);
  assert.equal(deliveredSteps.length, 5);
  assert.ok(deliveredSteps.every((s) => s.state === 'completed'));

  // 4. Deep-link /pages/track-order?order=...&email=... parses and round-trips cleanly
  const trackHash =
    '#/pages/track-order?order=SC-8810&email=sokha.chan%40phnompenhfc.kh';
  const parsedTrack = parseHashToRoute(trackHash);
  assert.deepEqual(parsedTrack, {
    page: 'orders',
    orderId: 'SC-8810',
    email: 'sokha.chan@phnompenhfc.kh',
  });
  assert.equal(routeToHash(parsedTrack), trackHash);
});

test('Phnom Penh geolocation math calculates accurate branch distances and resolves Khans', () => {
  const sonthormuk = BRANCH_COORDINATES.sonthormuk;
  const zeroDist = calculateDistanceKm(sonthormuk, sonthormuk);
  assert.equal(zeroDist, 0);

  // BKK1 coordinate near Street 310 -> resolves to Khan Boeung Keng Kang (BKK)
  const bkkMatch = resolvePhnomPenhLocationFromCoords(11.5517, 104.9255);
  assert.equal(bkkMatch.khan, 'Khan Boeung Keng Kang (BKK)');
  assert.ok(bkkMatch.distanceKm > 0 && bkkMatch.distanceKm < 10);
  assert.ok(bkkMatch.nearestBranchName.length > 0);
  assert.ok(bkkMatch.landmarkHint.length > 0);

  // Sen Sok coordinate near AEON 2 -> resolves to Khan Sen Sok & Sen Sok branch
  const senSokMatch = resolvePhnomPenhLocationFromCoords(11.5998, 104.8842);
  assert.equal(senSokMatch.khan, 'Khan Sen Sok');
  assert.equal(senSokMatch.nearestBranchId, 'sensok');
});

test('minimalist skeleton helpers calculate balanced grid counts, reduced-motion timings, and deterministic transition keys', () => {
  // Balanced placeholder counts per column density
  assert.equal(getListingSkeletonCount(4, true, 12), 8);
  assert.equal(getListingSkeletonCount(3, false, 12), 6);
  assert.equal(getListingSkeletonCount(2, false, 12), 4);
  assert.equal(getListingSkeletonCount(4, false, 3), 3);
  assert.equal(getListingSkeletonCount(4, true), 8);

  // Respects reduced-motion timing cap
  assert.equal(resolveSkeletonDurationMs(false, 260), 260);
  assert.equal(resolveSkeletonDurationMs(true, 260), 120);
  assert.equal(resolveSkeletonDurationMs(true, 60), 60);

  // Transition keys change deterministically on filter/sort/page shifts
  const baseFilters: ProductFilters = {
    category: 'jerseys',
    surfaces: [],
    brands: ['Nike', 'Adidas'],
    maxPrice: 300,
    branch: 'all',
    customizableOnly: false,
    league: 'all',
    uclOnly: false,
    searchQuery: '',
  };

  const keyA = buildListingTransitionKey({
    collectionSlug: 'jerseys-kits',
    filters: baseFilters,
    selectedEdition: 'all',
    sortBy: 'featured',
    page: 1,
  });
  const keySameBrandsReordered = buildListingTransitionKey({
    collectionSlug: 'jerseys-kits',
    filters: { ...baseFilters, brands: ['Adidas', 'Nike'] },
    selectedEdition: 'all',
    sortBy: 'featured',
    page: 1,
  });
  const keySorted = buildListingTransitionKey({
    collectionSlug: 'jerseys-kits',
    filters: baseFilters,
    selectedEdition: 'all',
    sortBy: 'price-asc',
    page: 1,
  });

  assert.equal(keyA, keySameBrandsReordered);
  assert.notEqual(keyA, keySorted);
});

test('My Orders history helpers provide semantic status metadata, newest-first sorting, filtering, and trackable member orders', () => {
  const memberOrders = getInitialMemberOrders();
  assert.equal(memberOrders.length, 3);
  // Sorted newest first: SC-8942 (Nov 19) -> SC-8810 (Nov 18) -> SC-8615 (Nov 9)
  assert.deepEqual(
    memberOrders.map((o) => o.id),
    ['SC-8942', 'SC-8810', 'SC-8615'],
  );

  // Status metadata progression across all 4 OrderStatus values
  assert.equal(getOrderStatusMeta('Confirmed').stageStep, 1);
  assert.equal(getOrderStatusMeta('Heat-Press Printing').stageStep, 2);
  assert.equal(getOrderStatusMeta('Rider Dispatched').stageStep, 3);
  assert.equal(getOrderStatusMeta('Delivered').stageStep, 4);
  assert.equal(getOrderStatusMeta('Delivered').isActive, false);
  assert.equal(getOrderStatusMeta('Rider Dispatched').isActive, true);

  // Counts & summary calculations
  const counts = getOrderStatusCounts(memberOrders);
  assert.equal(counts.all, 3);
  assert.equal(counts.active, 2);
  assert.equal(counts.Confirmed, 0);
  assert.equal(counts['Heat-Press Printing'], 1);
  assert.equal(counts['Rider Dispatched'], 1);
  assert.equal(counts.Delivered, 1);

  const summary = getOrderHistorySummary(memberOrders);
  assert.equal(summary.totalOrders, 3);
  assert.equal(summary.activeOrders, 2);
  assert.equal(summary.deliveredOrders, 1);
  assert.equal(summary.totalItems, 4);
  assert.ok(summary.totalSpentUsd > 400);

  // Filtering & recent slice
  assert.equal(filterOrdersByStatus(memberOrders, 'all').length, 3);
  assert.equal(filterOrdersByStatus(memberOrders, 'active').length, 2);
  assert.equal(filterOrdersByStatus(memberOrders, 'Delivered').length, 1);
  assert.equal(filterOrdersByStatus(memberOrders, 'Confirmed').length, 0);
  assert.deepEqual(
    getRecentOrders(memberOrders, 2).map((o) => o.id),
    ['SC-8942', 'SC-8810'],
  );

  // Editorial date & fulfillment formatting
  assert.equal(formatOrderDate('2026-11-18T14:20:00.000Z'), 'Nov 18, 2026');
  assert.ok(formatOrderFulfillmentLabel(memberOrders[0]).includes('Branch Pickup'));
  assert.ok(formatOrderFulfillmentLabel(memberOrders[1]).includes('Express Delivery'));

  // Every seeded member order resolves cleanly on /pages/track-order
  for (const order of memberOrders) {
    const tracked = resolveOrderTracking(
      order.id,
      order.customer.email ?? 'sokha.chan@phnompenhfc.kh',
      memberOrders,
    );
    assert.equal(tracked.error, null, `Expected ${order.id} to resolve cleanly`);
    assert.equal(tracked.result?.order.id, order.id);
  }
});

test('wishlist alert engine detects price drops and back-in-stock restocks, respects muted items, and deduplicates alerts', () => {
  const baseById = new Map(MOCK_STORE_CATALOG.map((p) => [p.id, p]));
  const wishlistIds = ['boot-predator-25-elite-ft', 'jersey-barca-2627-home'];

  // 1. Capture baseline snapshots for saved items
  const snapshots = syncWishlistSnapshots(wishlistIds, {}, baseById, '2026-11-20T07:00:00.000Z');
  assert.equal(Object.keys(snapshots).length, 2);
  assert.equal(snapshots['boot-predator-25-elite-ft'].alertsEnabled, true);
  assert.equal(snapshots['jersey-barca-2627-home'].price, 98);

  // 2. Resolve live updates (1 branch restock on Predator + 1 price drop on Barca)
  const { nextOverrides, updatedProductIds } = resolveWishlistCatalogUpdates(
    wishlistIds,
    snapshots,
    baseById,
    {},
    { maxUpdates: 2, nowIso: '2026-11-20T07:15:00.000Z' },
  );
  assert.equal(updatedProductIds.length, 2);

  // 3. Apply catalog overrides and verify live catalog prices & stock update
  const liveCatalog = applyCatalogOverrides(MOCK_STORE_CATALOG, nextOverrides);
  const liveById = new Map(liveCatalog.map((p) => [p.id, p]));
  const updatedPredator = liveById.get('boot-predator-25-elite-ft')!;
  const updatedBarca = liveById.get('jersey-barca-2627-home')!;
  assert.equal(updatedPredator.branchStock.chomkadong, 'In Stock');
  assert.ok(updatedBarca.price < 98);
  assert.equal(updatedBarca.originalPrice, 98);

  // 4. Detect both back-in-stock and price-drop alerts
  const alerts = detectWishlistAlerts(wishlistIds, snapshots, liveById, new Set());
  assert.equal(alerts.length, 2);
  const restockAlert = alerts.find((a) => a.type === 'back-in-stock');
  const priceDropAlert = alerts.find((a) => a.type === 'price-drop');
  assert.ok(restockAlert && priceDropAlert);
  assert.equal(restockAlert.productId, 'boot-predator-25-elite-ft');
  assert.ok(restockAlert.restockedBranches?.includes('chomkadong'));
  assert.equal(priceDropAlert.productId, 'jersey-barca-2627-home');
  assert.ok((priceDropAlert.savingsUsd ?? 0) > 0);
  assert.ok((priceDropAlert.discountPercent ?? 0) >= 10);

  // 5. Deduplication & snapshot advancement prevent duplicate alerts
  const delivered = new Set(alerts.map((a) => a.dedupeKey));
  assert.equal(
    detectWishlistAlerts(wishlistIds, snapshots, liveById, delivered).length,
    0,
  );
  const advanced = advanceSnapshotsAfterAlerts(snapshots, alerts, liveById);
  assert.equal(
    detectWishlistAlerts(wishlistIds, advanced, liveById, new Set()).length,
    0,
  );

  // 5b. Re-checking catalog updates does not stack another discount on already-updated items
  const secondCheck = resolveWishlistCatalogUpdates(
    wishlistIds,
    advanced,
    liveById,
    nextOverrides,
    { maxUpdates: 2, nowIso: '2026-11-20T07:30:00.000Z' },
  );
  assert.equal(secondCheck.updatedProductIds.length, 0);

  // 6. Muted items (`alertsEnabled: false`) emit zero notifications even when price drops
  const mutedSnapshots = {
    ...snapshots,
    'jersey-barca-2627-home': {
      ...snapshots['jersey-barca-2627-home'],
      alertsEnabled: false,
    },
  };
  const unmutedOnly = detectWishlistAlerts(
    ['jersey-barca-2627-home'],
    mutedSnapshots,
    liveById,
    new Set(),
  );
  assert.equal(unmutedOnly.length, 0);
});

test('order tracking QR generator builds scannable ISO QR matrices and mobile deep-link URLs that round-trip cleanly', () => {
  assert.equal(normalizeOrderIdForQr(' #sc-9024 '), 'SC-9024');

  const mobileUrl = buildMobileTrackingUrl(
    'https://sportcastle.com.kh',
    '/',
    '#sc-9024',
    'vireak.chann@bkkfc.kh',
  );
  assert.equal(
    mobileUrl,
    'https://sportcastle.com.kh/#/pages/track-order?order=SC-9024&email=vireak.chann%40bkkfc.kh',
  );

  // Hash encoded in QR round-trips directly into TrackOrderPage route state
  const hashPart = mobileUrl.slice(mobileUrl.indexOf('#'));
  const parsedRoute = parseHashToRoute(hashPart);
  assert.deepEqual(parsedRoute, {
    page: 'orders',
    orderId: 'SC-9024',
    email: 'vireak.chann@bkkfc.kh',
  });

  // Order-ID-only payload mode
  const idOnlyPayload = buildOrderQrPayload('order-id', {
    origin: 'https://sportcastle.com.kh',
    pathname: '/',
    orderId: '#sc-8810',
    email: 'sokha.chan@phnompenhfc.kh',
  });
  assert.equal(idOnlyPayload, 'SC-8810');

  // Genuine QR matrix generation with valid finder patterns at top-left, top-right, bottom-left
  const qr = generateOrderQrData(mobileUrl, 3);
  assert.ok(qr.size >= 21, 'QR code matrix must be at least Version 1 (21x21)');
  assert.equal(qr.viewBoxSize, qr.size + 6);
  assert.equal(qr.modules.length, qr.size);
  assert.equal(qr.modules[0][0], true, 'Top-left finder corner must be dark');
  assert.equal(qr.modules[0][qr.size - 1], true, 'Top-right finder corner must be dark');
  assert.equal(qr.modules[qr.size - 1][0], true, 'Bottom-left finder corner must be dark');
  assert.ok(qr.svgPath.startsWith('M') && qr.svgPath.includes('h1v1h-1z'));

  // Clean PNG download filename
  assert.equal(sanitizeQrDownloadFilename('#sc-9024', 'png'), 'sport-castle-track-SC-9024.png');
});

test('kit card hover-to-back state machine and club back-print defaults handle desktop hover, manual override, and touch toggle', () => {
  // Non-kit products never show back view
  assert.equal(
    resolveKitCardShowingBack({ hasBackView: false, isHovering: true, pinnedView: 'auto' }),
    false,
  );

  // Hovering a jersey card automatically reveals back view; leaving returns to front
  assert.equal(
    resolveKitCardShowingBack({ hasBackView: true, isHovering: false, pinnedView: 'auto' }),
    false,
  );
  assert.equal(
    resolveKitCardShowingBack({ hasBackView: true, isHovering: true, pinnedView: 'auto' }),
    true,
  );

  // Clicking manual toggle while hovering pins front view so user can re-inspect front
  const pinnedFront = getNextKitCardPinnedView({
    currentlyShowingBack: true,
    isHovering: true,
  });
  assert.equal(pinnedFront, 'front');
  assert.equal(
    resolveKitCardShowingBack({ hasBackView: true, isHovering: true, pinnedView: pinnedFront }),
    false,
  );

  // Touch device (not hovering): tapping toggle switches to back, tapping again returns to auto/front
  const touchBack = getNextKitCardPinnedView({
    currentlyShowingBack: false,
    isHovering: false,
  });
  assert.equal(touchBack, 'back');
  assert.equal(
    resolveKitCardShowingBack({ hasBackView: true, isHovering: false, pinnedView: touchBack }),
    true,
  );
  assert.equal(
    getNextKitCardPinnedView({ currentlyShowingBack: true, isHovering: false }),
    'auto',
  );

  // Authentic club/national/F1 back print defaults
  const cambodia = PRODUCTS.find((p) => p.club?.includes('Cambodia'))!;
  const cambodiaBack = getKitBackPrintDefaults(cambodia);
  assert.equal(cambodiaBack.playerName, 'CHANTHEA');
  assert.equal(cambodiaBack.squadNumber, '10');
  assert.equal(cambodiaBack.patch, 'aff');

  const barca = PRODUCTS.find((p) => p.id === 'jersey-barca-2627-home')!;
  const barcaBack = getKitBackPrintDefaults(barca);
  assert.equal(barcaBack.playerName, 'YAMAL');
  assert.equal(barcaBack.squadNumber, '10');
  assert.equal(barcaBack.patch, 'ucl');

  const ferrari = PRODUCTS.find((p) => p.category === 'f1' && /ferrari/i.test(p.name))!;
  const ferrariBack = getKitBackPrintDefaults(ferrari);
  assert.equal(ferrariBack.playerName, 'LECLERC');
  assert.equal(ferrariBack.squadNumber, '16');
  assert.equal(ferrariBack.fontStyle, 'motorsport-aero');
});

test('TrackOrderPage brief summary builder formats order date, total amount, and delivery or branch pickup address', () => {
  const pool = getBuiltInTrackableOrders();
  const deliveryOrder = pool.find((o) => o.id === 'SC-9024')!;
  const pickupOrder = pool.find((o) => o.id === 'SC-7742')!;

  // 1. Delivery order summary
  const deliverySummary = buildOrderBriefSummary(deliveryOrder);
  assert.equal(deliverySummary.orderId, 'SC-9024');
  assert.equal(deliverySummary.orderDateLabel, 'May 19, 2026');
  assert.ok(deliverySummary.orderTimeLabel.endsWith('ICT'));
  assert.equal(deliverySummary.totalUsd, deliveryOrder.totalUsd);
  assert.equal(deliverySummary.totalKhr, deliveryOrder.totalKhr);
  assert.equal(deliverySummary.itemCount, 2);
  assert.equal(deliverySummary.paymentLabel, 'ABA KHQR');
  assert.equal(deliverySummary.addressHeading, 'Delivery Address');
  assert.equal(deliverySummary.recipientName, 'Vireak Chann');
  assert.ok(deliverySummary.addressPrimary.includes('House 14, Street 306'));
  assert.ok(deliverySummary.addressSecondary.includes('Sangkat BKK1'));
  assert.ok(deliverySummary.addressSecondary.includes('Phnom Penh'));
  assert.ok(deliverySummary.reassuranceNote.toLowerCase().includes('courier'));

  // 2. Branch pickup order summary
  const pickupSummary = buildOrderBriefSummary(pickupOrder);
  assert.equal(pickupSummary.orderId, 'SC-7742');
  assert.equal(pickupSummary.orderDateLabel, 'May 14, 2026');
  assert.equal(pickupSummary.itemCount, 1);
  assert.equal(pickupSummary.paymentLabel, 'Wing / ACLEDA');
  assert.equal(pickupSummary.addressHeading, 'Pickup Branch Address');
  assert.ok(pickupSummary.addressPrimary.includes('Sen Sok'));
  assert.ok(pickupSummary.addressSecondary.length > 0);
  assert.ok(pickupSummary.reassuranceNote.toLowerCase().includes('collected'));

  // 3. Fallback safety for malformed date or missing street address
  const fallbackSummary = buildOrderBriefSummary({
    ...deliveryOrder,
    createdAt: 'not-a-date',
    customer: {
      ...deliveryOrder.customer,
      streetAddress: '',
      sangkat: '',
    },
  });
  assert.equal(fallbackSummary.orderDateLabel, 'Recent Order');
  assert.equal(fallbackSummary.addressPrimary, 'Khan Boeung Keng Kang (BKK)');
  assert.equal(fallbackSummary.addressSecondary, 'Phnom Penh');
});

test('expanded sub-category filters cover National Team regions, Season Year-Year, Retro, Limited Edition, F1 Jerseys/Jackets, Messi Boots, Balls, EU sizing, and Best Sellers', () => {
  const baseFilters: ProductFilters = {
    category: 'all',
    surfaces: [],
    brands: [],
    maxPrice: 300,
    branch: 'all',
    customizableOnly: false,
    league: 'all',
    nationalRegion: 'all',
    season: 'all',
    uclOnly: false,
    retroOnly: false,
    limitedEditionOnly: false,
    bestSellersOnly: false,
    newArrivalsOnly: false,
    f1GarmentType: 'all',
    f1Team: 'all',
    ballSubcategory: 'all',
    essentialsSubcategory: 'all',
    signatureBootOnly: false,
    searchQuery: '',
  };

  // 1. National Teams grouped by region (Europe, South America, Asia / ASEAN)
  const europeNations = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, category: 'jerseys', nationalRegion: 'Europe' },
    'featured',
  );
  assert.equal(europeNations.length, 8);
  for (const country of [
    'France National Team',
    'Spain National Team',
    'Germany National Team',
    'Italy National Team',
  ]) {
    const kits = europeNations.filter((p) => p.club === country);
    assert.ok(kits.length >= 2, `Expected at least 2 kits for ${country}`);
  }

  const southAmericaNations = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, category: 'jerseys', nationalRegion: 'South America' },
    'featured',
  );
  assert.ok(southAmericaNations.length >= 5);
  assert.ok(southAmericaNations.some((p) => p.club === 'Argentina National Team'));
  assert.ok(southAmericaNations.some((p) => p.club === 'Brazil National Team'));

  const asiaAseanNations = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, category: 'jerseys', nationalRegion: 'Asia / ASEAN' },
    'featured',
  );
  assert.equal(asiaAseanNations.length, 6);
  assert.ok(asiaAseanNations.some((p) => p.club === 'Japan National Team'));
  assert.ok(asiaAseanNations.some((p) => p.club === 'South Korea National Team'));
  assert.ok(asiaAseanNations.some((p) => p.club?.includes('Cambodia')));

  // 2. Season Year-Year, Retro Archive & Limited Edition
  const season2627 = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, season: '2026/27' },
    'featured',
  );
  assert.ok(season2627.length >= 20); // national team kits use the tournament year (2026)
  assert.ok(season2627.every((p) => p.season === '2026/27'));

  const retroKits = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, retroOnly: true },
    'featured',
  );
  assert.ok(retroKits.length >= 2); // the 2026/27 Barça third kit is no longer marked retro
  assert.ok(retroKits.some((p) => p.id === 'jersey-barca-1999-retro'));
  assert.ok(retroKits.some((p) => p.id === 'jersey-brazil-2002-retro'));

  const limitedItems = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, limitedEditionOnly: true },
    'featured',
  );
  assert.ok(limitedItems.length >= 5);
  assert.ok(limitedItems.some((p) => p.id === 'boot-adidas-f50-messi-fg'));

  // 3. F1 Motorsport: Every team has at least 2 distinct jerseys + 1 official Paddock Jacket
  for (const team of F1_TEAMS) {
    const teamJerseys = filterAndSortProducts(
      PRODUCTS,
      { ...baseFilters, category: 'f1', f1Team: team, f1GarmentType: 'jersey' },
      'featured',
    );
    const teamJackets = filterAndSortProducts(
      PRODUCTS,
      { ...baseFilters, category: 'f1', f1Team: team, f1GarmentType: 'jacket' },
      'featured',
    );
    assert.ok(teamJerseys.length >= 2, `Expected >=2 F1 jerseys for ${team}`);
    assert.equal(teamJackets.length, 1, `Expected 1 F1 jacket for ${team}`);
  }

  // 4. Boots Messi Signature Edition & Official Balls sub-categories
  const messiBoots = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, category: 'boots', signatureBootOnly: true },
    'featured',
  );
  assert.equal(messiBoots.length, 1);
  assert.equal(messiBoots[0].id, 'boot-adidas-f50-messi-fg');

  const leagueBalls = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, category: 'balls', ballSubcategory: 'league' },
    'featured',
  );
  assert.ok(leagueBalls.some((b) => b.id === 'ball-adidas-ucl-2627-pro'));
  assert.ok(leagueBalls.some((b) => b.id === 'ball-puma-orbita-laliga-2627'));

  const futsalBalls = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, category: 'balls', ballSubcategory: 'futsal' },
    'featured',
  );
  assert.ok(futsalBalls.length >= 1);

  // 5. Best Sellers & New Arrivals + European sizing helper
  const bestSellers = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, bestSellersOnly: true },
    'best-sellers',
  );
  assert.ok(bestSellers.length >= 8);
  assert.ok(bestSellers.every((p) => p.isBestSeller === true));

  const newArrivals = filterAndSortProducts(
    PRODUCTS,
    { ...baseFilters, newArrivalsOnly: true },
    'newest',
  );
  assert.ok(newArrivals.length >= 12);

  assert.equal(formatJerseySizeWithEu('S'), 'S (EU 46)');
  assert.equal(formatJerseySizeWithEu('M'), 'M (EU 48–50)');
  assert.equal(formatJerseySizeWithEu('L'), 'L (EU 52–54)');
  assert.equal(formatJerseySizeWithEu('XL'), 'XL (EU 56)');
  assert.equal(formatJerseySizeWithEu('XXL'), 'XXL (EU 58)');
  assert.equal(formatJerseySizeWithEu('EU 42'), 'EU 42');
});

test('buildOrderTransitTimeline dynamically maps all 4 order statuses, fulfillment modes, custom print labels, and invalid-date fallbacks', () => {
  const memberOrders = getInitialMemberOrders();
  const [heatPressPickup, dispatchedDelivery, deliveredDelivery] = memberOrders;

  // 1. Heat-Press Printing + Branch Pickup + Custom Print (#SC-8942)
  const heatTimeline = buildOrderTransitTimeline(heatPressPickup);
  assert.equal(heatTimeline.stageStep, 2);
  assert.equal(heatTimeline.progressPercent, 50);
  assert.equal(heatTimeline.activeStepIndex, 1);
  assert.equal(heatTimeline.completedCount, 1);
  assert.equal(heatTimeline.isDelivered, false);
  assert.equal(heatTimeline.hasCustomPrint, true);
  assert.equal(heatTimeline.fulfillmentType, 'pickup');
  assert.deepEqual(
    heatTimeline.steps.map((s) => s.state),
    ['completed', 'current', 'upcoming', 'upcoming'],
  );
  assert.deepEqual(
    heatTimeline.steps.map((s) => s.connectorAfterFilled),
    [true, false, false, false],
  );
  assert.equal(heatTimeline.steps[1].label, 'Heat-Press Lab');
  assert.equal(heatTimeline.steps[2].label, 'Ready for Pickup');
  assert.equal(heatTimeline.steps[3].label, 'Collected');
  assert.ok(heatTimeline.headline.includes('YAMAL #10'));
  assert.ok(heatTimeline.etaLabel.startsWith('Est. Ready · '));

  // 2. Rider Dispatched + Express Delivery (#SC-8810)
  const dispatchedTimeline = buildOrderTransitTimeline(dispatchedDelivery);
  assert.equal(dispatchedTimeline.stageStep, 3);
  assert.equal(dispatchedTimeline.activeStepIndex, 2);
  assert.equal(dispatchedTimeline.completedCount, 2);
  assert.deepEqual(
    dispatchedTimeline.steps.map((s) => s.state),
    ['completed', 'completed', 'current', 'upcoming'],
  );
  assert.deepEqual(
    dispatchedTimeline.steps.map((s) => s.connectorAfterFilled),
    [true, true, false, false],
  );
  assert.equal(dispatchedTimeline.steps[2].label, 'Rider Dispatched');
  assert.equal(dispatchedTimeline.steps[3].label, 'Delivered');
  assert.ok(dispatchedTimeline.headline.includes('Express rider en route'));
  assert.ok(dispatchedTimeline.etaLabel.startsWith('Est. Arrival · '));

  // 3. Delivered + Non-custom boot order (#SC-8615) -> all 4 steps completed
  const deliveredTimeline = buildOrderTransitTimeline(deliveredDelivery);
  assert.equal(deliveredTimeline.stageStep, 4);
  assert.equal(deliveredTimeline.progressPercent, 100);
  assert.equal(deliveredTimeline.isDelivered, true);
  assert.equal(deliveredTimeline.completedCount, 4);
  assert.equal(deliveredTimeline.hasCustomPrint, false);
  assert.equal(deliveredTimeline.steps[1].label, 'Studio QC & Pack');
  assert.deepEqual(
    deliveredTimeline.steps.map((s) => s.state),
    ['completed', 'completed', 'completed', 'completed'],
  );
  assert.deepEqual(
    deliveredTimeline.steps.map((s) => s.connectorAfterFilled),
    [true, true, true, false],
  );
  assert.ok(deliveredTimeline.etaLabel.startsWith('Completed · '));

  // 4. Confirmed status + malformed createdAt fallback safety
  const confirmedFallback = buildOrderTransitTimeline({
    ...deliveredDelivery,
    id: 'SC-9001',
    status: 'Confirmed',
    createdAt: 'not-a-valid-date',
  });
  assert.equal(confirmedFallback.stageStep, 1);
  assert.equal(confirmedFallback.completedCount, 0);
  assert.deepEqual(
    confirmedFallback.steps.map((s) => s.state),
    ['current', 'upcoming', 'upcoming', 'upcoming'],
  );
  assert.equal(confirmedFallback.steps[0].timestampLabel, 'In Progress');
  assert.equal(confirmedFallback.steps[1].timestampLabel, 'Scheduled');
});

test('Store Pickup availability engine computes location-specific ready times across all 3 physical branches', () => {
  // Format helpers
  assert.equal(formatPickupDuration(25), '~25 mins');
  assert.equal(formatPickupDuration(60), '~1 hr');
  assert.equal(formatPickupDuration(110), '~1 hr 50 mins');
  assert.equal(formatIctClockTime(14 * 60 + 5), '2:05 PM ICT');
  assert.equal(formatIctClockTime(9 * 60 + 0), '9:00 AM ICT');

  // Use a deterministic Phnom Penh midday timestamp: 2026-11-20T06:00:00Z === 13:00 ICT (1:00 PM ICT)
  const middayIct = new Date('2026-11-20T06:00:00.000Z');
  const barcaHome = PRODUCTS.find((p) => p.id === 'jersey-barca-2627-home')!;
  const predatorBoot = PRODUCTS.find((p) => p.id === 'boot-predator-25-elite-ft')!;

  const plainCart: CartItem[] = [
    {
      lineId: 'plain-barca',
      productId: barcaHome.id,
      slug: barcaHome.slug,
      name: barcaHome.name,
      brand: barcaHome.brand,
      category: barcaHome.category,
      colorway: barcaHome.colorway,
      image: barcaHome.image,
      size: 'M',
      basePrice: barcaHome.price,
      unitPrice: barcaHome.price,
      quantity: 1,
    },
  ];

  const estimates = buildAllBranchPickupEstimates(plainCart, PRODUCTS, middayIct);
  assert.equal(estimates.length, 3);
  assert.deepEqual(
    estimates.map((e) => e.branchId),
    ['sonthormuk', 'sensok', 'chomkadong'],
  );

  // Sonthormuk Flagship is fastest for in-stock plain order (25m -> 1:25 PM ICT)
  const sonthormuk = estimates[0];
  const sensok = estimates[1];
  const chomkadong = estimates[2];
  assert.equal(sonthormuk.isRecommendedFastest, true);
  assert.equal(sonthormuk.estimatedMinutes, 25);
  assert.equal(sonthormuk.readyWindowLabel, 'Today by 1:25 PM ICT');
  assert.equal(sensok.estimatedMinutes, 35);
  assert.equal(sensok.readyWindowLabel, 'Today by 1:35 PM ICT');
  assert.ok(chomkadong.estimatedMinutes > sensok.estimatedMinutes);

  // Adding custom heat-press increases prep time differently per branch
  const printedCart: CartItem[] = [
    {
      ...plainCart[0],
      customPrint: {
        enabled: true,
        playerName: 'YAMAL',
        squadNumber: '10',
        patch: 'ucl',
      },
    },
  ];
  const printedEstimates = buildAllBranchPickupEstimates(printedCart, PRODUCTS, middayIct);
  assert.equal(printedEstimates[0].estimatedMinutes, 40); // 25 + 15 in-house lab
  assert.equal(printedEstimates[1].estimatedMinutes, 60); // 35 + 25 Sen Sok queue
  assert.ok(printedEstimates[2].estimatedMinutes >= 120); // Chomkadong lab + south shuttle
  assert.equal(printedEstimates[0].hasCustomPrint, true);

  // Out-of-stock item at a specific branch triggers Flagship transfer status & extra transfer time
  const outOfStockCatalog = PRODUCTS.map((p) =>
    p.id === predatorBoot.id
      ? {
          ...p,
          branchStock: {
            sonthormuk: 'In Stock' as const,
            sensok: 'Limited Stock' as const,
            chomkadong: 'Out of Stock' as const,
          },
        }
      : p,
  );
  const bootCart: CartItem[] = [
    {
      lineId: 'boot-1',
      productId: predatorBoot.id,
      slug: predatorBoot.slug,
      name: predatorBoot.name,
      brand: predatorBoot.brand,
      category: predatorBoot.category,
      colorway: predatorBoot.colorway,
      image: predatorBoot.image,
      size: 'EU 42',
      basePrice: predatorBoot.price,
      unitPrice: predatorBoot.price,
      quantity: 1,
    },
  ];
  const chomBranch = estimates[2].branch;
  const transferEst = calculateBranchPickupEstimate(
    chomBranch,
    bootCart,
    outOfStockCatalog,
    middayIct,
  );
  assert.equal(transferEst.availabilityStatus, 'branch-transfer');
  assert.equal(transferEst.transferCount, 1);
  assert.ok(transferEst.stockSummaryLabel.includes('Flagship HQ'));
  assert.equal(transferEst.estimatedMinutes, 45 + 95);

  // After closing hours (21:00 ICT === 14:00Z) rolls over to Tomorrow morning opening window
  const lateNightIct = new Date('2026-11-20T14:00:00.000Z');
  const afterHours = buildAllBranchPickupEstimates(plainCart, PRODUCTS, lateNightIct);
  assert.equal(afterHours[0].isOpenNow, false);
  assert.ok(afterHours[0].readyWindowLabel.startsWith('Tomorrow by '));
  assert.ok(afterHours[0].readyHeadline.includes('Opens 8:30 AM'));
});

test('Pro Member loyalty tier engine calculates Bronze, Silver, Gold, and Pro milestone badges and order contributions', () => {
  assert.equal(LOYALTY_TIERS.length, 4);
  assert.deepEqual(
    LOYALTY_TIERS.map((t) => [t.badgeLabel, t.minSpendUsd, t.milestonePct]),
    [
      ['Bronze', BRONZE_SPEND_THRESHOLD, 0],
      ['Silver', SILVER_SPEND_THRESHOLD, 30],
      ['Gold', GOLD_SPEND_THRESHOLD, 60],
      ['Pro', PRO_MEMBER_SPEND_THRESHOLD, 100],
    ],
  );
  assert.equal(PRO_MEMBER_POINTS_THRESHOLD, 5000);

  // 1. Empty purchase history -> Bronze Member at 0%, 1/4 milestones reached
  const empty = calculateProMemberProgress([]);
  assert.equal(empty.orderCount, 0);
  assert.equal(empty.totalSpentUsd, 0);
  assert.equal(empty.points, 0);
  assert.equal(empty.currentTier.name, 'Bronze Member');
  assert.equal(empty.nextTier?.name, 'Silver Member');
  assert.equal(empty.achievedMilestoneCount, 1);
  assert.equal(empty.totalMilestoneCount, 4);
  assert.equal(empty.reachedMilestones.length, 1);
  assert.equal(empty.reachedMilestones[0].id, 'bronze');
  assert.equal(empty.isProMember, false);
  assert.equal(empty.progressToProPct, 0);
  assert.equal(empty.amountRemainingToProUsd, 500);
  assert.equal(empty.pointsRemainingToPro, 5000);
  assert.deepEqual(
    empty.milestones.map((m) => m.reached),
    [true, false, false, false],
  );
  assert.equal(empty.milestones[1].remainingUsd, 150);

  // 2. Silver interval ($180) -> Silver Member at 36%, 2/4 milestones reached (Bronze + Silver 10% discount)
  const silver = calculateProMemberProgress([
    { ...SEEDED_SAMPLE_ORDER, id: 'SC-SILVER', totalUsd: 180 },
  ]);
  assert.equal(silver.currentTier.name, 'Silver Member');
  assert.equal(silver.nextTier?.name, 'Gold Member');
  assert.equal(silver.achievedMilestoneCount, 2);
  assert.deepEqual(
    silver.reachedMilestones.map((m) => m.id),
    ['bronze', 'silver'],
  );
  assert.equal(silver.reachedMilestones[1].headlinePerk, '10% Member Discount');
  assert.equal(silver.progressToProPct, 36);
  assert.deepEqual(
    silver.milestones.map((m) => m.reached),
    [true, true, false, false],
  );
  assert.equal(silver.milestones[2].remainingUsd, 120);

  // 3. Default seeded Phnom Penh member history ($111 + $71.10 + $255 = $437.10) -> Gold Member, 87% toward Pro Member (3/4 milestones)
  const memberOrders = getInitialMemberOrders();
  const seeded = calculateProMemberProgress(memberOrders);
  assert.equal(seeded.orderCount, 3);
  assert.equal(seeded.totalSpentUsd, 437.1);
  assert.equal(seeded.points, 4371);
  assert.equal(seeded.currentTier.name, 'Gold Member');
  assert.equal(seeded.nextTier?.name, 'Pro Member');
  assert.equal(seeded.achievedMilestoneCount, 3);
  assert.deepEqual(
    seeded.reachedMilestones.map((m) => [m.id, m.headlinePerk]),
    [
      ['bronze', 'Saved Fit Profile & Live Tracking'],
      ['silver', '10% Member Discount'],
      ['gold', 'Free Express Shipping'],
    ],
  );
  assert.equal(seeded.isProMember, false);
  assert.equal(seeded.progressToProPct, 87);
  assert.equal(seeded.amountRemainingToProUsd, 62.9);
  assert.equal(seeded.pointsRemainingToPro, 629);
  assert.deepEqual(
    seeded.milestones.map((m) => m.reached),
    [true, true, true, false],
  );
  assert.equal(seeded.milestones[2].isCurrent, true);
  assert.equal(seeded.milestones[3].isTarget, true);
  assert.equal(seeded.milestones[3].remainingUsd, 62.9);
  assert.equal(seeded.orderContributions.length, 3);
  assert.equal(seeded.orderContributions[0].orderId, 'SC-8942');
  assert.equal(seeded.orderContributions[0].pointsEarned, 1110);

  // 4. Near-threshold spend ($499.50) caps progress at 99% until $500 is genuinely reached
  const nearPro = calculateProMemberProgress([
    { ...SEEDED_SAMPLE_ORDER, id: 'SC-NEAR', totalUsd: 499.5 },
  ]);
  assert.equal(nearPro.isProMember, false);
  assert.equal(nearPro.progressToProPct, 99);
  assert.equal(nearPro.amountRemainingToProUsd, 0.5);

  // 5. Additional order crossing $500 unlocks Pro Member at 100% with 4/4 milestones reached
  const unlocked = calculateProMemberProgress([
    ...memberOrders,
    {
      ...SEEDED_SAMPLE_ORDER,
      id: 'SC-9001',
      createdAt: '2026-11-21T04:00:00.000Z',
      totalUsd: 98,
    },
  ]);
  assert.equal(unlocked.orderCount, 4);
  assert.equal(unlocked.totalSpentUsd, 535.1);
  assert.equal(unlocked.points, 5351);
  assert.equal(unlocked.currentTier.name, 'Pro Member');
  assert.equal(unlocked.nextTier, null);
  assert.equal(unlocked.achievedMilestoneCount, 4);
  assert.equal(unlocked.reachedMilestones.length, 4);
  assert.equal(
    unlocked.reachedMilestones[3].headlinePerk,
    'Free Heat-Press & VIP Fitting',
  );
  assert.equal(unlocked.isProMember, true);
  assert.equal(unlocked.progressToProPct, 100);
  assert.equal(unlocked.amountRemainingToProUsd, 0);
  assert.equal(unlocked.pointsRemainingToPro, 0);
  assert.ok(unlocked.milestones.every((m) => m.reached));
  assert.equal(unlocked.milestones[3].isCurrent, true);
});

test('Purchase Insights engine computes favorite category, most purchased brand, overflow grouping, and exact donut chart arc geometry', () => {
  // 1. Empty purchase history -> safe zero state
  const empty = calculatePurchaseInsights([]);
  assert.equal(empty.totalOrders, 0);
  assert.equal(empty.totalItems, 0);
  assert.equal(empty.totalItemSpendUsd, 0);
  assert.equal(empty.favoriteCategory, null);
  assert.equal(empty.favoriteBrand, null);
  assert.deepEqual(empty.categories, []);
  assert.deepEqual(empty.brands, []);
  assert.deepEqual(buildDonutArcGeometry([], 72), []);

  // 2. Default seeded Phnom Penh member history (3 orders, 4 items across 3 categories & 4 brands)
  const memberOrders = getInitialMemberOrders();
  const seeded = calculatePurchaseInsights(memberOrders);
  assert.equal(seeded.totalOrders, 3);
  assert.equal(seeded.totalItems, 4);
  assert.equal(seeded.customPrintedCount, 2);

  // Favorite category: Match Jerseys (2/4 items = 50%, $158.00)
  assert.equal(seeded.favoriteCategory?.key, 'jerseys');
  assert.equal(seeded.favoriteCategory?.label, 'Match Jerseys');
  assert.equal(seeded.favoriteCategory?.itemCount, 2);
  assert.equal(seeded.favoriteCategory?.sharePct, 50);
  assert.equal(seeded.favoriteCategory?.totalSpendUsd, 158);
  assert.equal(
    seeded.categories.reduce((sum, s) => sum + s.sharePct, 0),
    100,
  );
  assert.deepEqual(
    seeded.categories.map((c) => [c.key, c.sharePct]),
    [
      ['jerseys', 50],
      ['boots', 25],
      ['essentials', 25],
    ],
  );

  // Brand breakdown: 4 distinct brands (1 item each), tie-broken by highest spend (Adidas $255 first)
  assert.equal(seeded.favoriteBrand?.label, 'Adidas');
  assert.equal(seeded.favoriteBrand?.totalSpendUsd, 255);
  assert.equal(seeded.favoriteBrand?.sharePct, 25);
  assert.equal(
    seeded.brands.reduce((sum, s) => sum + s.sharePct, 0),
    100,
  );

  // 3. Adding another Nike jersey makes Nike the clear #1 most purchased brand (2/5 items = 40%) and boosts Jerseys to 60%
  const extraNikeOrder = {
    ...memberOrders[0],
    id: 'SC-9100',
  };
  const updated = calculatePurchaseInsights([...memberOrders, extraNikeOrder]);
  assert.equal(updated.totalItems, 5);
  assert.equal(updated.favoriteCategory?.key, 'jerseys');
  assert.equal(updated.favoriteCategory?.itemCount, 3);
  assert.equal(updated.favoriteCategory?.sharePct, 60);
  assert.equal(updated.favoriteBrand?.label, 'Nike');
  assert.equal(updated.favoriteBrand?.itemCount, 2);
  assert.equal(updated.favoriteBrand?.sharePct, 40);
  assert.equal(updated.favoriteBrand?.totalSpendUsd, 222);

  // 4. >5 distinct brands condenses tail into 'Other Brands' while preserving 100% total share
  const manyBrandsOrder = {
    ...memberOrders[2],
    id: 'SC-MANY-BRANDS',
    items: ['Nike', 'Adidas', 'Puma', 'Mizuno', 'Varaman', 'TruSox', 'Castore'].map(
      (brand, idx) => ({
        ...memberOrders[2].items[0],
        lineId: `line-${idx}`,
        brand,
        quantity: idx === 0 ? 3 : 1,
        unitPrice: 100 - idx * 5,
      }),
    ),
  };
  const condensed = calculatePurchaseInsights([manyBrandsOrder]);
  assert.equal(condensed.brands.length, 5);
  assert.equal(condensed.brands[0].label, 'Nike');
  assert.equal(condensed.brands[4].key, 'other');
  assert.equal(condensed.brands[4].label, 'Other Brands');
  assert.equal(
    condensed.brands.reduce((sum, s) => sum + s.sharePct, 0),
    100,
  );

  // 5. Donut arc geometry computes exact contiguous offsets and full circle for single slice
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const multiArcs = buildDonutArcGeometry(seeded.categories, radius, 3.5);
  assert.equal(multiArcs.length, 3);
  assert.equal(multiArcs[0].dashOffset, 0);
  assert.ok(multiArcs[1].dashOffset < 0);
  assert.ok(multiArcs[2].dashOffset < multiArcs[1].dashOffset);
  for (const arc of multiArcs) {
    assert.ok(arc.dashLength > 0);
    assert.ok(Math.abs(arc.dashLength + arc.dashGap - circumference) < 0.05);
  }

  const singleSliceInsights = calculatePurchaseInsights([memberOrders[2]]);
  const singleArc = buildDonutArcGeometry(singleSliceInsights.categories, radius, 3.5);
  assert.equal(singleArc.length, 1);
  assert.equal(singleArc[0].dashGap, 0);
  assert.ok(Math.abs(singleArc[0].dashLength - circumference) < 0.05);
});

test('backend Zod validators and Express API app enforce strict contracts, auth guards, and iframe-safe headers', async () => {
  // 1. Zod schema validation
  assert.equal(
    profileUpdateSchema.safeParse({
      fullName: 'Sokha Chan',
      email: 'sokha@phnompenhfc.kh',
      homeBranch: 'sonthormuk',
    }).success,
    true,
  );
  assert.equal(
    profileUpdateSchema.safeParse({ homeBranch: 'invalid-branch' }).success,
    false,
  );

  assert.equal(
    addressCreateSchema.safeParse({
      label: 'Home',
      type: 'shipping',
      fullName: 'Sokha Chan',
      phone: '+855 12 456 789',
      khan: 'Khan Toul Kork',
      streetAddress: 'No. 28 Street 289',
      isDefault: true,
    }).success,
    true,
  );

  assert.equal(
    paymentCreateSchema.safeParse({
      type: 'card',
      brand: 'Visa',
      last4: '4242',
      holderName: 'SOKHA CHAN',
      isDefault: true,
    }).success,
    true,
  );
  assert.equal(
    paymentCreateSchema.safeParse({
      type: 'card',
      brand: 'Visa',
      last4: '42AB',
      holderName: 'SOKHA CHAN',
    }).success,
    false,
  );

  assert.equal(
    trackOrderSchema.safeParse({
      orderId: 'SC-8810',
      email: 'sokha@phnompenhfc.kh',
    }).success,
    true,
  );
  assert.equal(
    trackOrderSchema.safeParse({
      orderId: 'SC',
      email: 'bad-email',
    }).success,
    false,
  );

  assert.equal(
    createOrderSchema.safeParse({
      fulfillmentMethod: 'pickup',
      pickupBranch: 'sensok',
      paymentMethod: 'aba-khqr',
      customer: {
        fullName: 'Sokha Chan',
        email: 'sokha@phnompenhfc.kh',
        phone: '+855 12 456 789',
      },
      items: [],
      subtotal: 0,
      totalUsd: 0,
      totalKhr: 0,
    }).success,
    false,
  );

  assert.equal(
    productQuestionCreateSchema.safeParse({
      productId: 'boot-predator-25-elite-ft',
      author: 'Vireak',
      question: 'Does EU 42 fit true to size on artificial turf?',
    }).success,
    true,
  );

  // 2. Express backend HTTP contract checks on ephemeral localhost port
  const app = createBackendApp();
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    // Health endpoint + iframe-compatible security headers
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(healthRes.headers.get('x-frame-options'), null);
    const healthJson = (await healthRes.json()) as { status: string; service: string };
    assert.equal(healthJson.status, 'ok');
    assert.equal(healthJson.service, 'sport-castle-backend');

    // Public catalog endpoint + category filter
    const catalogRes = await fetch(`${baseUrl}/api/catalog?category=boots`);
    assert.equal(catalogRes.status, 200);
    const catalogJson = (await catalogRes.json()) as { total: number; products: Array<{ category: string }> };
    assert.equal(catalogJson.total, 15);
    assert.ok(catalogJson.products.every((p) => p.category === 'boots'));

    // Protected member endpoint rejects unauthenticated requests with 401
    const unauthRes = await fetch(`${baseUrl}/api/account/bootstrap`);
    assert.equal(unauthRes.status, 401);

    // Invalid tracking payload rejected with 400
    const badTrackRes = await fetch(`${baseUrl}/api/orders/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'X', email: 'not-an-email' }),
    });
    assert.equal(badTrackRes.status, 400);

    // Unknown API path returns 404 JSON
    const missingRes = await fetch(`${baseUrl}/api/does-not-exist`);
    assert.equal(missingRes.status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('System Health monitoring formats uptime/availability, checks Cloud SQL status, serves 200/503 API & escaped HTML view, and routes #/system-health', async () => {
  // 1. Pure formatting & availability math helpers
  assert.equal(formatUptimeDuration(0), '0s');
  assert.equal(formatUptimeDuration(45), '45s');
  assert.equal(formatUptimeDuration(125), '2m 5s');
  assert.equal(formatUptimeDuration(3665), '1h 1m 5s');
  assert.equal(formatUptimeDuration(90061), '1d 1h 1m');
  assert.equal(formatUptimeDuration(-10), '0s');

  assert.equal(formatLatencyMs(null), '—');
  assert.equal(formatLatencyMs(14.4), '14 ms');
  assert.equal(formatLatencyMs(0), '0 ms');

  assert.equal(calculateAvailabilityPercent([]), 100);
  assert.equal(
    calculateAvailabilityPercent([
      {
        checkedAt: '2026-11-22T00:00:00.000Z',
        status: 'operational',
        databaseStatus: 'connected',
        latencyMs: 12,
      },
      {
        checkedAt: '2026-11-22T00:01:00.000Z',
        status: 'degraded',
        databaseStatus: 'disconnected',
        latencyMs: null,
      },
      {
        checkedAt: '2026-11-22T00:02:00.000Z',
        status: 'operational',
        databaseStatus: 'connected',
        latencyMs: 10,
      },
    ]),
    66.7,
  );

  // 2. Snapshot assembly for connected & degraded Cloud SQL states
  clearHealthHistory();
  const connectedSnapshot = await getSystemHealthSnapshot({
    probeDatabase: async () => ({
      connected: true,
      latencyMs: 11,
      message: 'Cloud SQL PostgreSQL instance responding normally.',
    }),
    now: new Date('2026-11-22T01:00:00.000Z'),
  });
  assert.equal(connectedSnapshot.overallStatus, 'operational');
  assert.equal(connectedSnapshot.database.status, 'connected');
  assert.equal(connectedSnapshot.database.latencyMs, 11);
  assert.equal(connectedSnapshot.availabilityPercent, 100);
  assert.equal(connectedSnapshot.recentChecks.length, 1);

  const degradedSnapshot = await getSystemHealthSnapshot({
    probeDatabase: async () => ({
      connected: false,
      latencyMs: null,
      message: 'Unable to reach <script>alert(1)</script> instance.',
    }),
    now: new Date('2026-11-22T01:01:00.000Z'),
  });
  assert.equal(degradedSnapshot.overallStatus, 'degraded');
  assert.equal(degradedSnapshot.database.status, 'disconnected');
  assert.equal(degradedSnapshot.database.latencyMs, null);
  assert.equal(degradedSnapshot.availabilityPercent, 50);
  assert.equal(degradedSnapshot.recentChecks.length, 2);
  assert.equal(
    degradedSnapshot.recentChecks[0].message,
    'Cloud SQL PostgreSQL instance responding normally.',
  );

  // Chronological last-5 connection attempt log helper
  assert.deepEqual(getRecentConnectionAttemptLogs([]), []);
  const sevenSamples = [
    {
      checkedAt: '2026-11-22T01:02:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 14,
    },
    {
      checkedAt: '2026-11-22T01:00:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 18,
    },
    {
      checkedAt: '2026-11-22T01:01:00.000Z',
      status: 'degraded' as const,
      databaseStatus: 'disconnected' as const,
      latencyMs: null,
      message: 'Connection timed out.',
    },
    {
      checkedAt: '2026-11-22T01:03:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 11,
    },
    {
      checkedAt: '2026-11-22T01:04:00.000Z',
      status: 'degraded' as const,
      databaseStatus: 'disconnected' as const,
      latencyMs: null,
    },
    {
      checkedAt: '2026-11-22T01:05:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 9,
      message: 'Reconnected cleanly.',
    },
    {
      checkedAt: '2026-11-22T01:06:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 8,
    },
  ];
  const lastFive = getRecentConnectionAttemptLogs(sevenSamples, 5);
  assert.equal(lastFive.length, 5);
  assert.deepEqual(
    lastFive.map((e) => e.checkedAt),
    [
      '2026-11-22T01:02:00.000Z',
      '2026-11-22T01:03:00.000Z',
      '2026-11-22T01:04:00.000Z',
      '2026-11-22T01:05:00.000Z',
      '2026-11-22T01:06:00.000Z',
    ],
  );
  assert.deepEqual(
    lastFive.map((e) => e.sequenceNumber),
    [3, 4, 5, 6, 7],
  );
  assert.equal(lastFive[2].databaseStatus, 'disconnected');
  assert.equal(
    lastFive[2].message,
    'Unable to reach the Cloud SQL database instance.',
  );
  assert.equal(lastFive[3].message, 'Reconnected cleanly.');
  assert.equal(lastFive[3].isLatest, false);
  assert.equal(lastFive[4].isLatest, true);

  // Latency alert threshold sanitization & automatic >500ms status badge evaluation
  assert.equal(DEFAULT_LATENCY_ALERT_THRESHOLD_MS, 500);
  assert.equal(sanitizeLatencyThresholdMs(undefined), 500);
  assert.equal(sanitizeLatencyThresholdMs('not-a-number'), 500);
  assert.equal(sanitizeLatencyThresholdMs(2), 10);
  assert.equal(sanitizeLatencyThresholdMs(99_999), 10_000);
  assert.equal(sanitizeLatencyThresholdMs('250'), 250);

  // Exact boundary: 500ms is within threshold; 501ms triggers high-latency alert
  const atBoundary = evaluateLatencyAlert(500, 500, 'connected');
  assert.equal(atBoundary.severity, 'normal');
  assert.equal(atBoundary.isAlertActive, false);
  assert.equal(atBoundary.excessMs, 0);
  assert.equal(atBoundary.badgeLabel, 'Within Threshold (≤500ms)');

  const over500 = evaluateLatencyAlert(645, DEFAULT_LATENCY_ALERT_THRESHOLD_MS, 'connected');
  assert.equal(over500.severity, 'high-latency');
  assert.equal(over500.isAlertActive, true);
  assert.equal(over500.excessMs, 145);
  assert.equal(over500.badgeLabel, 'High Latency (>500ms)');
  assert.ok(over500.summaryMessage.includes('645 ms'));

  // Custom lower threshold (e.g. 40ms) immediately flags 55ms response
  const customBreach = evaluateLatencyAlert(55, 40, 'connected');
  assert.equal(customBreach.severity, 'high-latency');
  assert.equal(customBreach.badgeLabel, 'High Latency (>40ms)');
  assert.equal(customBreach.excessMs, 15);

  // Disconnected state reports unavailable
  const offlineAlert = evaluateLatencyAlert(null, 500, 'disconnected');
  assert.equal(offlineAlert.severity, 'unavailable');
  assert.equal(offlineAlert.isAlertActive, true);
  assert.equal(offlineAlert.badgeLabel, 'DB Unreachable');

  // Breach counter across recent probes ignores disconnected null entries
  assert.equal(
    countLatencyThresholdBreaches(
      [
        { checkedAt: '2026-11-22T01:00:00.000Z', status: 'operational', databaseStatus: 'connected', latencyMs: 120 },
        { checkedAt: '2026-11-22T01:01:00.000Z', status: 'operational', databaseStatus: 'connected', latencyMs: 500 },
        { checkedAt: '2026-11-22T01:02:00.000Z', status: 'operational', databaseStatus: 'connected', latencyMs: 525 },
        { checkedAt: '2026-11-22T01:03:00.000Z', status: 'degraded', databaseStatus: 'disconnected', latencyMs: null },
        { checkedAt: '2026-11-22T01:04:00.000Z', status: 'operational', databaseStatus: 'connected', latencyMs: 780 },
      ],
      500,
    ),
    2,
  );

  // HTML renderer escapes untrusted strings cleanly
  const renderedHtml = renderSystemHealthHtml(degradedSnapshot);
  assert.ok(renderedHtml.includes('System Health'));
  assert.ok(renderedHtml.includes('Disconnected'));
  assert.ok(!renderedHtml.includes('<script>alert(1)</script>'));
  assert.ok(renderedHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));

  // 3. Express HTTP endpoints: GET /api/system-health (200 & 503) and GET /api/system-health/view
  clearHealthHistory();
  let mockHealthy = true;
  const app = createBackendApp({
    probeDatabase: async () =>
      mockHealthy
        ? {
            connected: true,
            latencyMs: 9,
            message: 'Cloud SQL PostgreSQL instance responding normally.',
          }
        : {
            connected: false,
            latencyMs: null,
            message: 'Unable to reach the Cloud SQL database instance.',
          },
  });

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    // Healthy JSON check -> 200 + Cache-Control: no-store
    const okRes = await fetch(`${baseUrl}/api/system-health`);
    assert.equal(okRes.status, 200);
    assert.equal(okRes.headers.get('cache-control'), 'no-store');
    const okBody = (await okRes.json()) as {
      overallStatus: string;
      database: { status: string; latencyMs: number | null };
      recentChecks: unknown[];
    };
    assert.equal(okBody.overallStatus, 'operational');
    assert.equal(okBody.database.status, 'connected');
    assert.equal(okBody.database.latencyMs, 9);
    assert.equal(okBody.recentChecks.length, 1);

    // Simplified HTML view -> 200 text/html
    const htmlRes = await fetch(`${baseUrl}/api/system-health/view`);
    assert.equal(htmlRes.status, 200);
    assert.ok(htmlRes.headers.get('content-type')?.includes('text/html'));
    const htmlText = await htmlRes.text();
    assert.ok(htmlText.includes('System Health'));
    assert.ok(htmlText.includes('Cloud SQL Instance'));
    assert.ok(htmlText.includes('Connected'));

    // Degraded check -> 503 + sanitized message
    mockHealthy = false;
    const degradedRes = await fetch(`${baseUrl}/api/system-health`);
    assert.equal(degradedRes.status, 503);
    const degradedBody = (await degradedRes.json()) as {
      overallStatus: string;
      database: { status: string; message: string };
    };
    assert.equal(degradedBody.overallStatus, 'degraded');
    assert.equal(degradedBody.database.status, 'disconnected');
    assert.ok(!degradedBody.database.message.includes('SQL_PASSWORD'));
  } finally {
    clearHealthHistory();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // 4. SPA hash router round-trip for #/system-health
  assert.deepEqual(parseHashToRoute('#/system-health'), { page: 'system-health' });
  assert.equal(routeToHash({ page: 'system-health' }), '#/system-health');
});

test('payment webhooks enforce HMAC-SHA256 signatures, replay protection, fail-closed 503, and idempotent settlement for ABA KHQR and Stripe', async () => {
  const fixedNowMs = 1_760_000_000_000; // 1760000000 sec
  const nowSec = Math.floor(fixedNowMs / 1000);
  const abaSecret = 'aba_test_signing_secret_2026';
  const stripeSecret = 'whsec_test_stripe_secret_2026';

  // 1. Pure ABA KHQR HMAC verification (valid timestamped, tampered payload, expired timestamp, unconfigured secret)
  const abaPayloadStr = JSON.stringify({
    tran_id: 'SC-8942',
    status: '0',
    amount: 111.0,
    currency: 'USD',
    apv: 'APV998811',
  });
  const abaSig = computeHmacSha256Hex(`${nowSec}.${abaPayloadStr}`, abaSecret);

  assert.equal(
    verifyAbaKhqrSignature({
      rawBody: abaPayloadStr,
      signatureHeader: abaSig,
      timestampHeader: String(nowSec),
      secret: abaSecret,
      nowMs: fixedNowMs,
    }).valid,
    true,
  );
  assert.equal(
    verifyAbaKhqrSignature({
      rawBody: abaPayloadStr.replace('111', '999'),
      signatureHeader: abaSig,
      timestampHeader: String(nowSec),
      secret: abaSecret,
      nowMs: fixedNowMs,
    }).reason,
    'signature_mismatch',
  );
  assert.equal(
    verifyAbaKhqrSignature({
      rawBody: abaPayloadStr,
      signatureHeader: computeHmacSha256Hex(
        `${nowSec - 600}.${abaPayloadStr}`,
        abaSecret,
      ),
      timestampHeader: String(nowSec - 600),
      secret: abaSecret,
      nowMs: fixedNowMs,
    }).reason,
    'timestamp_expired',
  );
  assert.equal(
    verifyAbaKhqrSignature({
      rawBody: abaPayloadStr,
      signatureHeader: abaSig,
      secret: '',
      nowMs: fixedNowMs,
    }).reason,
    'secret_unconfigured',
  );

  // 2. Pure Stripe `Stripe-Signature` verification (`t=...,v1=...`)
  const stripePayloadObj = {
    id: 'evt_stripe_test_001',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_12345',
        amount_received: 11100,
        currency: 'usd',
        metadata: { orderId: 'SC-8942' },
      },
    },
  };
  const stripePayloadStr = JSON.stringify(stripePayloadObj);
  const stripeV1 = computeHmacSha256Hex(
    `${nowSec}.${stripePayloadStr}`,
    stripeSecret,
  );
  const stripeHeader = `t=${nowSec},v1=${stripeV1}`;

  assert.equal(
    verifyStripeSignature({
      rawBody: stripePayloadStr,
      signatureHeader: stripeHeader,
      secret: stripeSecret,
      nowMs: fixedNowMs,
    }).valid,
    true,
  );
  assert.equal(
    verifyStripeSignature({
      rawBody: stripePayloadStr,
      signatureHeader: `t=${nowSec - 500},v1=${stripeV1}`,
      secret: stripeSecret,
      nowMs: fixedNowMs,
    }).reason,
    'timestamp_expired',
  );

  // Normalization check
  const normalizedAba = normalizeAbaKhqrWebhookOutcome({
    tran_id: 'SC-8942',
    status: '0',
    amount: 111,
    currency: 'USD',
    apv: 'APV998811',
  });
  assert.equal(normalizedAba.paymentStatus, 'paid');
  assert.equal(normalizedAba.orderId, 'SC-8942');
  assert.equal(normalizedAba.paymentReference, 'ABA-APV998811');

  const normalizedStripe = normalizeStripeWebhookOutcome(stripePayloadObj);
  assert.equal(normalizedStripe.paymentStatus, 'paid');
  assert.equal(normalizedStripe.orderId, 'SC-8942');
  assert.equal(normalizedStripe.amountUsd, 111);

  // 3. Express HTTP contract: fail-closed 503 -> 401 bad signature -> 200 processed + notification -> 200 duplicate idempotency
  const seenEvents = new Set<string>();
  const dispatchedEvents: string[] = [];
  let activeAbaSecret: string | undefined = undefined;
  let activeStripeSecret: string | undefined = stripeSecret;

  const sampleAdminOrder: AdminOrderRecord = {
    ...SEEDED_SAMPLE_ORDER,
    id: 'SC-8942',
    userUid: 'uid-member-1',
    customerEmail: 'sokha.chan@phnompenhfc.kh',
    paymentStatus: 'paid',
    paymentReference: 'ABA-APV998811',
    paidAt: new Date(fixedNowMs).toISOString(),
  };

  const app = createBackendApp({
    webhookDeps: {
      getAbaSecret: () => activeAbaSecret,
      getStripeSecret: () => activeStripeSecret,
      nowMs: () => fixedNowMs,
      processWebhook: async ({ outcome }) => {
        const key = `${outcome.provider}:${outcome.providerEventId}`;
        const duplicate = seenEvents.has(key);
        seenEvents.add(key);
        const webhookEvent: WebhookEventAuditRecord = {
          id: seenEvents.size,
          provider: outcome.provider,
          providerEventId: outcome.providerEventId,
          eventType: outcome.eventType,
          orderId: outcome.orderId,
          amountUsd: outcome.amountUsd,
          currency: outcome.currency,
          signatureValid: true,
          processingStatus: 'processed',
          errorMessage: null,
          receivedAt: new Date(fixedNowMs).toISOString(),
          processedAt: new Date(fixedNowMs).toISOString(),
        };
        return {
          duplicate,
          orderUpdated: !duplicate,
          order: duplicate ? null : sampleAdminOrder,
          webhookEvent,
        };
      },
      dispatchNotifications: async ({ eventType, order }) => {
        dispatchedEvents.push(`${eventType}:${order?.id ?? 'none'}`);
        return [];
      },
    },
  });

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    // Fail-closed 503 when ABA_WEBHOOK_SECRET is not set
    const unconfiguredRes = await fetch(`${baseUrl}/api/webhooks/payments/aba-khqr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: abaPayloadStr,
    });
    assert.equal(unconfiguredRes.status, 503);

    // Enable ABA secret and send invalid signature -> 401
    activeAbaSecret = abaSecret;
    const badSigRes = await fetch(`${baseUrl}/api/webhooks/payments/aba-khqr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-aba-timestamp': String(nowSec),
        'x-aba-signature': '0'.repeat(64),
      },
      body: abaPayloadStr,
    });
    assert.equal(badSigRes.status, 401);

    // Valid ABA KHQR webhook -> 200 processed + payment_confirmed notification
    const okAbaRes = await fetch(`${baseUrl}/api/webhooks/payments/aba-khqr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-aba-timestamp': String(nowSec),
        'x-aba-signature': abaSig,
      },
      body: abaPayloadStr,
    });
    assert.equal(okAbaRes.status, 200);
    const okAbaBody = (await okAbaRes.json()) as {
      duplicate: boolean;
      orderUpdated: boolean;
      paymentStatus: string;
    };
    assert.equal(okAbaBody.duplicate, false);
    assert.equal(okAbaBody.orderUpdated, true);
    assert.equal(okAbaBody.paymentStatus, 'paid');

    // Replaying exact same ABA KHQR webhook -> 200 duplicate: true, does NOT re-notify
    const dupAbaRes = await fetch(`${baseUrl}/api/webhooks/payments/aba-khqr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-aba-timestamp': String(nowSec),
        'x-aba-signature': abaSig,
      },
      body: abaPayloadStr,
    });
    assert.equal(dupAbaRes.status, 200);
    const dupAbaBody = (await dupAbaRes.json()) as {
      duplicate: boolean;
      orderUpdated: boolean;
    };
    assert.equal(dupAbaBody.duplicate, true);
    assert.equal(dupAbaBody.orderUpdated, false);

    // Valid Stripe webhook -> 200 processed + payment_confirmed notification
    const okStripeRes = await fetch(`${baseUrl}/api/webhooks/payments/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': stripeHeader,
      },
      body: stripePayloadStr,
    });
    assert.equal(okStripeRes.status, 200);
    const okStripeBody = (await okStripeRes.json()) as {
      provider: string;
      duplicate: boolean;
      orderUpdated: boolean;
    };
    assert.equal(okStripeBody.provider, 'stripe');
    assert.equal(okStripeBody.duplicate, false);
    assert.equal(okStripeBody.orderUpdated, true);

    // Confirm exactly 2 notifications fired (1 ABA + 1 Stripe, duplicate ignored)
    assert.deepEqual(dispatchedEvents, [
      'payment_confirmed:SC-8942',
      'payment_confirmed:SC-8942',
    ]);

    // Unconfigured Stripe secret returns 503
    activeStripeSecret = undefined;
    const stripe503 = await fetch(`${baseUrl}/api/webhooks/payments/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: stripePayloadStr,
    });
    assert.equal(stripe503.status, 503);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Admin RBAC, order/inventory management APIs, catalog override merging, and automated Telegram/Email notifications work end-to-end', async () => {
  // 1. Admin email allowlist check (owner + ADMIN_EMAILS env)
  assert.equal(isAdminEmail('danishsary3@gmail.com', ''), true);
  assert.equal(
    isAdminEmail('ops@sportcastle.kh', 'ops@sportcastle.kh, manager@sportcastle.kh'),
    true,
  );
  assert.equal(isAdminEmail('customer@example.com', 'ops@sportcastle.kh'), false);

  // 2. Pure inventory override merge updates price, branch stock, and hides archived products from public catalog
  const firstProduct = MOCK_STORE_CATALOG[0];
  const secondProduct = MOCK_STORE_CATALOG[1];
  const mockOverrides: InventoryOverrideRecord[] = [
    {
      productId: firstProduct.id,
      priceUsd: 199,
      originalPriceUsd: 249,
      sonthormukStock: 'Limited Stock',
      sensokStock: 'Out of Stock',
      chomkadongStock: 'In Stock',
      unitsAvailable: 7,
      isArchived: false,
      updatedByUid: 'admin-uid',
      updatedAt: '2026-11-22T10:00:00.000Z',
    },
    {
      productId: secondProduct.id,
      priceUsd: null,
      originalPriceUsd: null,
      sonthormukStock: null,
      sensokStock: null,
      chomkadongStock: null,
      unitsAvailable: 0,
      isArchived: true,
      updatedByUid: 'admin-uid',
      updatedAt: '2026-11-22T10:00:00.000Z',
    },
  ];

  const publicMerged = mergeInventoryOverridesIntoCatalog(
    [firstProduct, secondProduct],
    mockOverrides,
  );
  assert.equal(publicMerged.length, 1);
  assert.equal(publicMerged[0].id, firstProduct.id);
  assert.equal(publicMerged[0].price, 199);
  assert.equal(publicMerged[0].originalPrice, 249);
  assert.equal(publicMerged[0].branchStock.sensok, 'Out of Stock');

  const adminMerged = mergeInventoryOverridesIntoCatalog(
    [firstProduct, secondProduct],
    mockOverrides,
    { includeArchived: true },
  );
  assert.equal(adminMerged.length, 2);

  // 3. Automated notification HTML escaping & Telegram/Resend dispatch (sent, skipped, failed)
  assert.equal(
    escapeEmailHtml('<script>alert("xss")</script>'),
    '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
  );
  const content = buildOrderNotificationContent({
    eventType: 'order_created',
    order: {
      ...SEEDED_SAMPLE_ORDER,
      customer: {
        ...SEEDED_SAMPLE_ORDER.customer,
        fullName: '<b>Sokha</b>',
      },
    },
  });
  assert.ok(!content.emailHtml.includes('<b>Sokha</b>'));
  assert.ok(content.emailHtml.includes('&lt;b&gt;Sokha&lt;/b&gt;'));

  const loggedRecords: NotificationDeliveryResult[] = [];
  // Unconfigured env -> gracefully skipped without throwing
  const skippedResults = await dispatchOrderNotifications({
    eventType: 'order_created',
    order: SEEDED_SAMPLE_ORDER,
    env: {},
    persistLog: async (r) => {
      loggedRecords.push(r);
    },
  });
  assert.equal(skippedResults.length, 2);
  assert.ok(skippedResults.every((r) => r.status === 'skipped'));
  assert.equal(loggedRecords.length, 2);

  // Configured Telegram + Resend with mocked HTTP fetch -> both sent
  const calledUrls: string[] = [];
  const orderWithEmail = {
    ...SEEDED_SAMPLE_ORDER,
    customer: {
      ...SEEDED_SAMPLE_ORDER.customer,
      email: 'sokha.chan@phnompenhfc.kh',
    },
  };
  const sentResults = await dispatchOrderNotifications({
    eventType: 'payment_confirmed',
    order: orderWithEmail,
    paymentReference: 'ABA-TXN-777',
    env: {
      telegramBotToken: '123456:TEST_TOKEN',
      telegramChatId: '-100123456',
      resendApiKey: 're_test_12345',
      fromEmail: 'Sport Castle <orders@sportcastle.kh>',
    },
    fetchImpl: async (url) => {
      calledUrls.push(url);
      if (url.startsWith('https://api.telegram.org/')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ ok: true, result: { message_id: 901 } }),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: 'email_resend_555' }),
      };
    },
    persistLog: async () => {},
  });
  assert.equal(calledUrls.length, 2);
  assert.ok(calledUrls[0].startsWith('https://api.telegram.org/bot'));
  assert.equal(calledUrls[1], 'https://api.resend.com/emails');
  assert.equal(sentResults.find((r) => r.channel === 'telegram')?.status, 'sent');
  assert.equal(sentResults.find((r) => r.channel === 'telegram')?.providerMessageId, '901');
  assert.equal(sentResults.find((r) => r.channel === 'email')?.status, 'sent');
  assert.equal(sentResults.find((r) => r.channel === 'email')?.providerMessageId, 'email_resend_555');

  // Provider HTTP 500 error -> captured cleanly as 'failed' without throwing
  const failedResults = await dispatchOrderNotifications({
    eventType: 'status_updated',
    order: orderWithEmail,
    env: {
      telegramBotToken: '123456:TEST_TOKEN',
      telegramChatId: '-100123456',
      resendApiKey: 're_test_12345',
    },
    fetchImpl: async () => ({
      ok: false,
      status: 502,
      text: async () => 'Bad Gateway',
    }),
    persistLog: async () => {},
  });
  assert.ok(failedResults.every((r) => r.status === 'failed'));

  // 4. Express HTTP contract for /api/admin/* RBAC (401 -> 403 -> 200) and CRUD endpoints
  const overridesStore = new Map<string, InventoryOverrideRecord>();
  const statusNotifications: string[] = [];
  const sampleOrder: AdminOrderRecord = {
    ...SEEDED_SAMPLE_ORDER,
    id: 'SC-8810',
    userUid: 'uid-member',
    customerEmail: 'sokha.chan@phnompenhfc.kh',
    paymentStatus: 'pending',
    paymentReference: null,
    paidAt: null,
  };

  const app = createBackendApp({
    verifyToken: async (token) => {
      if (token === 'admin-token') {
        return {
          uid: 'uid-admin',
          email: 'danishsary3@gmail.com',
          name: 'Store Owner',
        } as unknown as DecodedIdToken;
      }
      if (token === 'member-token') {
        return {
          uid: 'uid-member',
          email: 'member@example.com',
          name: 'Regular Member',
        } as unknown as DecodedIdToken;
      }
      throw new Error('Invalid token');
    },
    checkAdminRole: async ({ isAllowlistedAdminEmail }) =>
      isAllowlistedAdminEmail,
    adminDeps: {
      getOverviewStats: async () => ({
        totalOrders: 12,
        paidOrders: 10,
        pendingPayments: 2,
        activeFulfillmentOrders: 3,
        paidRevenueUsd: 1840.5,
        totalCatalogRevenueUsd: 2100.0,
        inventoryOverridesCount: overridesStore.size,
        archivedProductsCount: 0,
        webhookEventsCount: 10,
        notificationsSentCount: 20,
        notificationsFailedCount: 0,
      }),
      listOrders: async () => [sampleOrder],
      updateOrderStatus: async (orderId, patch) => {
        if (orderId.toUpperCase() !== sampleOrder.id) return null;
        return {
          ...sampleOrder,
          status: patch.status ?? sampleOrder.status,
          paymentStatus: patch.paymentStatus ?? sampleOrder.paymentStatus,
          paymentReference: patch.paymentReference ?? sampleOrder.paymentReference,
        };
      },
      listOverrides: async () => Array.from(overridesStore.values()),
      upsertOverride: async (productId, input, adminUid) => {
        const rec: InventoryOverrideRecord = {
          productId,
          priceUsd: input.priceUsd ?? null,
          originalPriceUsd: input.originalPriceUsd ?? null,
          sonthormukStock: input.sonthormukStock ?? null,
          sensokStock: input.sensokStock ?? null,
          chomkadongStock: input.chomkadongStock ?? null,
          unitsAvailable: input.unitsAvailable ?? null,
          isArchived: input.isArchived ?? false,
          updatedByUid: adminUid,
          updatedAt: '2026-11-22T12:00:00.000Z',
        };
        overridesStore.set(productId, rec);
        return rec;
      },
      deleteOverride: async (productId) => overridesStore.delete(productId),
      listWebhooks: async () => [],
      listNotifications: async () => [],
      dispatchNotifications: async ({ eventType, order }) => {
        statusNotifications.push(`${eventType}:${order?.id ?? 'test'}`);
        return [
          {
            id: 'ntf-test-1',
            orderId: order?.id ?? null,
            channel: 'telegram',
            eventType,
            recipient: 'ops-chat',
            subject: 'Test',
            status: 'skipped',
            providerMessageId: null,
            errorMessage: null,
            sentAt: null,
          },
        ];
      },
    },
  });

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    // Unauthenticated -> 401
    const unauthRes = await fetch(`${baseUrl}/api/admin/overview`);
    assert.equal(unauthRes.status, 401);

    // Authenticated non-admin member -> 403
    const memberRes = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: 'Bearer member-token' },
    });
    assert.equal(memberRes.status, 403);

    // Authenticated admin -> 200 overview
    const adminOverviewRes = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: 'Bearer admin-token' },
    });
    assert.equal(adminOverviewRes.status, 200);
    const overviewBody = (await adminOverviewRes.json()) as {
      overview: { paidOrders: number; paidRevenueUsd: number };
    };
    assert.equal(overviewBody.overview.paidOrders, 10);
    assert.equal(overviewBody.overview.paidRevenueUsd, 1840.5);

    // Admin updates order status -> 200 + fires status_updated notification
    const patchRes = await fetch(`${baseUrl}/api/admin/orders/SC-8810/status`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'Rider Dispatched',
        paymentStatus: 'paid',
      }),
    });
    assert.equal(patchRes.status, 200);
    const patchBody = (await patchRes.json()) as {
      order: { status: string; paymentStatus: string };
    };
    assert.equal(patchBody.order.status, 'Rider Dispatched');
    assert.equal(patchBody.order.paymentStatus, 'paid');

    // Admin upserts inventory override -> 200 with merged product
    const putInvRes = await fetch(
      `${baseUrl}/api/admin/inventory/${firstProduct.id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceUsd: 215,
          sonthormukStock: 'Limited Stock',
          unitsAvailable: 4,
        }),
      },
    );
    assert.equal(putInvRes.status, 200);
    const putInvBody = (await putInvRes.json()) as {
      product: { price: number; branchStock: { sonthormuk: string } };
      override: { unitsAvailable: number };
    };
    assert.equal(putInvBody.product.price, 215);
    assert.equal(putInvBody.product.branchStock.sonthormuk, 'Limited Stock');
    assert.equal(putInvBody.override.unitsAvailable, 4);

    // Admin test notification endpoint -> 200
    const testNotifRes = await fetch(`${baseUrl}/api/admin/notifications/test`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Live ops check' }),
    });
    assert.equal(testNotifRes.status, 200);
    assert.deepEqual(statusNotifications, [
      'status_updated:SC-8810',
      'admin_test:test',
    ]);

    // Admin deletes inventory override -> 200
    const delInvRes = await fetch(
      `${baseUrl}/api/admin/inventory/${firstProduct.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: 'Bearer admin-token' },
      },
    );
    assert.equal(delInvRes.status, 200);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('API rate limiting enforces bounded in-memory windows, tiered limits, 429 headers, and #/admin routing round-trips', async () => {
  // 1. Pure store unit test: fixed window, reset, and bounded maxEntries eviction
  const store = new InMemoryRateLimitStore(100);
  const t0 = 1_700_000_000_000;
  const d1 = store.consume('bucket:1.2.3.4', 60_000, 2, t0);
  assert.equal(d1.allowed, true);
  assert.equal(d1.remaining, 1);

  const d2 = store.consume('bucket:1.2.3.4', 60_000, 2, t0 + 5_000);
  assert.equal(d2.allowed, true);
  assert.equal(d2.remaining, 0);

  const d3 = store.consume('bucket:1.2.3.4', 60_000, 2, t0 + 10_000);
  assert.equal(d3.allowed, false);
  assert.equal(d3.remaining, 0);
  assert.equal(d3.retryAfterSeconds, 50);

  // After window expires, counter resets cleanly
  const d4 = store.consume('bucket:1.2.3.4', 60_000, 2, t0 + 60_001);
  assert.equal(d4.allowed, true);
  assert.equal(d4.remaining, 1);

  // Bounded eviction prevents unbounded memory growth under IP-flood cardinality
  for (let i = 0; i < 125; i += 1) {
    store.consume(`flood:10.0.0.${i}`, 60_000, 5, t0 + 60_002);
  }
  assert.ok(store.size() <= 100);

  // 2. Express HTTP contract test: general + tiered sensitive limits & recovery
  let fakeNow = 1_700_100_000_000;
  const app = createBackendApp({
    probeDatabase: async () => ({
      connected: true,
      latencyMs: 12,
      message: 'Cloud SQL PostgreSQL reachable',
    }),
    rateLimit: {
      windowMs: 60_000,
      maxRequests: 5,
      sensitiveMaxRequests: 2,
      adminMaxRequests: 2,
      nowMs: () => fakeNow,
    },
  });

  const server = app.listen(0);
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // Request 1 to general endpoint -> 200 with standard RateLimit headers
    const r1 = await fetch(`${baseUrl}/api/system-health`);
    assert.equal(r1.status, 200);
    assert.equal(r1.headers.get('ratelimit-limit'), '5');
    assert.equal(r1.headers.get('ratelimit-remaining'), '4');
    assert.ok(Number(r1.headers.get('ratelimit-reset')) > 0);

    // Requests 2 & 3 hit tighter sensitive endpoint (/api/orders/track, limit=2)
    const s1 = await fetch(`${baseUrl}/api/orders/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber: 'SC-UNKNOWN' }),
    });
    assert.notEqual(s1.status, 429);
    assert.equal(s1.headers.get('ratelimit-limit'), '2');
    assert.equal(s1.headers.get('ratelimit-remaining'), '1');

    const s2 = await fetch(`${baseUrl}/api/orders/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber: 'SC-UNKNOWN' }),
    });
    assert.notEqual(s2.status, 429);
    assert.equal(s2.headers.get('ratelimit-remaining'), '0');

    // 3rd sensitive call -> 429 Too Many Requests with Retry-After
    const s3 = await fetch(`${baseUrl}/api/orders/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber: 'SC-UNKNOWN' }),
    });
    assert.equal(s3.status, 429);
    assert.ok(Number(s3.headers.get('retry-after')) >= 1);
    const s3Body = (await s3.json()) as {
      error: string;
      retryAfterSeconds: number;
    };
    assert.match(s3Body.error, /too many requests/i);
    assert.ok(s3Body.retryAfterSeconds >= 1);

    // 5th total general call allowed, 6th returns 429 from general bucket
    const r5 = await fetch(`${baseUrl}/api/system-health`);
    assert.equal(r5.status, 200);
    assert.equal(r5.headers.get('ratelimit-remaining'), '0');

    const r6 = await fetch(`${baseUrl}/api/system-health`);
    assert.equal(r6.status, 429);
    assert.ok(Number(r6.headers.get('retry-after')) >= 1);

    // Advance clock past windowMs -> bucket resets and requests succeed again
    fakeNow += 61_000;
    const recovered = await fetch(`${baseUrl}/api/system-health`);
    assert.equal(recovered.status, 200);
    assert.equal(recovered.headers.get('ratelimit-remaining'), '4');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // 3. Admin Dashboard hash routing round-trips
  assert.deepEqual(parseHashToRoute('#/admin'), {
    page: 'admin',
    tab: 'overview',
  });
  assert.deepEqual(parseHashToRoute('#/admin/orders'), {
    page: 'admin',
    tab: 'orders',
  });
  assert.deepEqual(parseHashToRoute('#/admin/inventory'), {
    page: 'admin',
    tab: 'inventory',
  });
  assert.deepEqual(parseHashToRoute('#/admin/webhooks'), {
    page: 'admin',
    tab: 'webhooks',
  });
  assert.deepEqual(parseHashToRoute('#/admin/notifications'), {
    page: 'admin',
    tab: 'notifications',
  });
  assert.deepEqual(parseHashToRoute('#/admin/unknown-tab'), {
    page: 'admin',
    tab: 'overview',
  });
  assert.equal(routeToHash({ page: 'admin' }), '#/admin');
  assert.equal(routeToHash({ page: 'admin', tab: 'overview' }), '#/admin');
  assert.equal(routeToHash({ page: 'admin', tab: 'orders' }), '#/admin/orders');
  assert.equal(
    routeToHash({ page: 'admin', tab: 'inventory' }),
    '#/admin/inventory',
  );
  assert.deepEqual(parseHashToRoute('#/admin/latency'), {
    page: 'admin',
    tab: 'latency',
  });
  assert.equal(
    routeToHash({ page: 'admin', tab: 'latency' }),
    '#/admin/latency',
  );
});

test('GET /api/system-health/metrics builds chronological latency series, rolling averages, P95 percentiles, and threshold alerts', async () => {
  // 1. Pure metrics helpers
  assert.equal(sanitizeMetricsLimit('999'), 60);
  assert.equal(sanitizeMetricsLimit('1'), 5);
  assert.equal(sanitizeMetricsLimit('abc', 25), 25);
  assert.equal(calculatePercentile([], 95), null);
  assert.equal(calculatePercentile([20, 40, 60, 80, 100], 95), 100);
  assert.equal(calculatePercentile([20, 40, 60, 80, 100], 50), 60);

  const rawSamples = [
    {
      checkedAt: '2026-11-23T06:00:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 30,
    },
    {
      checkedAt: '2026-11-23T06:00:15.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 60,
    },
    {
      checkedAt: '2026-11-23T06:00:30.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 620,
    },
    {
      checkedAt: '2026-11-23T06:00:45.000Z',
      status: 'degraded' as const,
      databaseStatus: 'disconnected' as const,
      latencyMs: null,
    },
  ];

  const series = buildLatencyTrendSeries(rawSamples, 500, 3);
  assert.equal(series.length, 4);
  assert.equal(series[0].timeLabel, '06:00:00');
  assert.equal(series[0].rollingAvgMs, 30);
  assert.equal(series[1].rollingAvgMs, 45);
  assert.equal(series[2].rollingAvgMs, 237);
  assert.equal(series[2].exceedsThreshold, true);
  assert.equal(series[3].latencyMs, null);
  assert.equal(series[3].exceedsThreshold, false);

  const summary = summarizeLatencyMetrics(rawSamples, 500);
  assert.equal(summary.sampleCount, 4);
  assert.equal(summary.connectedCount, 3);
  assert.equal(summary.disconnectedCount, 1);
  assert.equal(summary.minMs, 30);
  assert.equal(summary.maxMs, 620);
  assert.equal(summary.p95Ms, 620);
  assert.equal(summary.thresholdBreaches, 1);
  assert.equal(summary.availabilityPercent, 75);

  // 2. Express HTTP contract test for GET /api/system-health/metrics
  clearHealthHistory();
  const latencies = [42, 58, 540];
  let callIndex = 0;

  const app = createBackendApp({
    probeDatabase: async () => {
      const ms = latencies[Math.min(callIndex, latencies.length - 1)];
      callIndex += 1;
      return {
        connected: true,
        latencyMs: ms,
        message: 'Cloud SQL PostgreSQL responding normally.',
      };
    },
    rateLimit: { enabled: false },
  });

  const server = app.listen(0);
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const res1 = await fetch(
      `${baseUrl}/api/system-health/metrics?limit=20&thresholdMs=500`,
    );
    assert.equal(res1.status, 200);
    assert.equal(res1.headers.get('cache-control'), 'no-store');
    const m1 = (await res1.json()) as SystemHealthMetricsResponse;
    assert.equal(m1.series.length, 1);
    assert.equal(m1.summary.currentMs, 42);
    assert.equal(m1.alert.isAlertActive, false);

    // Second & third live probes -> 540ms triggers high-latency alert
    await fetch(`${baseUrl}/api/system-health/metrics?thresholdMs=500`);
    const res3 = await fetch(
      `${baseUrl}/api/system-health/metrics?limit=20&thresholdMs=500`,
    );
    assert.equal(res3.status, 200);
    const m3 = (await res3.json()) as SystemHealthMetricsResponse;
    assert.equal(m3.series.length, 3);
    assert.equal(m3.summary.currentMs, 540);
    assert.equal(m3.summary.minMs, 42);
    assert.equal(m3.summary.maxMs, 540);
    assert.equal(m3.summary.thresholdBreaches, 1);
    assert.equal(m3.alert.isAlertActive, true);
    assert.equal(m3.alert.severity, 'high-latency');

    // Read-only probe=false returns existing 3 samples without adding a 4th probe
    const resReadOnly = await fetch(
      `${baseUrl}/api/system-health/metrics?probe=false&thresholdMs=600`,
    );
    assert.equal(resReadOnly.status, 200);
    const mRead = (await resReadOnly.json()) as SystemHealthMetricsResponse;
    assert.equal(mRead.series.length, 3);
    assert.equal(mRead.thresholdMs, 600);
    assert.equal(mRead.summary.thresholdBreaches, 0);
    assert.equal(mRead.alert.isAlertActive, false);
  } finally {
    clearHealthHistory();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Cloud SQL connection log CSV exporter formats last 5 attempts, escapes RFC-4180 cells, and neutralizes formula injection', async () => {
  // 1. Cell escaping & formula neutralization
  assert.equal(escapeCsvCell('Normal message'), 'Normal message');
  assert.equal(escapeCsvCell('Comma, "quoted" text'), '"Comma, ""quoted"" text"');
  assert.equal(escapeCsvCell('=CMD("calc")'), `"'=CMD(""calc"")"`);
  assert.equal(escapeCsvCell('+SUM(A1:A2)'), `'+SUM(A1:A2)`);
  assert.equal(escapeCsvCell('@evil'), `'@evil`);
  assert.equal(escapeCsvCell(null), '');

  // 2. CSV builder caps to last 5 entries, preserves chronological order, and computes threshold column
  const entries = Array.from({ length: 6 }, (_, idx) => ({
    sequenceNumber: idx + 1,
    checkedAt: `2026-11-23T06:40:0${idx}.000Z`,
    status: (idx === 4 ? 'degraded' : 'operational') as
      | 'operational'
      | 'degraded',
    databaseStatus: (idx === 4 ? 'disconnected' : 'connected') as
      | 'connected'
      | 'disconnected',
    latencyMs: idx === 4 ? null : idx === 5 ? 640 : 45 + idx * 5,
    message:
      idx === 4
        ? 'Timeout, retry "needed"'
        : idx === 5
          ? '=slow query spike'
          : 'Cloud SQL PostgreSQL instance responding normally.',
    isLatest: idx === 5,
  }));

  const csv = buildConnectionLogsCsv(entries, 500);
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 6); // 1 header + 5 rows
  assert.equal(
    lines[0],
    'Attempt,Timestamp (ISO),Service Status,Database Status,Latency (ms),Threshold (ms),Exceeds Threshold,Diagnostic Output',
  );
  // First exported row should be #02 (oldest of the last 5)
  assert.ok(lines[1].startsWith('#02,2026-11-23T06:40:01.000Z,operational,connected,50,500,No,'));
  // Disconnected row #05 has empty latency, N/A threshold, and properly quoted comma/quotes
  assert.equal(
    lines[4],
    '#05,2026-11-23T06:40:04.000Z,degraded,disconnected,,500,N/A,"Timeout, retry ""needed"""',
  );
  // Latest row #06 exceeds 500ms threshold and neutralizes leading '='
  assert.equal(
    lines[5],
    "#06,2026-11-23T06:40:05.000Z,operational,connected,640,500,Yes,'=slow query spike",
  );

  // 3. Deterministic filesystem-safe filename
  const filename = buildConnectionLogsCsvFilename(
    new Date('2026-11-23T06:45:12.000Z'),
  );
  assert.equal(filename, 'cloud-sql-connection-logs-2026-11-23T06-45-12Z.csv');

  // 4. Express HTTP contract test for GET /api/system-health/logs.csv
  clearHealthHistory();
  let probeIdx = 0;
  const healthApp = createBackendApp({
    probeDatabase: async () => {
      probeIdx += 1;
      return {
        connected: true,
        latencyMs: 35 + probeIdx * 10,
        message: `Probe #${probeIdx} healthy`,
      };
    },
    rateLimit: { enabled: false },
  });
  const server = healthApp.listen(0);
  try {
    const addr = server.address();
    assert.ok(addr && typeof addr === 'object');
    const baseUrl = `http://127.0.0.1:${addr.port}`;

    for (let i = 0; i < 6; i += 1) {
      await fetch(`${baseUrl}/api/system-health`);
    }
    const csvRes = await fetch(`${baseUrl}/api/system-health/logs.csv?thresholdMs=500`);
    assert.equal(csvRes.status, 200);
    assert.ok((csvRes.headers.get('content-type') || '').includes('text/csv'));
    assert.ok(
      (csvRes.headers.get('content-disposition') || '').includes(
        'attachment; filename="cloud-sql-connection-logs-',
      ),
    );
    const body = (await csvRes.text()).replace(/^\uFEFF/, '');
    const csvLines = body.split('\r\n');
    assert.equal(csvLines.length, 6); // header + last 5 attempts
    assert.ok(csvLines[1].startsWith('#03,'));
    assert.ok(csvLines[5].startsWith('#07,'));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    clearHealthHistory();
  }
});

test('Anomaly Detection mode applies standard deviation heuristic (mean + k*sigma) without false positives', () => {
  assert.equal(sanitizeAnomalyMultiplier(0.2), 1.0);
  assert.equal(sanitizeAnomalyMultiplier(9.5), 4.0);
  assert.equal(sanitizeAnomalyMultiplier('2.0'), 2.0);
  assert.equal(sanitizeAnomalyMultiplier('bad', 1.5), 1.5);

  // Fewer than 3 samples -> hasEnoughSamples false, zero false positives
  const tinySeries = buildLatencyTrendSeries(
    [
      {
        checkedAt: '2026-11-23T07:00:00.000Z',
        status: 'operational',
        databaseStatus: 'connected',
        latencyMs: 40,
      },
      {
        checkedAt: '2026-11-23T07:00:05.000Z',
        status: 'operational',
        databaseStatus: 'connected',
        latencyMs: 400,
      },
    ],
    500,
  );
  const tinyResult = detectLatencyAnomalies(tinySeries, 1.5);
  assert.equal(tinyResult.stats.hasEnoughSamples, false);
  assert.equal(tinyResult.stats.anomalyCount, 0);
  assert.equal(tinyResult.points.some((p) => p.isAnomaly), false);

  // Flat constant series (stdDev === 0) -> zero anomalies
  const flatSeries = buildLatencyTrendSeries(
    [0, 1, 2, 3].map((i) => ({
      checkedAt: `2026-11-23T07:01:0${i}.000Z`,
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 55,
    })),
    500,
  );
  const flatResult = detectLatencyAnomalies(flatSeries, 1.5);
  assert.equal(flatResult.stats.hasEnoughSamples, true);
  assert.equal(flatResult.stats.stdDevMs, 0);
  assert.equal(flatResult.stats.anomalyCount, 0);

  // Realistic steady baseline (~50ms) + one clear spike (310ms) + disconnected null sample
  const spikedSeries = buildLatencyTrendSeries(
    [
      {
        checkedAt: '2026-11-23T07:02:00.000Z',
        status: 'operational',
        databaseStatus: 'connected',
        latencyMs: 48,
      },
      {
        checkedAt: '2026-11-23T07:02:05.000Z',
        status: 'operational',
        databaseStatus: 'connected',
        latencyMs: 52,
      },
      {
        checkedAt: '2026-11-23T07:02:10.000Z',
        status: 'operational',
        databaseStatus: 'connected',
        latencyMs: 50,
      },
      {
        checkedAt: '2026-11-23T07:02:15.000Z',
        status: 'operational',
        databaseStatus: 'connected',
        latencyMs: 49,
      },
      {
        checkedAt: '2026-11-23T07:02:20.000Z',
        status: 'operational',
        databaseStatus: 'connected',
        latencyMs: 51,
      },
      {
        checkedAt: '2026-11-23T07:02:25.000Z',
        status: 'degraded',
        databaseStatus: 'disconnected',
        latencyMs: null,
      },
      {
        checkedAt: '2026-11-23T07:02:30.000Z',
        status: 'operational',
        databaseStatus: 'connected',
        latencyMs: 310,
      },
    ],
    500,
  );

  const detected = detectLatencyAnomalies(spikedSeries, 1.5);
  assert.equal(detected.stats.sampleCount, 6);
  assert.equal(detected.stats.hasEnoughSamples, true);
  assert.equal(detected.stats.anomalyCount, 1);
  assert.ok((detected.stats.upperFenceMs ?? 0) < 310);
  assert.equal(detected.points[5].isAnomaly, false); // disconnected point ignored
  assert.equal(detected.points[6].isAnomaly, true);
  assert.ok((detected.points[6].zScore ?? 0) > 1.5);
});

test('24-hour system uptime aggregator builds 24 hourly UTC buckets, excludes stale probes, and ships in GET /api/system-health', async () => {
  const now = new Date('2026-11-23T12:35:00.000Z');
  const samples = [
    // Stale probe (>24h ago) — must be excluded
    {
      checkedAt: '2026-11-22T12:15:00.000Z',
      status: 'degraded' as const,
      databaseStatus: 'disconnected' as const,
      latencyMs: null,
    },
    // Hour -2 (10:00 UTC): 3 operational, 1 degraded -> 75.0% (incident)
    {
      checkedAt: '2026-11-23T10:05:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 40,
    },
    {
      checkedAt: '2026-11-23T10:15:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 60,
    },
    {
      checkedAt: '2026-11-23T10:25:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 50,
    },
    {
      checkedAt: '2026-11-23T10:45:00.000Z',
      status: 'degraded' as const,
      databaseStatus: 'disconnected' as const,
      latencyMs: null,
    },
    // Current hour (12:00 UTC): 2 operational -> 100.0%
    {
      checkedAt: '2026-11-23T12:05:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 45,
    },
    {
      checkedAt: '2026-11-23T12:20:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 55,
    },
  ];

  const series = buildUptime24hSeries(samples, now, 99.9);
  assert.equal(series.buckets.length, 24);
  assert.equal(series.buckets[0].hourLabel, '13:00');
  assert.equal(series.buckets[23].hourLabel, '12:00');
  assert.equal(series.buckets[23].isCurrentHour, true);

  // Hour 10:00 is index 21 (23 - 2)
  assert.equal(series.buckets[21].hourLabel, '10:00');
  assert.equal(series.buckets[21].totalChecks, 4);
  assert.equal(series.buckets[21].healthyChecks, 3);
  assert.equal(series.buckets[21].degradedChecks, 1);
  assert.equal(series.buckets[21].uptimePercent, 75);
  assert.equal(series.buckets[21].avgLatencyMs, 50);
  assert.equal(series.buckets[21].status, 'incident');

  // Empty hour 11:00 (index 22) has null uptime and no-data status
  assert.equal(series.buckets[22].hourLabel, '11:00');
  assert.equal(series.buckets[22].uptimePercent, null);
  assert.equal(series.buckets[22].status, 'no-data');

  // Current hour 12:00 (index 23) is 100.0% operational
  assert.equal(series.buckets[23].uptimePercent, 100);
  assert.equal(series.buckets[23].avgLatencyMs, 50);
  assert.equal(series.buckets[23].status, 'operational');

  // Overall 24h summary: 5 healthy out of 6 in-window checks = 83.3%
  assert.equal(series.summary.totalChecks, 6);
  assert.equal(series.summary.healthyChecks, 5);
  assert.equal(series.summary.degradedChecks, 1);
  assert.equal(series.summary.hoursWithData, 2);
  assert.equal(series.summary.overallUptimePercent, 83.3);
  assert.equal(series.summary.lowestBucketPercent, 75);
  assert.equal(series.summary.meetsSla, false);

  // HTTP contract test: GET /api/system-health returns uptime24h with 24 buckets
  clearHealthHistory();
  const app = createBackendApp({
    probeDatabase: async () => ({
      connected: true,
      latencyMs: 42,
      message: 'Cloud SQL PostgreSQL instance responding normally.',
    }),
    rateLimit: { enabled: false },
  });
  const server = app.listen(0);
  try {
    const addr = server.address();
    assert.ok(addr && typeof addr === 'object');
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/system-health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as SystemHealthSnapshot;
    assert.ok(body.uptime24h);
    assert.equal(body.uptime24h.buckets.length, 24);
    assert.equal(body.uptime24h.summary.overallUptimePercent, 100);
    assert.equal(body.uptime24h.summary.hoursWithData, 1);
    assert.equal(body.uptime24h.buckets[23].uptimePercent, 100);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    clearHealthHistory();
  }
});

test('Last-hour average latency aggregator builds 60 minute UTC buckets, excludes stale probes, and ships in GET /api/system-health', async () => {
  const now = new Date('2026-11-23T12:35:40.000Z');
  const samples = [
    // Older than 60 minutes -> excluded
    {
      checkedAt: '2026-11-23T11:30:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 999,
    },
    // Minute 12:30 (index 54): 2 probes (40ms, 80ms) -> avg 60ms
    {
      checkedAt: '2026-11-23T12:30:10.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 40,
    },
    {
      checkedAt: '2026-11-23T12:30:45.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 80,
    },
    // Minute 12:34 (index 58): 1 disconnected + 1 slow (600ms) -> avg 600ms (exceeds 500ms)
    {
      checkedAt: '2026-11-23T12:34:05.000Z',
      status: 'degraded' as const,
      databaseStatus: 'disconnected' as const,
      latencyMs: null,
    },
    {
      checkedAt: '2026-11-23T12:34:30.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 600,
    },
    // Current minute 12:35 (index 59): 2 probes (50ms, 70ms) -> avg 60ms
    {
      checkedAt: '2026-11-23T12:35:05.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 50,
    },
    {
      checkedAt: '2026-11-23T12:35:30.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 70,
    },
  ];

  const hourly = buildHourlyAverageLatencySeries(samples, now, 500);
  assert.equal(hourly.buckets.length, 60);
  assert.equal(hourly.buckets[0].minuteLabel, '11:36');
  assert.equal(hourly.buckets[59].minuteLabel, '12:35');
  assert.equal(hourly.buckets[59].isCurrentMinute, true);

  // Minute 12:30 -> avg 60ms, min 40ms, max 80ms
  assert.equal(hourly.buckets[54].minuteLabel, '12:30');
  assert.equal(hourly.buckets[54].avgLatencyMs, 60);
  assert.equal(hourly.buckets[54].minLatencyMs, 40);
  assert.equal(hourly.buckets[54].maxLatencyMs, 80);
  assert.equal(hourly.buckets[54].exceedsThreshold, false);

  // Minute 12:34 -> 2 total samples, 1 connected, avg 600ms > 500ms
  assert.equal(hourly.buckets[58].sampleCount, 2);
  assert.equal(hourly.buckets[58].connectedCount, 1);
  assert.equal(hourly.buckets[58].avgLatencyMs, 600);
  assert.equal(hourly.buckets[58].exceedsThreshold, true);

  // Minute 12:35 -> avg 60ms
  assert.equal(hourly.buckets[59].avgLatencyMs, 60);

  // Summary across 5 connected in-window probes: (40+80+600+50+70)/5 = 168ms
  assert.equal(hourly.summary.overallAvgMs, 168);
  assert.equal(hourly.summary.activeMinutes, 3);
  assert.equal(hourly.summary.totalSamples, 6);
  assert.equal(hourly.summary.breachedMinutes, 1);
  assert.equal(hourly.summary.minMinuteAvgMs, 60);
  assert.equal(hourly.summary.maxMinuteAvgMs, 600);
  assert.equal(hourly.summary.latestMinuteAvgMs, 60);

  // HTTP contract test: GET /api/system-health includes hourlyLatency (60 buckets)
  clearHealthHistory();
  let call = 0;
  const app = createBackendApp({
    probeDatabase: async () => {
      call += 1;
      return {
        connected: true,
        latencyMs: call === 1 ? 50 : 70,
        message: 'Cloud SQL PostgreSQL instance responding normally.',
      };
    },
    rateLimit: { enabled: false },
  });
  const server = app.listen(0);
  try {
    const addr = server.address();
    assert.ok(addr && typeof addr === 'object');
    await fetch(`http://127.0.0.1:${addr.port}/api/system-health`);
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/system-health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as SystemHealthSnapshot;
    assert.ok(body.hourlyLatency);
    assert.equal(body.hourlyLatency.buckets.length, 60);
    assert.equal(body.hourlyLatency.summary.totalSamples, 2);
    assert.equal(body.hourlyLatency.summary.overallAvgMs, 60);
    assert.equal(body.hourlyLatency.buckets[59].avgLatencyMs, 60);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    clearHealthHistory();
  }
});

test('Last-hour response time histogram distributes latencies across 7 buckets, classifies threshold bands, and ships in GET /api/system-health', async () => {
  // 1. Threshold band classification
  assert.equal(classifyHistogramBucketBand(0, 50, 250), 'nominal');
  assert.equal(classifyHistogramBucketBand(201, 350, 250), 'warning');
  assert.equal(classifyHistogramBucketBand(351, 500, 250), 'breach');
  assert.equal(classifyHistogramBucketBand(1001, null, 500), 'breach');

  // 2. Bucket distribution, stale exclusion (>60m), disconnected tally, P50/P95 & dominant bucket
  const now = new Date('2026-11-23T14:00:00.000Z');
  const samples = [
    // Stale (>60m ago) -> excluded
    {
      checkedAt: '2026-11-23T12:55:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 1200,
    },
    // 0-50ms (1 probe)
    {
      checkedAt: '2026-11-23T13:10:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 38,
    },
    // 51-100ms (3 probes -> dominant bucket 50.0%)
    {
      checkedAt: '2026-11-23T13:20:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 55,
    },
    {
      checkedAt: '2026-11-23T13:25:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 68,
    },
    {
      checkedAt: '2026-11-23T13:30:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 92,
    },
    // 201-350ms (1 probe)
    {
      checkedAt: '2026-11-23T13:45:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 280,
    },
    // 501-1000ms (1 probe -> breaches 500ms limit)
    {
      checkedAt: '2026-11-23T13:50:00.000Z',
      status: 'operational' as const,
      databaseStatus: 'connected' as const,
      latencyMs: 640,
    },
    // Disconnected probe (tracked separately)
    {
      checkedAt: '2026-11-23T13:55:00.000Z',
      status: 'degraded' as const,
      databaseStatus: 'disconnected' as const,
      latencyMs: null,
    },
  ];

  const hist = buildHourlyLatencyHistogram(samples, now, 500);
  assert.equal(hist.buckets.length, 7);
  assert.equal(hist.summary.totalConnectedSamples, 6);
  assert.equal(hist.summary.disconnectedSamples, 1);
  assert.equal(hist.summary.minMs, 38);
  assert.equal(hist.summary.maxMs, 640);
  assert.equal(hist.summary.dominantBucketLabel, '51–100ms');
  assert.equal(hist.summary.dominantBucketSharePercent, 50);
  assert.equal(hist.summary.withinThresholdPercent, 83.3); // 5 of 6 <= 500ms

  assert.equal(hist.buckets[0].count, 1); // 0-50ms
  assert.equal(hist.buckets[1].count, 3); // 51-100ms
  assert.equal(hist.buckets[2].count, 0); // 101-200ms
  assert.equal(hist.buckets[3].count, 1); // 201-350ms
  assert.equal(hist.buckets[5].count, 1); // 501-1000ms
  assert.equal(hist.buckets[5].band, 'breach');

  // 3. HTTP contract check: GET /api/system-health includes hourlyLatencyHistogram
  clearHealthHistory();
  const seq = [45, 72, 260];
  let idx = 0;
  const app = createBackendApp({
    probeDatabase: async () => {
      const ms = seq[Math.min(idx, seq.length - 1)];
      idx += 1;
      return {
        connected: true,
        latencyMs: ms,
        message: 'Cloud SQL PostgreSQL instance responding normally.',
      };
    },
    rateLimit: { enabled: false },
  });
  const server = app.listen(0);
  try {
    const addr = server.address();
    assert.ok(addr && typeof addr === 'object');
    await fetch(`http://127.0.0.1:${addr.port}/api/system-health`);
    await fetch(`http://127.0.0.1:${addr.port}/api/system-health`);
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/system-health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as SystemHealthSnapshot;
    assert.ok(body.hourlyLatencyHistogram);
    assert.equal(body.hourlyLatencyHistogram.buckets.length, 7);
    assert.equal(body.hourlyLatencyHistogram.summary.totalConnectedSamples, 3);
    assert.equal(body.hourlyLatencyHistogram.buckets[0].count, 1); // 45ms
    assert.equal(body.hourlyLatencyHistogram.buckets[1].count, 1); // 72ms
    assert.equal(body.hourlyLatencyHistogram.buckets[3].count, 1); // 260ms
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    clearHealthHistory();
  }
});

test('Critical Latency threshold sanitizes bounds, flags strictly exceeding points, and takes precedence over warning tier', () => {
  // 1. Sanitization & clamping
  assert.equal(
    sanitizeCriticalLatencyThresholdMs(undefined),
    DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
  );
  assert.equal(sanitizeCriticalLatencyThresholdMs(''), 800);
  assert.equal(sanitizeCriticalLatencyThresholdMs('not-a-number'), 800);
  assert.equal(sanitizeCriticalLatencyThresholdMs(2), 10);
  assert.equal(sanitizeCriticalLatencyThresholdMs(99_999), 10_000);
  assert.equal(sanitizeCriticalLatencyThresholdMs('249.6'), 250);

  // 2. Strict greater-than boundary semantics
  assert.equal(isCriticalLatency(null, 200), false);
  assert.equal(isCriticalLatency(undefined, 200), false);
  assert.equal(isCriticalLatency(Number.NaN, 200), false);
  assert.equal(isCriticalLatency(199, 200), false);
  assert.equal(isCriticalLatency(200, 200), false);
  assert.equal(isCriticalLatency(201, 200), true);

  // 3. Tier classification (critical takes precedence over warning even if critical <= warning)
  assert.equal(classifyChartPointLatencyTier(80, 500, 800), 'nominal');
  assert.equal(classifyChartPointLatencyTier(600, 500, 800), 'warning');
  assert.equal(classifyChartPointLatencyTier(850, 500, 800), 'critical');
  assert.equal(classifyChartPointLatencyTier(150, 500, 100), 'critical');
  assert.equal(classifyChartPointLatencyTier(null, 500, 100), 'nominal');

  // 4. Critical point counter ignores null/disconnected readings
  const sampleLatencies = [42, 95, null, 200, 201, 640, undefined];
  assert.equal(countCriticalLatencyPoints(sampleLatencies, 200), 2);
  assert.equal(countCriticalLatencyPoints(sampleLatencies, 40), 5);
  assert.equal(countCriticalLatencyPoints(sampleLatencies, 1000), 0);
});

test('SystemHealth alert channel preferences sanitize partial payloads and filter latency, downtime, and connection failure alerts independently', () => {
  // 1. Default & sanitization
  assert.deepEqual(sanitizeHealthAlertPreferences(null), DEFAULT_HEALTH_ALERT_PREFERENCES);
  assert.deepEqual(sanitizeHealthAlertPreferences('bad-json'), DEFAULT_HEALTH_ALERT_PREFERENCES);
  assert.deepEqual(sanitizeHealthAlertPreferences({ latency: false, downtime: 'invalid' }), {
    latency: false,
    downtime: true,
    connectionFailure: true,
  });
  assert.equal(
    countEnabledAlertPreferences({ latency: false, downtime: true, connectionFailure: false }),
    1,
  );
  assert.equal(
    countEnabledAlertPreferences({ latency: false, downtime: false, connectionFailure: false }),
    0,
  );

  // 2. Combined latency + downtime incident with all enabled -> both active
  const latencyAndDowntime = evaluateSystemHealthAlerts(
    {
      overallStatus: 'degraded',
      databaseStatus: 'connected',
      latencyMs: 680,
      latencyThresholdMs: 500,
      availabilityPercent: 95.0,
    },
    { latency: true, downtime: true, connectionFailure: true },
  );
  assert.deepEqual(
    latencyAndDowntime.activeAlerts.map((a) => a.type).sort(),
    ['downtime', 'latency'],
  );
  assert.deepEqual(latencyAndDowntime.suppressedTypes, []);

  // 3. Mute latency only -> downtime still fires, latency recorded as suppressed
  const latencyMutedOnly = evaluateSystemHealthAlerts(
    {
      overallStatus: 'degraded',
      databaseStatus: 'connected',
      latencyMs: 680,
      latencyThresholdMs: 500,
      availabilityPercent: 95.0,
    },
    { latency: false, downtime: true, connectionFailure: true },
  );
  assert.deepEqual(
    latencyMutedOnly.activeAlerts.map((a) => a.type),
    ['downtime'],
  );
  assert.deepEqual(latencyMutedOnly.suppressedTypes, ['latency']);

  // 4. Connection failure + downtime incident with only connectionFailure enabled
  const connOnly = evaluateSystemHealthAlerts(
    {
      overallStatus: 'degraded',
      databaseStatus: 'disconnected',
      latencyMs: null,
      availabilityPercent: 80,
      endpointError: null,
    },
    { latency: false, downtime: false, connectionFailure: true },
  );
  assert.deepEqual(
    connOnly.activeAlerts.map((a) => a.type),
    ['connectionFailure'],
  );
  assert.deepEqual(connOnly.suppressedTypes, ['downtime']);

  // 5. All muted -> zero active alerts, all triggered channels listed as suppressed
  const allMuted = evaluateSystemHealthAlerts(
    {
      overallStatus: 'offline',
      databaseStatus: 'disconnected',
      availabilityPercent: 50,
      endpointError: 'Health endpoint unreachable',
    },
    { latency: false, downtime: false, connectionFailure: false },
  );
  assert.equal(allMuted.activeAlerts.length, 0);
  assert.deepEqual(allMuted.suppressedTypes.sort(), [
    'connectionFailure',
    'downtime',
  ]);
});

test('24-hour System Health PDF report aggregates metrics, outputs valid binary PDF bytes, and serves GET /api/system-health/report.pdf', async () => {
  const generatedAt = new Date('2026-11-23T14:30:00.000Z');
  assert.equal(
    buildSystemHealthPdfFilename(generatedAt),
    'system-health-24h-report-2026-11-23T14-30-00Z.pdf',
  );

  const mockSnapshot: SystemHealthSnapshot = {
    service: 'sport-castle-backend',
    overallStatus: 'operational',
    checkedAt: generatedAt.toISOString(),
    startedAt: '2026-11-22T14:00:00.000Z',
    uptimeSeconds: 88_200,
    uptimeFormatted: '1d 0h 30m',
    availabilityPercent: 100,
    database: {
      engine: 'PostgreSQL (Cloud SQL)',
      status: 'connected',
      latencyMs: 52,
      pool: { total: 4, idle: 3, waiting: 0 },
      message: 'Cloud SQL PostgreSQL instance responding normally.',
    },
    runtime: {
      nodeVersion: 'v22.23.2',
      memoryRssMb: 412.5,
      heapUsedMb: 128.4,
    },
    recentChecks: [
      {
        checkedAt: '2026-11-23T14:05:00.000Z',
        status: 'operational',
        databaseStatus: 'connected',
        latencyMs: 48,
        message: 'Cloud SQL PostgreSQL instance responding normally.',
      },
      {
        checkedAt: '2026-11-23T14:15:00.000Z',
        status: 'operational',
        databaseStatus: 'connected',
        latencyMs: 540,
        message: 'Cloud SQL PostgreSQL instance responding normally.',
      },
      {
        checkedAt: '2026-11-23T14:25:00.000Z',
        status: 'operational',
        databaseStatus: 'connected',
        latencyMs: 890,
        message: 'Cloud SQL PostgreSQL instance responding normally.',
      },
    ],
  };

  // 1. Summary aggregator computes accurate 24h uptime, latency stats, and breach/critical counts
  const summary = build24hHealthReportSummary(mockSnapshot, {
    alertThresholdMs: 500,
    criticalThresholdMs: 800,
    alertPreferences: { latency: true, downtime: false, connectionFailure: true },
    generatedAt,
  });
  assert.equal(summary.uptime24h.buckets.length, 24);
  assert.equal(summary.uptime24h.summary.overallUptimePercent, 100);
  assert.equal(summary.latencyStats.sampleCount, 3);
  assert.equal(summary.latencyStats.minMs, 48);
  assert.equal(summary.latencyStats.maxMs, 890);
  assert.equal(summary.latencyStats.thresholdBreaches, 2); // 540ms & 890ms > 500ms
  assert.equal(summary.latencyStats.criticalCount, 1); // 890ms > 800ms
  assert.equal(summary.alertPreferences.downtime, false);
  assert.equal(summary.recentConnectionLogs.length, 3);

  // 2. Binary PDF output starts with %PDF-, ends with %%EOF, and embeds expected report sections
  const pdfBytes = generateSystemHealthPdfBytes(mockSnapshot, {
    alertThresholdMs: 500,
    criticalThresholdMs: 800,
    generatedAt,
  });
  assert.ok(pdfBytes instanceof Uint8Array);
  assert.ok(pdfBytes.byteLength > 2000);
  const pdfAscii = Buffer.from(pdfBytes).toString('latin1');
  assert.ok(pdfAscii.startsWith('%PDF-'));
  assert.ok(pdfAscii.trimEnd().endsWith('%%EOF'));
  assert.ok(pdfAscii.includes('24-Hour System Health Summary Report'));
  assert.ok(pdfAscii.includes('OPERATIONAL'));

  // 3. Express HTTP contract check for GET /api/system-health/report.pdf
  clearHealthHistory();
  const app = createBackendApp({
    probeDatabase: async () => ({
      connected: true,
      latencyMs: 64,
      message: 'Cloud SQL PostgreSQL instance responding normally.',
    }),
    rateLimit: { enabled: false },
  });
  const server = app.listen(0);
  try {
    const addr = server.address();
    assert.ok(addr && typeof addr === 'object');
    const res = await fetch(
      `http://127.0.0.1:${addr.port}/api/system-health/report.pdf?thresholdMs=400&criticalThresholdMs=750`,
    );
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.ok(
      (res.headers.get('content-disposition') || '').includes(
        'attachment; filename="system-health-24h-report-',
      ),
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    const text = Buffer.from(bytes).toString('latin1');
    assert.ok(text.startsWith('%PDF-'));
    assert.ok(text.trimEnd().endsWith('%%EOF'));
    assert.ok(text.includes('400 ms'));
    assert.ok(text.includes('750 ms'));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    clearHealthHistory();
  }
});









test('Telegram order message includes the kit version, fit and sleeve', () => {
  const msg = formatTelegramOrderMessage({
    id: 'SC-1001',
    createdAt: new Date().toISOString(),
    status: 'Confirmed',
    fulfillmentMethod: 'pickup',
    pickupBranch: 'sonthormuk',
    customer: { fullName: 'Dara', phone: '+85512000000', telegram: '@dara', khan: '', sangkat: '', streetAddress: '', notes: '' },
    paymentMethod: 'aba-khqr',
    items: [
      {
        lineId: 'x',
        productId: 'jersey-madrid-2627-home',
        slug: 'real-madrid-2026-27-home-authentic-jersey',
        name: 'Real Madrid 2026/27 Home Jersey',
        brand: 'Adidas',
        category: 'jerseys',
        colorway: 'White',
        image: '',
        size: 'M',
        basePrice: 153,
        unitPrice: 153,
        quantity: 1,
        variant: { version: 'Player', fit: 'Men', sleeve: 'Long' },
      },
    ],
    subtotal: 153,
    teamDiscount: 0,
    promoDiscount: 0,
    shippingFee: 0,
    totalUsd: 153,
    totalKhr: 0,
  });
  assert.ok(msg.includes('Real Madrid 2026/27 Home Jersey (M) [Player / Men / Long sleeve]'));
});
