import { buildUrl } from '../../../lib/api';
import type { HomeSection, ProductSummary } from '../api';

/**
 * Typed readers for home section payloads.
 *
 * The API keeps payloads open (staff edit them as small CMS records), so every field is read
 * defensively: a missing or mistyped field gives a safe default instead of breaking the page.
 */

/** Shown behind the hero when the section has no image of its own. */
export const HERO_FALLBACK = '/assets/site/editorial_phnom_penh_pitch_1795112606361.jpg';

type Payload = HomeSection['payload'];

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : []);
const record = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** A section's `link` object → a storefront path. Unknown shapes go to the full shop. */
export function linkTo(link: unknown): string {
  const l = record(link);
  const collection = str(l.collection);
  const category = str(l.category);
  const brand = str(l.brand);
  const product = str(l.product);
  if (collection) return `/collections/${encodeURIComponent(collection)}`;
  if (category) return `/c/${encodeURIComponent(category)}`;
  if (brand) return `/brands/${encodeURIComponent(brand)}`;
  if (product) return `/p/${encodeURIComponent(product)}`;
  return '/shop';
}

/** A rail's API query → the listing path that shows the same products. */
export function railHref(query: unknown): string {
  const { category, collection, ...rest } = record(query) as Record<string, string | string[] | undefined>;
  const c = str(collection);
  const cat = str(category);
  const base = c ? `/collections/${encodeURIComponent(c)}` : cat ? `/c/${encodeURIComponent(cat)}` : '/shop';
  return buildUrl(base, rest).replace(/^https?:\/\/[^/]+/, '');
}

export interface HeroContent {
  title: string;
  subtitle?: string;
  href: string;
  image: string;
}

export function readHero(p: Payload): HeroContent {
  return { title: str(p.title) ?? '', subtitle: str(p.subtitle), href: linkTo(p.link), image: str(p.imagePath) ?? HERO_FALLBACK };
}

export interface RailContent {
  title: string;
  products: ProductSummary[];
  href: string;
}

export function readRail(p: Payload): RailContent {
  return { title: str(p.title) ?? '', products: Array.isArray(p.products) ? p.products : [], href: railHref(p.query) };
}

export interface SlugListContent {
  title: string;
  slugs: string[];
}

export function readCategoryGrid(p: Payload): SlugListContent {
  return { title: str(p.title) ?? '', slugs: strings(p.categories) };
}

export function readBrandRow(p: Payload): SlugListContent {
  return { title: str(p.title) ?? '', slugs: strings(p.brands) };
}

/** A stable id for a heading inside a section, e.g. "New arrivals" → "rail-new-arrivals". */
export function headingId(prefix: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return `${prefix}-${slug || 'section'}`;
}
