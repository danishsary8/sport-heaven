import type {
  KitFit,
  KitVariant,
  KitVersion,
  Product,
  SleeveLength,
  TeamType,
} from '../types/store';

/** Extra cost of the Player (authentic, match-spec) version over the Fan version. */
export const PLAYER_VERSION_PREMIUM = 55;

/** Brands that only make one (fan) version of their kits. */
const FAN_ONLY_BRANDS = new Set(['Varaman']);

/**
 * Real photo overrides, keyed by product slug. Filled by `npm run images`
 * (Project 2). Empty until photos are added to public/products/<slug>/.
 */
export type ProductImageManifest = Record<string, { front?: string; back?: string; gallery?: string[]; details?: string[] }>;

export function isJersey(product: Pick<Product, 'category'>): boolean {
  return product.category === 'jerseys';
}

export function deriveTeamType(product: Pick<Product, 'league'>): TeamType {
  return product.league === 'International' ? 'national' : 'club';
}

function deriveVersions(product: Product): KitVersion[] {
  if (product.isRetro || FAN_ONLY_BRANDS.has(product.brand)) return ['Fan'];
  return ['Fan', 'Player'];
}

function deriveFits(product: Product): KitFit[] {
  if (product.category === 'f1') return ['Men', 'Women'];
  if (product.isRetro) return ['Men'];
  if (FAN_ONLY_BRANDS.has(product.brand)) return ['Men', 'Kids'];
  return ['Men', 'Women', 'Kids'];
}

function deriveSleeves(product: Product): SleeveLength[] {
  if (product.garmentType === 'jacket') return ['Long'];
  if (product.category === 'f1') return ['Short'];
  // Current-season home kits from the big brands also come in long sleeve.
  if (!product.isRetro && product.kitType === 'Home' && !FAN_ONLY_BRANDS.has(product.brand)) {
    return ['Short', 'Long'];
  }
  return ['Short'];
}

/**
 * Fills in the structured fields (team type, versions, fits, sleeves, media)
 * for one product. Values already set on the product win over derived ones.
 */
export function enrichProduct(product: Product, manifest: ProductImageManifest = {}): Product {
  const photos = manifest[product.slug] ?? {};
  const media = {
    ...product.media,
    front: photos.front ?? product.media?.front ?? product.image,
    back: photos.back ?? product.media?.back,
    gallery: photos.gallery ?? product.media?.gallery,
    details: photos.details ?? product.media?.details,
  };
  const enriched: Product = { ...product, media, image: media.front };

  if (isJersey(product)) {
    enriched.teamType = product.teamType ?? deriveTeamType(product);
    enriched.versions = product.versions ?? deriveVersions(product);
  }
  if (isJersey(product) || product.category === 'f1') {
    enriched.fits = product.fits ?? deriveFits(product);
    enriched.sleeves = product.sleeves ?? deriveSleeves(product);
  }
  return enriched;
}

export function getDefaultKitVariant(product: Product): KitVariant {
  return {
    version: product.versions?.[0] ?? 'Fan',
    fit: product.fits?.[0] ?? 'Men',
    sleeve: product.sleeves?.[0] ?? 'Short',
  };
}

/** Price for a kit in the chosen variant (Player version adds a premium). */
export function getVariantPrice(product: Pick<Product, 'price'>, variant?: Pick<KitVariant, 'version'>): number {
  return product.price + (variant?.version === 'Player' ? PLAYER_VERSION_PREMIUM : 0);
}

export function formatKitVariant(variant: KitVariant): string {
  return `${variant.version} version, ${variant.fit}, ${variant.sleeve.toLowerCase()} sleeve`;
}
