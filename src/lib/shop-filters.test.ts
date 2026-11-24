import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../data/catalog';
import { COLLECTION_BY_SLUG } from '../data/editorial';
import {
  applyShopQuery,
  changeCategory,
  emptyShopQuery,
  getActiveChips,
  getFacetOptions,
  parseShopParams,
  presetToShopQuery,
  serializeShopParams,
  toggleFacetValue,
} from './shop-filters';

test('every jersey has structured fields and a front image', () => {
  const jerseys = PRODUCTS.filter((p) => p.category === 'jerseys');
  assert.ok(jerseys.length > 40);
  for (const p of jerseys) {
    assert.ok(p.teamType, `${p.slug} teamType`);
    assert.ok(p.versions?.length, `${p.slug} versions`);
    assert.ok(p.fits?.length, `${p.slug} fits`);
    assert.ok(p.sleeves?.length, `${p.slug} sleeves`);
    assert.equal(p.media?.front, p.image);
    assert.ok(['Home', 'Away', 'Third', 'Goalkeeper', 'Special'].includes(p.kitType ?? ''), `${p.slug} kitType`);
  }
});

test('league + kit filters combine with AND, values inside a facet with OR', () => {
  let q = emptyShopQuery('jerseys');
  q = toggleFacetValue(q, 'league', 'premier-league');
  q = toggleFacetValue(q, 'league', 'la-liga');
  q = toggleFacetValue(q, 'kit', 'home');
  const results = applyShopQuery(PRODUCTS, q);
  assert.ok(results.length > 0);
  for (const p of results) {
    assert.ok(p.league === 'Premier League' || p.league === 'La Liga');
    assert.equal(p.kitType, 'Home');
  }
});

test('retro season only returns retro kits', () => {
  const q = toggleFacetValue(emptyShopQuery('jerseys'), 'season', 'retro');
  const results = applyShopQuery(PRODUCTS, q);
  assert.ok(results.length >= 2);
  assert.ok(results.every((p) => p.isRetro));
});

test('facet counts ignore their own selection but respect others', () => {
  const q = toggleFacetValue(emptyShopQuery('jerseys'), 'league', 'serie-a');
  const leagues = getFacetOptions(PRODUCTS, q, 'league');
  const pl = leagues.find((o) => o.value === 'premier-league');
  assert.ok(pl && pl.count > 0, 'other leagues keep their counts');
  const kits = getFacetOptions(PRODUCTS, q, 'kit');
  const total = kits.reduce((n, o) => n + o.count, 0);
  assert.equal(total, applyShopQuery(PRODUCTS, q).length, 'kit counts sum to Serie A results');
});

test('URL params round-trip', () => {
  let q = emptyShopQuery('jerseys');
  q = toggleFacetValue(q, 'league', 'premier-league');
  q = toggleFacetValue(q, 'season', '2026-27');
  q = { ...q, flags: ['sale', 'custom'] };
  const serialized = serializeShopParams(q);
  assert.equal(serialized, 'league=premier-league&season=2026-27&only=custom,sale');
  const parsed = parseShopParams(serialized, emptyShopQuery('jerseys'));
  assert.deepEqual(parsed.facets, q.facets);
  assert.deepEqual([...parsed.flags].sort(), ['custom', 'sale']);
});

test('legacy collection presets convert into facets', () => {
  const ucl = presetToShopQuery(COLLECTION_BY_SLUG.get('ucl-2026-27')!.preset);
  assert.deepEqual(ucl.flags, ['ucl']);
  const national = presetToShopQuery(COLLECTION_BY_SLUG.get('national-teams')!.preset);
  assert.deepEqual(national.facets['team-type'], ['national']);
  const turf = presetToShopQuery(COLLECTION_BY_SLUG.get('phnom-penh-turf')!.preset);
  assert.deepEqual(turf.facets.surface, ['tf', 'ag']);
  assert.ok(applyShopQuery(PRODUCTS, turf).length > 0);
});

test('changing category drops filters that no longer apply', () => {
  let q = toggleFacetValue(emptyShopQuery('jerseys'), 'league', 'la-liga');
  q = toggleFacetValue(q, 'brand', 'nike');
  const boots = changeCategory(q, 'boots');
  assert.deepEqual(boots.facets, { brand: ['nike'] });
});

test('chips have readable labels', () => {
  const q = toggleFacetValue(emptyShopQuery('jerseys'), 'team', 'argentina-national-team');
  const chips = getActiveChips(PRODUCTS, q);
  assert.equal(chips[0].label, 'Argentina');
  assert.deepEqual(chips[0].remove(q).facets, {});
});

test('every navigation menu link returns at least one product', async () => {
  const { MAIN_MENU } = await import('../data/navigation');
  for (const section of MAIN_MENU) {
    for (const link of [section.all, ...section.columns.flatMap((c) => c.links)]) {
      const q = parseShopParams(link.params ?? '', emptyShopQuery(link.category));
      assert.ok(applyShopQuery(PRODUCTS, q).length > 0, `${section.label} → ${link.label}`);
    }
    assert.ok(PRODUCTS.some((p) => p.slug === section.featuredSlug), `featured ${section.featuredSlug}`);
  }
});
