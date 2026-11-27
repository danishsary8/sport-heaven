import type { DictKey } from '../../lib/i18n';

type Translate = (key: DictKey, vars?: Record<string, string | number>) => string;

/** Playing surfaces in the order players think of them, with names a shopper recognises. */
export const SURFACE_LABELS: Record<string, DictKey> = {
  FG: 'mega.surface.FG',
  'FG/AG': 'mega.surface.FGAG',
  AG: 'mega.surface.AG',
  MG: 'mega.surface.MG',
  TF: 'mega.surface.TF',
  IC: 'mega.surface.IC',
};

/** The API's garment types are lower-case codes; these are their shop names. */
export const GARMENT_LABELS: Record<string, DictKey> = { jersey: 'mega.f1.jerseys', jacket: 'mega.f1.jackets' };

/** A filter value as shoppers should read it: "TF" → "Turf (TF)", "jacket" → "Paddock jackets", "International" → "National team jerseys". */
/** "2026/27" → "2026–2027"; a single year stays as it is. */
export function seasonLabel(season: string): string {
  const m = /^(\d{4})\/(\d{2})$/.exec(season);
  if (!m) return season;
  const start = Number(m[1]);
  const end = Math.floor(start / 100) * 100 + Number(m[2]);
  return `${start}–${end < start ? end + 100 : end}`;
}

const CONTINENT_KEYS = ['europe', 'south-america', 'north-america', 'africa', 'asia', 'oceania'];

export function valueLabel(key: string, value: string, t: Translate): string {
  if (key === 'season') return seasonLabel(value);
  if (key === 'continent' && CONTINENT_KEYS.includes(value)) return t(`continent.${value}` as DictKey);
  if (key === 'surface' && SURFACE_LABELS[value]) return t(SURFACE_LABELS[value]);
  if (key === 'garmentType' && GARMENT_LABELS[value]) return t(GARMENT_LABELS[value]);
  if (key === 'league' && value === 'International') return t('mega.col.national');
  return value;
}
