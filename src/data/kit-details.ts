/**
 * Real-world product facts for jerseys and F1 wear: kit supplier, shirt
 * sponsor, fabric technology per version, and the brand's naming style.
 *
 * Every fact carries a confidence level:
 *   - confirmed:  well-established, long-running fact (e.g. Nike Match = Dri-FIT ADV)
 *   - likely:     announced deal, but check it is still current for this season
 *   - unverified: could not confirm. NOT shown to shoppers; listed in
 *                 docs/product-details-review.md so you can check it.
 *
 * Knowledge is based on information up to mid-2026. Always double-check on the
 * official club / brand store before a real launch.
 */
import type { Product } from '../types/store';

export type Confidence = 'confirmed' | 'likely' | 'unverified';

export interface Fact<T = string> {
  value: T;
  confidence: Confidence;
  note?: string;
}

/** Fabric technology and the brand's own name for each version. */
interface BrandKitLine {
  fanLine: string;
  playerLine: string;
  fanFabric: string;
  playerFabric: string;
  confidence: Confidence;
}

export const BRAND_KIT_LINES: Record<string, BrandKitLine> = {
  Nike: { fanLine: 'Stadium', playerLine: 'Match', fanFabric: 'Nike Dri-FIT', playerFabric: 'Nike Dri-FIT ADV', confidence: 'confirmed' },
  'Jordan / Nike': { fanLine: 'Stadium', playerLine: 'Match', fanFabric: 'Nike Dri-FIT', playerFabric: 'Nike Dri-FIT ADV', confidence: 'confirmed' },
  Adidas: { fanLine: 'Replica', playerLine: 'Authentic', fanFabric: 'AEROREADY', playerFabric: 'HEAT.RDY', confidence: 'confirmed' },
  Puma: { fanLine: 'Replica', playerLine: 'Authentic', fanFabric: 'dryCELL', playerFabric: 'ULTRAWEAVE', confidence: 'confirmed' },
  'Puma F1': { fanLine: 'Replica', playerLine: 'Replica', fanFabric: 'dryCELL', playerFabric: 'dryCELL', confidence: 'likely' },
};

/** Front-of-shirt sponsor per team. `null` = no sponsor (national teams never carry one). */
export const SHIRT_SPONSORS: Record<string, Fact<string | null>> = {
  'FC Barcelona': { value: 'Spotify', confidence: 'confirmed' },
  'Real Madrid': { value: 'Emirates (Fly Better)', confidence: 'confirmed' },
  'Atlético Madrid': { value: 'Riyadh Air', confidence: 'likely', note: 'Deal started 2024/25.' },
  Arsenal: { value: 'Emirates (Fly Better)', confidence: 'confirmed' },
  'Liverpool FC': { value: 'Standard Chartered', confidence: 'confirmed' },
  'Manchester City': { value: 'Etihad Airways', confidence: 'confirmed' },
  'Manchester United': { value: 'Snapdragon', confidence: 'likely', note: 'Deal started 2024/25; check it still runs in 2026/27.' },
  'Chelsea FC': { value: null, confidence: 'unverified', note: 'Chelsea changed front sponsor several times since 2023. Check the current one.' },
  'AC Milan': { value: 'Emirates (Fly Emirates)', confidence: 'confirmed' },
  'Inter Milan': { value: 'Betsson.sport', confidence: 'likely', note: 'Deal started 2025/26.' },
  Juventus: { value: null, confidence: 'unverified', note: 'Jeep was the long-time sponsor; check the 2026/27 sponsor.' },
  'FC Bayern Munich': { value: 'Telekom', confidence: 'confirmed' },
  'Borussia Dortmund': { value: 'Vodafone', confidence: 'likely', note: 'Replaced 1&1 from 2025/26.' },
  'Paris Saint-Germain': { value: 'Qatar Airways', confidence: 'confirmed' },
  'Phnom Penh Crown FC': { value: null, confidence: 'unverified', note: 'Check the club’s current shirt sponsor.' },
  'Preah Khan Reach Svay Rieng FC': { value: null, confidence: 'unverified', note: 'Check the club’s current shirt sponsor.' },
};

/** Kit supplier facts that differ from (or need a check against) the `brand` field. */
export const SUPPLIER_NOTES: Record<string, Fact> = {
  'Cambodia National Team': { value: 'Varaman', confidence: 'unverified', note: 'Could not confirm Cambodia’s kit supplier. Check the FFC official store.' },
  'Phnom Penh Crown FC': { value: 'Varaman', confidence: 'unverified', note: 'Could not confirm the kit supplier.' },
  'Preah Khan Reach Svay Rieng FC': { value: 'Varaman', confidence: 'unverified', note: 'Could not confirm the kit supplier.' },
  'Oracle Red Bull Racing': {
    value: 'Puma',
    confidence: 'likely',
    note: 'Red Bull Racing announced Puma as kit partner from 2026 (Castore before). The catalog still says Castore: verify and update the brand.',
  },
  'McLaren F1 Team': { value: 'Castore', confidence: 'likely', note: 'Castore has made McLaren team wear since 2024. Check it is still current in 2026.' },
  'Scuderia Ferrari': { value: 'Puma', confidence: 'likely' },
  'Mercedes-AMG Petronas': { value: 'Adidas', confidence: 'confirmed', note: 'Adidas since 2025.' },
};

/** Per-product notes: things in the catalog I could not verify. */
export const PRODUCT_NOTES: Record<string, string[]> = {
  'real-madrid-125th-anniversary-special-kit':
    ['Real Madrid turns 125 in March 2027, but I could not confirm a special anniversary kit. Keep it as a concept product or remove it.'],
  'fc-barcelona-2026-27-third-retro-jersey': ['Third kit design not confirmed; the old "Retro 90s" name was removed.'],
  'paris-saint-germain-2026-27-third-ucl-edition-jersey':
    ['PSG third kits are usually Jordan-branded, but the 2026/27 third kit is not confirmed.'],
  'argentina-3-star-champions-edition-jersey': ['Moved to the 2026 World Cup home kit (national teams name kits by tournament year).'],
  'fc-barcelona-1998-99-centenary-retro-jersey':
    ['Original 1998/99 shirt was made by Nike with no front sponsor. A modern re-issue may be made by a licensed retro brand: check the label of the real product.'],
  'brazil-2002-world-cup-champions-retro-jersey':
    ['Original 2002 shirt was made by Nike with no front sponsor. A modern re-issue may be made by a licensed retro brand: check the label of the real product.'],
  'scuderia-ferrari-2026-monza-white-edition-f1-jersey': ['Special-livery shirts change every season; confirm this one exists.'],
  'oracle-red-bull-racing-2026-white-edition-f1-jersey': ['Special-livery shirts change every season; confirm this one exists.'],
  'mercedes-amg-petronas-2026-silver-white-f1-jersey': ['Special-livery shirts change every season; confirm this one exists.'],
  'mclaren-f1-team-2026-stealth-carbon-edition-jersey': ['Special-livery shirts change every season; confirm this one exists.'],
};

/** Confirmed facts about the original shirts that retro products re-issue. */
const RETRO_FACTS: Record<string, string> = {
  'fc-barcelona-1998-99-centenary-retro-jersey':
    'The original was made by Nike for the club’s centenary season and carried no front sponsor.',
  'brazil-2002-world-cup-champions-retro-jersey':
    'The original was made by Nike and worn when Brazil won the 2002 World Cup.',
};

export interface KitDetails {
  /** Confirmed fact about the original shirt (retro products only). */
  retroFact?: string;
  /** Brand-style name of the Fan version, e.g. "FC Barcelona 2026/27 Stadium Home". */
  fanName?: Fact;
  /** Brand-style name of the Player version, e.g. "Real Madrid 26/27 Home Authentic Jersey". */
  playerName?: Fact;
  supplier: Fact;
  sponsor?: Fact<string | null>;
  fanFabric?: Fact;
  playerFabric?: Fact;
  notes: string[];
}

function shortSeason(season: string): string {
  // "2026/27" → "26/27"; "2026" stays "2026"
  const m = season.match(/^\d{2}(\d{2})\/(\d{2})$/);
  return m ? `${m[1]}/${m[2]}` : season;
}

function teamName(product: Product): string {
  return (product.club ?? '').replace(/\s+National Team$/i, '');
}

/** Builds the brand-style official names. Pattern is confirmed per brand; exact titles vary by store. */
function officialNames(product: Product, line: BrandKitLine | undefined): Pick<KitDetails, 'fanName' | 'playerName'> {
  if (!line || !product.season || product.isRetro || product.category !== 'jerseys') return {};
  const team = teamName(product);
  const kit = product.kitType === 'Special' ? 'Special' : product.kitType ?? 'Home';
  const note = 'Follows the brand’s naming pattern; exact title can differ by store.';
  if (product.brand === 'Nike' || product.brand === 'Jordan / Nike') {
    return {
      fanName: { value: `${team} ${product.season} ${line.fanLine} ${kit}`, confidence: 'likely', note },
      playerName: { value: `${team} ${product.season} ${line.playerLine} ${kit}`, confidence: 'likely', note },
    };
  }
  if (product.brand === 'Adidas' || product.brand === 'Puma') {
    const season = shortSeason(product.season);
    return {
      fanName: { value: `${team} ${season} ${kit} Jersey`, confidence: 'likely', note },
      playerName: { value: `${team} ${season} ${kit} Authentic Jersey`, confidence: 'likely', note },
    };
  }
  return {};
}

export function getKitDetails(product: Product): KitDetails | undefined {
  if (product.category !== 'jerseys' && product.category !== 'f1') return undefined;
  const line = BRAND_KIT_LINES[product.brand];
  const club = product.club ?? '';
  const notes = [...(PRODUCT_NOTES[product.slug] ?? [])];

  const supplier: Fact = SUPPLIER_NOTES[club] ?? { value: product.brand.replace(' F1', ''), confidence: line ? line.confidence : 'unverified' };
  if (supplier.note) notes.push(supplier.note);

  let sponsor: Fact<string | null> | undefined;
  if (product.category === 'jerseys') {
    if (product.isRetro || product.teamType === 'national') {
      sponsor = { value: null, confidence: 'confirmed' };
    } else {
      sponsor = SHIRT_SPONSORS[club] ?? { value: null, confidence: 'unverified', note: 'Sponsor not checked.' };
      if (sponsor.note && sponsor.confidence !== 'confirmed') notes.push(`Sponsor: ${sponsor.note}`);
    }
  }

  const retro = Boolean(product.isRetro);
  const fanFabric: Fact | undefined = line && !retro ? { value: line.fanFabric, confidence: line.confidence } : undefined;
  const playerFabric: Fact | undefined =
    line && !retro && product.versions?.includes('Player') ? { value: line.playerFabric, confidence: line.confidence } : undefined;
  if (!line && !retro) notes.push(`Fabric technology for ${product.brand} not confirmed.`);

  return {
    ...officialNames(product, line),
    retroFact: RETRO_FACTS[product.slug],
    supplier,
    sponsor,
    fanFabric,
    playerFabric,
    notes,
  };
}

/** True when a fact is safe to show to shoppers. */
export function isShowable<T>(fact: Fact<T> | undefined): fact is Fact<T> {
  return Boolean(fact && fact.confidence !== 'unverified');
}
