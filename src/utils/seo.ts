import type { CatalogProduct } from '../lib/mock-store/catalog';
import { STUDIO_IMAGES } from '../data/catalog';

export const SITE_BRAND_NAME = 'SPORT CASTLE';
export const DEFAULT_SITE_ORIGIN = 'https://sportcastle.com.kh';

export interface SeoMetaPayload {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'product';
  ogSiteName: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt: string;
  ogUrl: string;
  twitterCard: 'summary_large_image';
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterImageAlt: string;
  productMeta?: {
    priceAmount: string;
    priceCurrency: string;
    availability: 'in stock' | 'out of stock';
    brand: string;
    retailerItemId: string;
    category: string;
  };
  jsonLd?: Record<string, unknown>;
}

/**
 * Resolves a local asset path (e.g. `/src/assets/images/...jpg`) or full URL
 * into a clean absolute URL suitable for OpenGraph, Twitter Cards, and Schema.org.
 */
export function resolveAbsoluteUrl(
  pathOrUrl: string,
  siteOrigin: string = DEFAULT_SITE_ORIGIN,
): string {
  const trimmed = pathOrUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const normalizedOrigin = siteOrigin.replace(/\/+$/, '');
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${normalizedOrigin}${normalizedPath}`;
}

/**
 * Trims SEO titles or meta descriptions cleanly at a word boundary
 * without breaking words mid-character.
 */
export function truncateMetaText(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;

  const sliced = normalized.slice(0, Math.max(0, maxLength - 1));
  const lastSpace = sliced.lastIndexOf(' ');
  const boundary = lastSpace > Math.floor(maxLength * 0.6) ? lastSpace : sliced.length;
  return `${sliced.slice(0, boundary).replace(/[.,;:\-–—\s]+$/, '')}…`;
}

/**
 * Builds the baseline storefront SEO metadata matching `index.html`,
 * used when leaving a Product Detail Page to restore global site metadata.
 */
export function buildDefaultSiteSeo(
  siteOrigin: string = DEFAULT_SITE_ORIGIN,
  pathname: string = '/',
): SeoMetaPayload {
  const normalizedPath = pathname || '/';
  const canonicalUrl = `${siteOrigin.replace(/\/+$/, '')}${normalizedPath}`;
  const defaultImage = resolveAbsoluteUrl(STUDIO_IMAGES.mercurial, siteOrigin);
  const title = "SPORT CASTLE — Phnom Penh's Football, Futsal & F1 Atelier";
  const description =
    'Shop authentic pro football boots, 2026/27 UEFA Champions League & Top 5 League kits, Cambodia Varaman jerseys, and F1 paddock teamwear in Phnom Penh.';

  return {
    title,
    description,
    canonicalUrl,
    ogType: 'website',
    ogSiteName: SITE_BRAND_NAME,
    ogTitle: title,
    ogDescription:
      'Authentic football boots matched to Phnom Penh pitches, 2026/27 club kits, and same-day pro jersey printing across Sonthormuk, Sen Sok & Chomkadong.',
    ogImage: defaultImage,
    ogImageAlt: 'SPORT CASTLE Phnom Penh flagship football boots and 2026/27 kits',
    ogUrl: canonicalUrl,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription:
      'Authentic football boots, 2026/27 European kits, Cambodia national jerseys & F1 teamwear in Phnom Penh.',
    twitterImage: defaultImage,
    twitterImageAlt: 'SPORT CASTLE Phnom Penh flagship football boots and 2026/27 kits',
  };
}

/**
 * Builds complete, search-engine-optimized metadata for an active Product Detail Page:
 * - Specific branded `<title>` (concise for SERP display)
 * - 120–160 character `<meta name="description">` with price, colorway & CTA
 * - Full OpenGraph (`og:type="product"`, `og:image`, `product:price:*`, `product:availability`)
 * - Twitter / X `summary_large_image` card
 * - Schema.org `Product` JSON-LD structured data with `Offer` & `AggregateRating`
 */
export function buildProductSeoMetadata(
  product: CatalogProduct,
  siteOrigin: string = DEFAULT_SITE_ORIGIN,
  pathname: string = '/',
): SeoMetaPayload {
  const normalizedOrigin = siteOrigin.replace(/\/+$/, '');
  const normalizedPath = pathname || '/';
  const canonicalUrl = `${normalizedOrigin}${normalizedPath}#/products/${product.slug}`;
  const absoluteImageUrl = resolveAbsoluteUrl(product.image, normalizedOrigin);

  // Keep page title crisp and branded (~35-65 chars)
  const fullCandidate = `${product.name} | ${SITE_BRAND_NAME}`;
  const title =
    fullCandidate.length <= 68
      ? fullCandidate
      : `${truncateMetaText(product.name, 52)} | ${SITE_BRAND_NAME}`;

  // Craft a compelling 120-160 character product meta description with price & local CTA
  const priceFormatted = `$${product.price.toFixed(2)}`;
  const rawDescription = `Shop ${product.name} (${product.colorway}) for ${priceFormatted} at ${SITE_BRAND_NAME} Phnom Penh. ${product.summary}`;
  const description = truncateMetaText(rawDescription, 158);

  const imageAlt = `${product.name} — ${product.colorway}`;
  const inStock = product.totalUnitsAvailable > 0;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    description: product.summary,
    image: [absoluteImageUrl],
    category: product.subcategory,
    color: product.colorway,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'USD',
      price: product.price.toFixed(2),
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'SPORT CASTLE Cambodia',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating.toFixed(1),
      reviewCount: product.reviewCount,
    },
  };

  return {
    title,
    description,
    canonicalUrl,
    ogType: 'product',
    ogSiteName: SITE_BRAND_NAME,
    ogTitle: title,
    ogDescription: description,
    ogImage: absoluteImageUrl,
    ogImageAlt: imageAlt,
    ogUrl: canonicalUrl,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: absoluteImageUrl,
    twitterImageAlt: imageAlt,
    productMeta: {
      priceAmount: product.price.toFixed(2),
      priceCurrency: 'USD',
      availability: inStock ? 'in stock' : 'out of stock',
      brand: product.brand,
      retailerItemId: product.sku,
      category: product.subcategory,
    },
    jsonLd,
  };
}
