import { useEffect } from 'react';
import type { CatalogProduct } from '../lib/mock-store/catalog';
import {
  buildDefaultSiteSeo,
  buildProductSeoMetadata,
  DEFAULT_SITE_ORIGIN,
  type SeoMetaPayload,
} from '../utils/seo';

const PRODUCT_JSONLD_SCRIPT_ID = 'sport-castle-product-jsonld';
const DYNAMIC_PRODUCT_ATTR = 'data-seo-dynamic';

function upsertMetaTag(
  attrType: 'name' | 'property',
  attrValue: string,
  content: string,
  markDynamic = false,
): void {
  const selector = `meta[${attrType}="${attrValue}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrType, attrValue);
    if (markDynamic) {
      element.setAttribute(DYNAMIC_PRODUCT_ATTR, 'product');
    }
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertJsonLdScript(data?: Record<string, unknown>): void {
  const existing = document.getElementById(PRODUCT_JSONLD_SCRIPT_ID);
  if (!data) {
    existing?.remove();
    return;
  }

  let script = existing as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = PRODUCT_JSONLD_SCRIPT_ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

function removeDynamicProductMetaTags(): void {
  const nodes = document.head.querySelectorAll<HTMLMetaElement>(
    `meta[${DYNAMIC_PRODUCT_ATTR}="product"]`,
  );
  nodes.forEach((node) => node.remove());
}

function applySeoToDocument(payload: SeoMetaPayload): void {
  document.title = payload.title;

  // Standard SEO & Canonical
  upsertMetaTag('name', 'description', payload.description);
  upsertCanonicalLink(payload.canonicalUrl);

  // OpenGraph Tags
  upsertMetaTag('property', 'og:type', payload.ogType);
  upsertMetaTag('property', 'og:site_name', payload.ogSiteName);
  upsertMetaTag('property', 'og:title', payload.ogTitle);
  upsertMetaTag('property', 'og:description', payload.ogDescription);
  upsertMetaTag('property', 'og:image', payload.ogImage);
  upsertMetaTag('property', 'og:image:alt', payload.ogImageAlt);
  upsertMetaTag('property', 'og:url', payload.ogUrl);

  // Twitter / X Social Card Tags
  upsertMetaTag('name', 'twitter:card', payload.twitterCard);
  upsertMetaTag('name', 'twitter:title', payload.twitterTitle);
  upsertMetaTag('name', 'twitter:description', payload.twitterDescription);
  upsertMetaTag('name', 'twitter:image', payload.twitterImage);
  upsertMetaTag('name', 'twitter:image:alt', payload.twitterImageAlt);

  // Product-specific OpenGraph Commerce Tags
  if (payload.productMeta) {
    upsertMetaTag(
      'property',
      'product:price:amount',
      payload.productMeta.priceAmount,
      true,
    );
    upsertMetaTag(
      'property',
      'product:price:currency',
      payload.productMeta.priceCurrency,
      true,
    );
    upsertMetaTag(
      'property',
      'product:availability',
      payload.productMeta.availability,
      true,
    );
    upsertMetaTag('property', 'product:brand', payload.productMeta.brand, true);
    upsertMetaTag(
      'property',
      'product:retailer_item_id',
      payload.productMeta.retailerItemId,
      true,
    );
    upsertMetaTag(
      'property',
      'product:category',
      payload.productMeta.category,
      true,
    );
  } else {
    removeDynamicProductMetaTags();
  }

  // Schema.org Product JSON-LD
  upsertJsonLdScript(payload.jsonLd);
}

/**
 * Dynamic SEO Meta-Tag Manager hook for Product Detail Pages.
 * Synchronizes document `<title>`, `<meta name="description">`, OpenGraph (`og:*` & `product:*`),
 * Twitter Card tags, canonical `<link>`, and Schema.org `Product` JSON-LD with the active product,
 * and cleanly restores global storefront metadata upon leaving the PDP.
 */
export function useProductSeo(product: CatalogProduct | undefined): void {
  useEffect(() => {
    if (typeof document === 'undefined' || !product) return;

    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : DEFAULT_SITE_ORIGIN;
    const pathname =
      typeof window !== 'undefined' ? window.location.pathname || '/' : '/';

    const productSeo = buildProductSeoMetadata(product, origin, pathname);
    applySeoToDocument(productSeo);

    return () => {
      const defaultSeo = buildDefaultSiteSeo(origin, pathname);
      applySeoToDocument(defaultSeo);
    };
  }, [product]);
}
