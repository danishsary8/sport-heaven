import type {
  AccountSection,
  AdminTab,
  PageRoute,
  PolicySlug,
  ProductCategory,
  SortOption,
} from '../types/store';
import {
  BLOG_ARTICLES,
  BRAND_PROFILES,
  CAMPAIGN_BY_SLUG,
  CAMPAIGN_LANDINGS,
  COLLECTION_CATALOG,
  LEGAL_POLICIES,
} from '../data/editorial';
import { PRODUCTS } from '../data/catalog';

const VALID_CATEGORIES = new Set<ProductCategory>([
  'boots',
  'jerseys',
  'f1',
  'balls',
  'essentials',
]);

const VALID_POLICIES = new Set<PolicySlug>([
  'privacy-policy',
  'terms-of-service',
  'shipping-policy',
  'refund-policy',
  'cookie-policy',
]);

export const VALID_SORT_OPTIONS = new Set<SortOption>([
  'featured',
  'best-sellers',
  'price-asc',
  'price-desc',
  'newest',
  'rating-desc',
  'weight-asc',
]);

export const SORT_OPTION_LABELS: Record<SortOption, string> = {
  featured: 'Recommended',
  'best-sellers': 'Best Sellers',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  newest: 'Newest Arrivals',
  'rating-desc': 'Top Rated',
  'weight-asc': 'Lightest Weight First',
};

/**
 * Parses and validates a URL `sort` query param into a canonical `SortOption`.
 * Accepts friendly aliases (e.g., `price_asc`, `top-rated`) and falls back safely to `featured`.
 */
export function parseSortParam(raw: string | null | undefined): SortOption {
  if (!raw) return 'featured';
  const normalized = raw.trim().toLowerCase().replace(/_/g, '-');
  if (VALID_SORT_OPTIONS.has(normalized as SortOption)) {
    return normalized as SortOption;
  }
  const aliasMap: Record<string, SortOption> = {
    recommended: 'featured',
    bestsellers: 'best-sellers',
    'best-selling': 'best-sellers',
    'low-to-high': 'price-asc',
    'high-to-low': 'price-desc',
    'top-rated': 'rating-desc',
    rating: 'rating-desc',
    lightest: 'weight-asc',
  };
  return aliasMap[normalized] ?? 'featured';
}

/**
 * Updates only the `sort` query parameter on a collection hash URL without altering the collection path.
 * Omits `?sort=` when `nextSort === 'featured'` to keep default collection URLs canonical.
 */
export function buildCollectionHashWithSort(
  rawHash: string,
  nextSort: SortOption,
  fallbackCollectionSlug = 'all',
): string {
  const withoutHash = rawHash.replace(/^#/, '').trim();
  const [rawPath = '', rawQuery = ''] = withoutHash.split('?');
  const pathPart =
    rawPath && (rawPath.startsWith('/collections') || rawPath.startsWith('/shop'))
      ? rawPath.replace(/\/+$/, '')
      : `/collections/${fallbackCollectionSlug}`;

  const params = new URLSearchParams(rawQuery);
  if (nextSort === 'featured') {
    params.delete('sort');
  } else {
    params.set('sort', nextSort);
  }
  const serialized = params.toString();
  return serialized ? `#${pathPart}?${serialized}` : `#${pathPart}`;
}

/**
 * Pure hash router parser supporting ALL 35 canonical enterprise e-commerce URLs
 * plus backward-compatible aliases (#/shop, #/product/:slug, #/branches, #/orders).
 */
export function parseHashToRoute(rawHash: string): PageRoute {
  const withoutHash = rawHash.replace(/^#/, '').trim();
  if (!withoutHash || withoutHash === '/') return { page: 'home' };

  const [pathPart, queryPart = ''] = withoutHash.split('?');
  const segments = pathPart
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);

  if (segments.length === 0) return { page: 'home' };

  const [s0, s1, s2] = segments;
  const params = new URLSearchParams(queryPart);

  switch (s0) {
    // 1. Storefront & Discovery
    case 'collections': {
      const slug = s1 || 'all';
      const parsedSort = parseSortParam(params.get('sort'));
      const filterParams = new URLSearchParams(params);
      filterParams.delete('sort');
      const serializedFilters = filterParams.toString().replace(/%2C/g, ',');
      return {
        page: 'shop',
        collectionSlug: slug,
        ...(parsedSort !== 'featured' ? { sort: parsedSort } : {}),
        ...(serializedFilters ? { params: serializedFilters } : {}),
      };
    }
    case 'shop': {
      const parsedSort = parseSortParam(params.get('sort'));
      if (s1 && VALID_CATEGORIES.has(s1 as ProductCategory)) {
        return parsedSort !== 'featured'
          ? { page: 'shop', initialCategory: s1 as ProductCategory, sort: parsedSort }
          : { page: 'shop', initialCategory: s1 as ProductCategory };
      }
      return parsedSort !== 'featured'
        ? { page: 'shop', collectionSlug: 'all', initialCategory: 'all', sort: parsedSort }
        : { page: 'shop', collectionSlug: 'all', initialCategory: 'all' };
    }
    case 'brands': {
      if (s1) return { page: 'brand', slug: s1 };
      return { page: 'shop', collectionSlug: 'all' };
    }
    case 'search': {
      return { page: 'search', query: params.get('q') ?? '' };
    }

    // 2. Product & Conversion
    case 'products':
    case 'product': {
      if (s1 === 'gift-card') return { page: 'gift-card' };
      if (s1) return { page: 'product', slug: s1 };
      return { page: 'shop', collectionSlug: 'all' };
    }
    case 'cart':
      return { page: 'cart' };
    case 'checkout': {
      if (s1 === 'thank-you') {
        return { page: 'thank-you', orderId: params.get('order') ?? s2 };
      }
      return { page: 'checkout' };
    }

    // 3. Customer Account & Self-Service
    case 'account': {
      if (!s1) return { page: 'account', section: 'overview' };
      if (s1 === 'login') return { page: 'login' };
      if (s1 === 'register') return { page: 'register' };
      if (s1 === 'recover') return { page: 'recover' };
      if (s1 === 'orders') {
        return { page: 'account', section: 'orders', orderId: s2 };
      }
      if (s1 === 'addresses' || s1 === 'payments' || s1 === 'wishlist') {
        return { page: 'account', section: s1 as AccountSection };
      }
      return { page: 'not-found', attemptedPath: `/${segments.join('/')}` };
    }

    // 4 & 5. Support, Post-Purchase, About, Campaigns, Sitemap
    case 'pages': {
      if (s1 === 'track-order') {
        const orderId = params.get('order') ?? undefined;
        const email = params.get('email') ?? undefined;
        return {
          page: 'orders',
          ...(orderId ? { orderId } : {}),
          ...(email ? { email } : {}),
        };
      }
      if (s1 === 'returns') return { page: 'returns' };
      if (s1 === 'faq') return { page: 'faq' };
      if (s1 === 'contact') return { page: 'contact' };
      if (s1 === 'stores') return { page: 'branches' };
      if (s1 === 'about') return { page: 'about' };
      if (s1 === 'sitemap') return { page: 'sitemap' };
      if (s1 && CAMPAIGN_BY_SLUG.has(s1)) {
        return { page: 'campaign', slug: s1 };
      }
      return { page: 'not-found', attemptedPath: `/${segments.join('/')}` };
    }

    // 5. Blog / Editorial Hub
    case 'blogs': {
      if (s1 === 'news' && s2) return { page: 'blog-post', slug: s2 };
      if (!s1 || s1 === 'news') return { page: 'blog' };
      return { page: 'not-found', attemptedPath: `/${segments.join('/')}` };
    }

    // 6. Legal & Compliance
    case 'policies': {
      if (s1 && VALID_POLICIES.has(s1 as PolicySlug)) {
        return { page: 'policy', slug: s1 as PolicySlug };
      }
      return { page: 'not-found', attemptedPath: `/${segments.join('/')}` };
    }

    // 7. System & Utility + Sport Castle Signature Tools
    case '404':
      return { page: 'not-found', attemptedPath: params.get('from') ?? '/404' };
    case 'maintenance':
    case '500':
      return { page: 'maintenance' };
    case 'system-health':
      return { page: 'system-health' };
    case 'admin': {
      const validTabs = new Set<AdminTab>([
        'overview',
        'orders',
        'inventory',
        'latency',
        'webhooks',
        'notifications',
      ]);
      if (s1 && validTabs.has(s1 as AdminTab)) {
        return { page: 'admin', tab: s1 as AdminTab };
      }
      return { page: 'admin', tab: 'overview' };
    }
    case 'lookbooks':
      return { page: 'lookbooks' };
    case 'custom-studio':
      return { page: 'custom-studio', productSlug: s1 };
    case 'boot-finder':
      return { page: 'boot-finder' };
    case 'branches':
      return { page: 'branches' };
    case 'orders':
      return { page: 'orders' };

    default:
      return { page: 'not-found', attemptedPath: `/${segments.join('/')}` };
  }
}

export function routeToHash(route: PageRoute): string {
  switch (route.page) {
    case 'home':
      return '#/';
    case 'shop': {
      const query = new URLSearchParams(route.params ?? '');
      if (route.sort && route.sort !== 'featured') query.set('sort', route.sort);
      const serialized = query.toString().replace(/%2C/g, ',');
      const suffix = serialized ? `?${serialized}` : '';
      if (route.collectionSlug) {
        return `#/collections/${route.collectionSlug}${suffix}`;
      }
      if (route.initialCategory && route.initialCategory !== 'all') {
        const slugMap: Record<ProductCategory, string> = {
          boots: 'football-boots',
          jerseys: 'jerseys-kits',
          f1: 'f1-motorsport',
          balls: 'match-balls',
          essentials: 'gk-essentials',
        };
        return `#/collections/${slugMap[route.initialCategory]}${suffix}`;
      }
      return `#/collections/all${suffix}`;
    }
    case 'brand':
      return `#/brands/${route.slug}`;
    case 'search':
      return route.query.trim()
        ? `#/search?q=${encodeURIComponent(route.query.trim())}`
        : '#/search';
    case 'product':
      return `#/products/${route.slug}`;
    case 'gift-card':
      return '#/products/gift-card';
    case 'cart':
      return '#/cart';
    case 'checkout':
      return '#/checkout';
    case 'thank-you':
      return route.orderId
        ? `#/checkout/thank-you?order=${encodeURIComponent(route.orderId)}`
        : '#/checkout/thank-you';
    case 'login':
      return '#/account/login';
    case 'register':
      return '#/account/register';
    case 'recover':
      return '#/account/recover';
    case 'account':
      if (!route.section || route.section === 'overview') return '#/account';
      if (route.section === 'orders' && route.orderId) {
        return `#/account/orders/${route.orderId}`;
      }
      return `#/account/${route.section}`;
    case 'orders': {
      const q = new URLSearchParams();
      if (route.orderId) q.set('order', route.orderId);
      if (route.email) q.set('email', route.email);
      const suffix = q.toString();
      return suffix ? `#/pages/track-order?${suffix}` : '#/pages/track-order';
    }
    case 'returns':
      return '#/pages/returns';
    case 'faq':
      return '#/pages/faq';
    case 'contact':
      return '#/pages/contact';
    case 'branches':
      return '#/pages/stores';
    case 'about':
      return '#/pages/about';
    case 'blog':
      return '#/blogs/news';
    case 'blog-post':
      return `#/blogs/news/${route.slug}`;
    case 'campaign':
      return `#/pages/${route.slug}`;
    case 'lookbooks':
      return '#/lookbooks';
    case 'custom-studio':
      return route.productSlug
        ? `#/custom-studio/${route.productSlug}`
        : '#/custom-studio';
    case 'boot-finder':
      return '#/boot-finder';
    case 'policy':
      return `#/policies/${route.slug}`;
    case 'maintenance':
      return '#/maintenance';
    case 'sitemap':
      return '#/pages/sitemap';
    case 'system-health':
      return '#/system-health';
    case 'admin':
      return !route.tab || route.tab === 'overview'
        ? '#/admin'
        : `#/admin/${route.tab}`;
    case 'not-found':
      return '#/404';
  }
}

/**
 * Generates a dynamic XML Sitemap string covering all collections, brands, products,
 * editorial articles, campaigns, support pages, and legal disclosures.
 */
export function buildXmlSitemap(baseUrl = 'https://sportcastle.com.kh'): string {
  const staticPaths = [
    '/#/',
    '/#/collections/all',
    '/#/products/gift-card',
    '/#/lookbooks',
    '/#/custom-studio',
    '/#/boot-finder',
    '/#/blogs/news',
    '/#/pages/about',
    '/#/pages/stores',
    '/#/pages/track-order',
    '/#/pages/returns',
    '/#/pages/faq',
    '/#/pages/contact',
    '/#/pages/sitemap',
  ];

  const dynamicPaths = [
    ...COLLECTION_CATALOG.filter((c) => c.slug !== 'all').map(
      (c) => `/#/collections/${c.slug}`,
    ),
    ...BRAND_PROFILES.map((b) => `/#/brands/${b.slug}`),
    ...BLOG_ARTICLES.map((a) => `/#/blogs/news/${a.slug}`),
    ...CAMPAIGN_LANDINGS.map((c) => `/#/pages/${c.slug}`),
    ...(Object.keys(LEGAL_POLICIES) as PolicySlug[]).map(
      (p) => `/#/policies/${p}`,
    ),
    ...PRODUCTS.map((p) => `/#/products/${p.slug}`),
  ];

  const urls = [...staticPaths, ...dynamicPaths]
    .map(
      (path) =>
        `  <url>\n    <loc>${baseUrl}${path}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export function buildRobotsTxt(baseUrl = 'https://sportcastle.com.kh'): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /#/account/login',
    'Disallow: /#/account/register',
    'Disallow: /#/account/recover',
    'Disallow: /#/checkout',
    'Disallow: /#/cart',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ].join('\n');
}
