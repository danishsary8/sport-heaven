import { useAdminQuery } from '../api';
import { toNinety } from './price';

/**
 * The shop's .90 price rule (Settings → "End prices in .90"): on unless an admin turned it off. `round` gives the
 * price that will really be saved, so forms, previews and messages show it before saving.
 */
export function usePriceRounding(): { on: boolean; round: (cents: number) => number } {
  const settings = useAdminQuery<{ settings: { price_rounding?: { endInNinety?: boolean } } }>(['settings'], '/v1/admin/settings');
  const on = settings.data?.settings?.price_rounding?.endInNinety !== false;
  return { on, round: on ? toNinety : (cents) => cents };
}
