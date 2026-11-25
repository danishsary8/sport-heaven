/**
 * npx tsx scripts/export-catalog.ts <output.json>
 *
 * Exports the catalog (80 products, per-size stock per branch, kit facts) as JSON
 * for the Sport Castle API seed. The API is the source of truth after this.
 */
import { writeFileSync } from 'node:fs';
import { PRODUCTS } from '../src/data/catalog';
import { getKitDetails } from '../src/data/kit-details';
import { MOCK_STORE_CATALOG } from '../src/lib/mock-store/catalog';

const out = process.argv[2];
if (!out) {
  console.error('Usage: npx tsx scripts/export-catalog.ts <output.json>');
  process.exit(1);
}

const stockBySlug = new Map(MOCK_STORE_CATALOG.map((p) => [p.slug, p.variants[0]?.sizes ?? []]));

const items = PRODUCTS.map((p) => {
  const kit = getKitDetails(p);
  return {
    slug: p.slug,
    name: p.name,
    shortName: p.shortName,
    brand: p.brand,
    category: p.category,
    league: p.league ?? null,
    team: p.club ?? null,
    teamType: p.teamType ?? null,
    season: p.season ?? null,
    isRetro: Boolean(p.isRetro),
    kitType: p.kitType ?? null,
    versions: p.versions ?? [],
    fits: p.fits ?? [],
    sleeves: p.sleeves ?? [],
    price: p.price,
    originalPrice: p.originalPrice ?? null,
    customizable: Boolean(p.customizable),
    rating: p.rating,
    reviewCount: p.reviewCount,
    isFeatured: Boolean(p.isFeatured),
    isBestSeller: Boolean(p.isBestSeller),
    isNewArrival: Boolean(p.isNewArrival),
    summary: p.summary,
    highlights: p.techHighlights,
    specs: Object.fromEntries(Object.entries(p.specs).filter(([, v]) => typeof v === 'string')),
    facts: kit
      ? {
          supplier: kit.supplier,
          sponsor: kit.sponsor ?? null,
          fanFabric: kit.fanFabric ?? null,
          playerFabric: kit.playerFabric ?? null,
          fanName: kit.fanName ?? null,
          playerName: kit.playerName ?? null,
        }
      : {},
    media: p.media ?? { front: p.image },
    stock: (stockBySlug.get(p.slug) ?? []).flatMap((s) =>
      Object.entries(s.byBranch).map(([branch, quantity]) => ({ branch, size: s.size, quantity })),
    ),
  };
});

writeFileSync(out, `${JSON.stringify(items, null, 2)}\n`);
console.log(`Exported ${items.length} products to ${out}`);
