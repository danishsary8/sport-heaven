import type { DictKey, Lang } from '../../lib/i18n';
import type { Facet, Menu } from '../catalog/api';
export { inTopMenu } from './topMenu';
import { seasonLabel, SURFACE_LABELS, valueLabel } from '../catalog/filterLabels';

/**
 * What a category's menu shows, built from what the API says the category holds: its facets
 * (`/v1/catalog/filters?category=…`) and the shop's collections (`/v1/catalog/menu`).
 *
 * - `tiles`: the one choice a shopper makes first in this category, with a photo and a plain line saying
 *   what it means (a pitch for boots, a league for kits, a team for F1, an item for essentials).
 * - `columns`: the other ways in (national teams, kit, collections, boot families, brands).
 *
 * Facet-backed links only appear when they have products, so the menu never links to an empty page.
 */

export interface MenuLink {
  label: string;
  href: string;
  count?: number;
}

export interface MenuTile extends MenuLink {
  note: string;
  image?: string;
  /**
   * For a tile with no photo of its own: the listing query whose first product lends the tile its photo and
   * whose total becomes its count (MegaMenu fetches it). A tile whose query finds nothing is left out.
   */
  probe?: Record<string, string>;
}

export interface MenuColumn {
  title: DictKey;
  links: MenuLink[];
}

export interface MegaMenu {
  /** One line under "Shop all": how this category is organised. */
  intro: string;
  tilesTitle: DictKey;
  tiles: MenuTile[];
  columns: MenuColumn[];
}

type Translate = (key: DictKey, vars?: Record<string, string | number>) => string;

/** Menu copy, in both languages. It lives with the menu (loaded when a menu first opens), not in the shop-wide dictionary. */
const COPY = {
  en: {
    'intro.boots': 'Start with the pitch you play on. Each boot is built for one kind of ground.',
    'intro.jerseys': 'Pick a league to find your club, or shop national team kits.',
    'intro.f1': 'Team kits and paddock jackets from the 2026 grid.',
    'intro.balls': 'Official match balls, and low-bounce balls for futsal.',
    'intro.essentials': 'Gloves, shin guards and grip socks to finish your kit.',
    'intro.jackets': 'Walkout, training, rain and travel jackets, plus F1 paddock jackets.',
    'continent.europe': 'Europe',
    'continent.south-america': 'South America',
    'continent.north-america': 'North & Central America',
    'continent.africa': 'Africa',
    'continent.asia': 'Asia',
    'continent.oceania': 'Oceania',
    'jacket.anthem': 'Anthem / Walkout Jacket',
    'jacket.anthemNote': 'Worn lining up before kickoff',
    'jacket.drill': 'Drill Top / Half-Zip',
    'jacket.drillNote': 'Tight pullover for warm-ups and training',
    'jacket.rain': 'Rain / All-Weather Jacket',
    'jacket.rainNote': 'Waterproof shell for wet sessions',
    'jacket.presentation': 'Presentation Jacket',
    'jacket.presentationNote': 'Tailored track jacket for travel and media',
    'jacket.bench': 'Bench Coat / Stadium Parka',
    'jacket.benchNote': 'Heavy winter coat for coaches and subs',
    'jacket.f1': 'F1 Jackets',
    'jacket.f1Note': 'Team paddock jackets from the 2026 grid',
    'intro.default': 'Everything in this category.',
    'surfaceNote.FG': 'Natural grass pitches',
    'surfaceNote.FGAG': 'Grass or artificial, one boot',
    'surfaceNote.AG': '3G and 4G artificial grass',
    'surfaceNote.MG': 'Mixed: firm grass and artificial',
    'surfaceNote.TF': 'Hard turf, 5v5 and 7v7 cages',
    'surfaceNote.IC': 'Indoor courts and futsal',
    'league.pl': 'Arsenal, Liverpool, Man City, Man United, Chelsea',
    'league.laliga': 'Real Madrid, Barcelona, Atlético',
    'league.seriea': 'AC Milan, Inter, Juventus',
    'league.bundesliga': 'Bayern Munich, Dortmund',
    'league.ligue1': 'Paris Saint-Germain',
    'league.cpl': 'Phnom Penh Crown, Svay Rieng',
    'nation.all': 'All national teams',
    'f1.ferrari': 'Puma team kits and jacket',
    'f1.redbull': 'Castore team kits and jacket',
    'f1.mercedes': 'Adidas team kits and jacket',
    'f1.mclaren': 'Papaya and stealth kits, jacket',
    'ball.ucl': 'Champions League',
    'ball.uclNote': 'The 2026/27 official match ball',
    'ball.laliga': 'La Liga',
    'ball.laligaNote': 'Puma Orbita, 2026/27',
    'ball.pl': 'Premier League',
    'ball.plNote': 'Nike Flight match ball',
    'ball.futsal': 'Futsal',
    'ball.futsalNote': 'Low-bounce balls for indoor courts',
    'ess.gloves': 'Goalkeeper gloves',
    'ess.glovesNote': 'Grip for wet and dry days',
    'ess.shin': 'Shin guards',
    'ess.shinNote': 'Light guards with sleeves',
    'ess.socks': 'Grip socks',
    'ess.socksNote': 'Non-slip, mid-calf',
  },
  km: {
    'intro.boots': 'ចាប់ផ្តើមពីទីលានដែលអ្នកលេង។ ស្បែកជើងនីមួយៗត្រូវបានធ្វើសម្រាប់ទីលានមួយប្រភេទ។',
    'intro.jerseys': 'ជ្រើសលីគដើម្បីរកក្លឹបរបស់អ្នក ឬទិញអាវក្រុមជម្រើសជាតិ។',
    'intro.f1': 'អាវក្រុម និងអាវរងា Paddock ពីរដូវកាល 2026។',
    'intro.balls': 'បាល់ប្រកួតផ្លូវការ និងបាល់លោតទាបសម្រាប់ហ្វុតសាល។',
    'intro.essentials': 'ស្រោមដៃ ការពារស្មង និងស្រោមជើងប្រឆាំងរអិល ដើម្បីបំពេញឈុតរបស់អ្នក។',
    'intro.jackets': 'អាវរងាដើរចូលទីលាន ហ្វឹកហាត់ ការពារភ្លៀង និងធ្វើដំណើរ ព្រមទាំងអាវរងា F1។',
    'continent.europe': 'អឺរ៉ុប',
    'continent.south-america': 'អាមេរិកខាងត្បូង',
    'continent.north-america': 'អាមេរិកខាងជើង និងកណ្តាល',
    'continent.africa': 'អាហ្វ្រិក',
    'continent.asia': 'អាស៊ី',
    'continent.oceania': 'អូសេអានី',
    'jacket.anthem': 'អាវរងា Anthem / ដើរចូលទីលាន',
    'jacket.anthemNote': 'ពាក់ពេលតម្រង់ជួរមុនការប្រកួត',
    'jacket.drill': 'អាវ Drill / រូបពាក់កណ្តាល',
    'jacket.drillNote': 'អាវតឹងសម្រាប់កម្តៅខ្លួន និងហ្វឹកហាត់',
    'jacket.rain': 'អាវការពារភ្លៀង / គ្រប់អាកាសធាតុ',
    'jacket.rainNote': 'មិនជ្រាបទឹក សម្រាប់ថ្ងៃភ្លៀង',
    'jacket.presentation': 'អាវរងា Presentation',
    'jacket.presentationNote': 'អាវរងាកាត់ដេរស្អាត សម្រាប់ធ្វើដំណើរ និងសារព័ត៌មាន',
    'jacket.bench': 'អាវធំកៅអីបម្រុង / Parka',
    'jacket.benchNote': 'អាវធំក្រាស់សម្រាប់គ្រូបង្វឹក និងកីឡាករបម្រុង',
    'jacket.f1': 'អាវរងា F1',
    'jacket.f1Note': 'អាវរងា Paddock របស់ក្រុមពីរដូវកាល 2026',
    'intro.default': 'ទំនិញទាំងអស់ក្នុងប្រភេទនេះ។',
    'surfaceNote.FG': 'ទីលានស្មៅធម្មជាតិ',
    'surfaceNote.FGAG': 'ស្មៅធម្មជាតិ ឬសិប្បនិម្មិត មួយគូគ្រប់គ្រាន់',
    'surfaceNote.AG': 'ស្មៅសិប្បនិម្មិត 3G និង 4G',
    'surfaceNote.MG': 'ចម្រុះ៖ ស្មៅរឹង និងសិប្បនិម្មិត',
    'surfaceNote.TF': 'ទីលាន Turf រឹង ទីលាន 5 និង 7 នាក់',
    'surfaceNote.IC': 'ទីលានក្នុងផ្ទះ និងហ្វុតសាល',
    'league.pl': 'Arsenal, Liverpool, Man City, Man United, Chelsea',
    'league.laliga': 'Real Madrid, Barcelona, Atlético',
    'league.seriea': 'AC Milan, Inter, Juventus',
    'league.bundesliga': 'Bayern Munich, Dortmund',
    'league.ligue1': 'Paris Saint-Germain',
    'league.cpl': 'ភ្នំពេញក្រោន ស្វាយរៀង',
    'nation.all': 'ក្រុមជម្រើសជាតិទាំងអស់',
    'f1.ferrari': 'អាវក្រុម Puma និងអាវរងា',
    'f1.redbull': 'អាវក្រុម Castore និងអាវរងា',
    'f1.mercedes': 'អាវក្រុម Adidas និងអាវរងា',
    'f1.mclaren': 'អាវពណ៌ Papaya និង Stealth អាវរងា',
    'ball.ucl': 'Champions League',
    'ball.uclNote': 'បាល់ប្រកួតផ្លូវការ 2026/27',
    'ball.laliga': 'La Liga',
    'ball.laligaNote': 'Puma Orbita 2026/27',
    'ball.pl': 'Premier League',
    'ball.plNote': 'បាល់ប្រកួត Nike Flight',
    'ball.futsal': 'ហ្វុតសាល',
    'ball.futsalNote': 'បាល់លោតទាបសម្រាប់ទីលានក្នុងផ្ទះ',
    'ess.gloves': 'ស្រោមដៃអ្នកចាំទី',
    'ess.glovesNote': 'ចាប់ជាប់ ទាំងថ្ងៃភ្លៀង និងថ្ងៃប្រាំង',
    'ess.shin': 'ការពារស្មង',
    'ess.shinNote': 'ស្រាល មានស្រោមពាក់',
    'ess.socks': 'ស្រោមជើងប្រឆាំងរអិល',
    'ess.socksNote': 'មិនរអិល កម្ពស់ពាក់កណ្តាលកំភួនជើង',
  },
} satisfies Record<Lang, Record<string, string>>;

type CopyKey = keyof typeof COPY.en;

const img = (name: string) => `/assets/catalog/${name}.jpg`;

/** Club leagues, biggest first; any league not listed follows in the API's order. */
const LEAGUE_ORDER = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Cambodian Premier League'];
const byOrder = (list: string[]) => (a: { value: string }, b: { value: string }) => rank(list, a.value) - rank(list, b.value);
const rank = (list: string[], v: string) => (list.indexOf(v) === -1 ? 99 : list.indexOf(v));

/** Leagues that are not club leagues: they get their own links instead. */
const NOT_CLUB_LEAGUES = new Set(['International', 'Formula 1']);

/** A photo and a "which clubs" line per league, so a shopper recognises the league by its clubs. */
const LEAGUES: Record<string, { image: string; note: CopyKey }> = {
  'Premier League': { image: img('jersey_arsenal_2627_home_1795132051318'), note: 'league.pl' },
  'La Liga': { image: img('jersey_madrid_2627_home_1795132050973'), note: 'league.laliga' },
  'Serie A': { image: img('jersey_milan_2627_home_1795132051353'), note: 'league.seriea' },
  Bundesliga: { image: img('jersey_bayern_2627_home_1795132051319'), note: 'league.bundesliga' },
  'Ligue 1': { image: img('jersey_psg_2627_home_1795132052376'), note: 'league.ligue1' },
  'Cambodian Premier League': { image: img('jersey_cambodia_blue_1795112605589'), note: 'league.cpl' },
};

/** Which pitch each boot is for, said plainly, with a boot of that kind. */
const SURFACES: Record<string, { image?: string; note: CopyKey }> = {
  FG: { image: img('boot_adidas_f50_messi_fg_1795193990192'), note: 'surfaceNote.FG' },
  'FG/AG': { image: img('boot_puma_king_ultimate_fg_1795196892181'), note: 'surfaceNote.FGAG' },
  AG: { image: img('boot_nike_vapor_16_ag_1795196892788'), note: 'surfaceNote.AG' },
  MG: { image: img('boot_puma_future_7_mg_1795138747561'), note: 'surfaceNote.MG' },
  TF: { image: img('boot_nike_tiempo_10_tf_cleat_1795196892552'), note: 'surfaceNote.TF' },
  IC: { note: 'surfaceNote.IC' },
};

/** Search-backed links (the listing's `q`): for groupings the catalog has no facet for, such as an F1 team. */
interface Curated {
  /** A menu copy key, or a name shown as it is (team names). */
  label: CopyKey | string;
  note?: CopyKey;
  q: string;
  image?: string;
  extra?: Record<string, string>;
}

const F1_TEAMS: Curated[] = [
  { label: 'Scuderia Ferrari', note: 'f1.ferrari', q: 'Ferrari', image: img('jersey_f1_motorsport_1795112605294') },
  { label: 'Red Bull Racing', note: 'f1.redbull', q: 'Red Bull', image: img('jersey_f1_redbull_2026_1795138745927') },
  { label: 'Mercedes-AMG', note: 'f1.mercedes', q: 'Mercedes', image: img('jersey_f1_mercedes_2026_1795138746906') },
  { label: 'McLaren', note: 'f1.mclaren', q: 'McLaren', image: img('jersey_f1_mclaren_2026_1795193990807') },
];

const BALL_USES: Curated[] = [
  { label: 'ball.ucl', note: 'ball.uclNote', q: 'Champions League', image: img('ball_ucl_pro_2627_1795193989350') },
  { label: 'ball.laliga', note: 'ball.laligaNote', q: 'La Liga', image: img('ball_puma_orbita_laliga_1795193990356') },
  { label: 'ball.pl', note: 'ball.plNote', q: 'Premier League', image: img('ball_fifa_pro_1795112607243') },
  { label: 'ball.futsal', note: 'ball.futsalNote', q: 'Futsal' },
];

const ESSENTIALS: Curated[] = [
  { label: 'ess.gloves', note: 'ess.glovesNote', q: 'gloves', image: img('gear_gk_pro_gloves_1795138746248') },
  { label: 'ess.shin', note: 'ess.shinNote', q: 'shin', image: img('gear_gk_essentials_1795112605503') },
  { label: 'ess.socks', note: 'ess.socksNote', q: 'socks' },
];

/** Jacket types, found by the word in their names (put "anthem", "drill", … in the product name). */
const JACKET_TYPES: Curated[] = [
  { label: 'jacket.anthem', note: 'jacket.anthemNote', q: 'anthem' },
  { label: 'jacket.drill', note: 'jacket.drillNote', q: 'drill' },
  { label: 'jacket.rain', note: 'jacket.rainNote', q: 'rain' },
  { label: 'jacket.presentation', note: 'jacket.presentationNote', q: 'presentation' },
  { label: 'jacket.bench', note: 'jacket.benchNote', q: 'bench' },
];

/** Boot lines players ask for by name. */
const BOOT_FAMILIES = ['Mercurial', 'Phantom', 'Tiempo', 'Predator', 'F50', 'Copa', 'Puma Future', 'Morelia'];

/** Curated collection links per category, by collection slug, with short menu names. */
const COLLECTION_LINKS: Record<string, { slug: string; label: DictKey }[]> = {
  boots: [
    { slug: 'phnom-penh-turf', label: 'mega.col.turf' },
    { slug: 'limited-edition', label: 'mega.col.limited' },
  ],
  jerseys: [
    { slug: 'ucl-2026-27', label: 'mega.col.ucl' },
    { slug: 'retro-jerseys', label: 'mega.col.retro' },
    { slug: 'limited-edition', label: 'mega.col.limited' },
  ],
  f1: [{ slug: 'f1-jackets', label: 'mega.col.f1jackets' }],
};

const INTROS: Record<string, CopyKey> = {
  boots: 'intro.boots',
  jerseys: 'intro.jerseys',
  f1: 'intro.f1',
  balls: 'intro.balls',
  essentials: 'intro.essentials',
  jackets: 'intro.jackets',
};

export function categoryHref(category: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return `/c/${encodeURIComponent(category)}${qs ? `?${qs}` : ''}`;
}

function options(facets: Facet[], key: string) {
  return (facets.find((f) => f.key === key)?.options ?? []).filter((o) => o.count > 0);
}

const isCopyKey = (s: string): s is CopyKey => s in COPY.en;

function curatedTiles(category: string, list: Curated[], copy: (k: CopyKey) => string): MenuTile[] {
  return list.map((c) => ({
    label: isCopyKey(c.label) ? copy(c.label) : c.label,
    note: c.note ? copy(c.note) : '',
    href: categoryHref(category, { ...c.extra, q: c.q }),
    image: c.image,
    ...(c.image ? {} : { probe: { category, ...c.extra, q: c.q } }),
  }));
}

export function buildMegaMenu(category: string, facets: Facet[], collections: Menu['collections'], t: Translate, lang: Lang = 'en'): MegaMenu {
  const copy = (k: CopyKey) => COPY[lang][k];
  const columns: MenuColumn[] = [];
  let tiles: MenuTile[] = [];
  let tilesTitle: DictKey = 'mega.collections';
  const known = new Set(collections.map((c) => c.slug));
  const curated = (COLLECTION_LINKS[category] ?? []).filter((c) => known.has(c.slug)).map((c) => ({ label: t(c.label), href: `/collections/${c.slug}` }));
  const facetLinks = (key: string, order?: string[]) => {
    const list = options(facets, key);
    if (order) list.sort(byOrder(order));
    return list.map((o) => ({ label: key === 'surface' || key === 'garmentType' ? valueLabel(key, o.value, t) : o.label, href: categoryHref(category, { [key]: o.value }), count: o.count }));
  };

  if (category === 'jerseys') {
    tilesTitle = 'mega.leagues';
    tiles = options(facets, 'league')
      .filter((o) => !NOT_CLUB_LEAGUES.has(o.value))
      .sort(byOrder(LEAGUE_ORDER))
      .map((o) => ({
        label: o.label,
        note: LEAGUES[o.value] ? copy(LEAGUES[o.value]!.note) : '',
        href: categoryHref(category, { league: o.value }),
        count: o.count,
        image: LEAGUES[o.value]?.image,
      }));
    // National teams by continent (the API works the continent out for every national-team kit).
    const national = options(facets, 'league').find((o) => o.value === 'International');
    const continents = options(facets, 'continent').map((o) => ({
      label: isCopyKey(`continent.${o.value}`) ? copy(`continent.${o.value}` as CopyKey) : o.label,
      href: categoryHref(category, { continent: o.value }),
      count: o.count,
    }));
    if (national || continents.length) {
      columns.push({
        title: 'mega.nations',
        links: [...(national ? [{ label: copy('nation.all'), href: categoryHref(category, { league: 'International' }), count: national.count }] : []), ...continents],
      });
    }
    // Seasons, newest first (the API sends them in that order, labelled "2026–2027").
    const seasons = options(facets, 'season').map((o) => ({ label: seasonLabel(o.value), href: categoryHref(category, { season: o.value }), count: o.count }));
    if (seasons.length) columns.push({ title: 'mega.season', links: seasons });
    if (curated.length) columns.push({ title: 'mega.collections', links: curated });
  } else if (category === 'boots') {
    tilesTitle = 'mega.surface';
    tiles = options(facets, 'surface')
      .sort(byOrder(Object.keys(SURFACE_LABELS)))
      .map((o) => ({
        label: valueLabel('surface', o.value, t),
        note: SURFACES[o.value] ? copy(SURFACES[o.value]!.note) : '',
        href: categoryHref(category, { surface: o.value }),
        count: o.count,
        image: SURFACES[o.value]?.image,
      }));
    columns.push({ title: 'mega.families', links: BOOT_FAMILIES.map((f) => ({ label: f, href: categoryHref(category, { q: f }) })) });
    if (curated.length) columns.push({ title: 'mega.collections', links: curated });
  } else if (category === 'f1') {
    tilesTitle = 'mega.teams';
    tiles = curatedTiles(category, F1_TEAMS, copy);
    const types = facetLinks('garmentType');
    if (types.length) columns.push({ title: 'mega.type', links: types });
    if (curated.length) columns.push({ title: 'mega.collections', links: curated });
  } else if (category === 'balls') {
    tilesTitle = 'mega.ballUse';
    tiles = curatedTiles(category, BALL_USES, copy);
  } else if (category === 'jackets') {
    tilesTitle = 'mega.jacketType';
    tiles = [
      ...curatedTiles(category, JACKET_TYPES, copy),
      {
        label: copy('jacket.f1'),
        note: copy('jacket.f1Note'),
        href: known.has('f1-jackets') ? '/collections/f1-jackets' : categoryHref('f1', { garmentType: 'jacket' }),
        image: img('jacket_f1_mclaren_2026_1795194122903'),
      },
    ];
    // Paddock jackets by team, so the panel has the same side column as the other menus.
    columns.push({ title: 'mega.f1.jackets', links: F1_TEAMS.map((team) => ({ label: team.label, href: categoryHref('f1', { garmentType: 'jacket', q: team.q }) })) });
  } else if (category === 'essentials') {
    tilesTitle = 'mega.essType';
    tiles = curatedTiles(category, ESSENTIALS, copy);
  } else if (curated.length) {
    columns.push({ title: 'mega.collections', links: curated });
  }

  const brands = facetLinks('brand');
  if (brands.length) columns.push({ title: 'mega.brands', links: brands });
  return { intro: copy(INTROS[category] ?? 'intro.default'), tilesTitle, tiles, columns };
}
