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
export function valueLabel(key: string, value: string, t: Translate): string {
  if (key === 'surface' && SURFACE_LABELS[value]) return t(SURFACE_LABELS[value]);
  if (key === 'garmentType' && GARMENT_LABELS[value]) return t(GARMENT_LABELS[value]);
  if (key === 'league' && value === 'International') return t('mega.col.national');
  return value;
}
