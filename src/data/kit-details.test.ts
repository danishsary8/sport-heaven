import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from './catalog';
import { getKitDetails, isShowable } from './kit-details';

const bySlug = (slug: string) => PRODUCTS.find((p) => p.slug === slug)!;

test('product names contain no invented design or colour words', () => {
  const banned = /kobe|wild pink|marble|pinstripe|sunrise|pearl|coastal|taeguk|samurai|azzurri|selecao|la roja|monza|suzuka|stealth|papaya|authentic/i;
  for (const p of PRODUCTS.filter((x) => x.category === 'jerseys' || x.category === 'f1')) {
    assert.ok(!banned.test(p.name), p.name);
  }
});

test('national team kits use the tournament year and carry no sponsor', () => {
  const france = bySlug('france-national-team-2026-27-home-authentic-jersey');
  assert.equal(france.season, '2026');
  assert.equal(getKitDetails(france)!.sponsor?.value, null);
  assert.match(france.summary, /no front sponsor/);
});

test('fabric follows the brand rule for Fan and Player versions', () => {
  const madrid = getKitDetails(bySlug('real-madrid-2026-27-home-authentic-jersey'))!;
  assert.equal(madrid.fanFabric?.value, 'AEROREADY');
  assert.equal(madrid.playerFabric?.value, 'HEAT.RDY');
  const barca = getKitDetails(bySlug('fc-barcelona-2026-27-home-authentic-jersey'))!;
  assert.equal(barca.playerFabric?.value, 'Nike Dri-FIT ADV');
  assert.equal(barca.sponsor?.value, 'Spotify');
});

test('unverified facts are never shown to shoppers', () => {
  const cambodia = bySlug('cambodia-national-team-home-jersey-varaman');
  const details = getKitDetails(cambodia)!;
  assert.equal(isShowable(details.supplier), false);
  assert.ok(!cambodia.summary.includes('Varaman'));
  const chelsea = bySlug('chelsea-2026-27-home-authentic-jersey');
  assert.ok(!/sponsor:/i.test(chelsea.summary));
});

test('only real retro kits are marked retro', () => {
  const retro = PRODUCTS.filter((p) => p.isRetro).map((p) => p.slug).sort();
  assert.deepEqual(retro, ['brazil-2002-world-cup-champions-retro-jersey', 'fc-barcelona-1998-99-centenary-retro-jersey']);
});
