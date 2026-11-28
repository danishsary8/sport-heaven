import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../lib/api';
import { useI18n } from '../../../lib/i18n';

/** Filters the API's smart search read from a shopper's words (prices in cents). */
export interface SmartFilters {
  category?: string;
  brand?: string[];
  league?: string[];
  season?: string[];
  continent?: string[];
  kitType?: string[];
  surface?: string[];
  priceMinCents?: number;
  priceMaxCents?: number;
  q?: string;
}

/** Asks the API to read the words; `filters: null` or `available: false` means "use plain search". */
export function useSmartSearch(q: string, enabled: boolean) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ['search', 'smart', q, lang],
    enabled,
    staleTime: 60 * 60_000,
    retry: false,
    queryFn: ({ signal }) => apiFetch<{ available: boolean; filters: SmartFilters | null }>('/v1/search/smart', { query: { q, lang }, signal }),
  });
}

/** Whether the filters narrow more than keywords (otherwise plain search for the words is the better page). */
export const hasRealFilters = (f: SmartFilters) => Object.keys(f).some((k) => k !== 'q');

/** The shop page for the filters: the category's page when there is one, else the whole shop. `smart` keeps the words. */
export function smartHref(f: SmartFilters, words: string): string {
  const p = new URLSearchParams();
  for (const key of ['brand', 'league', 'season', 'continent', 'kitType', 'surface'] as const) for (const v of f[key] ?? []) p.append(key, v);
  if (f.priceMinCents) p.set('priceMin', String(f.priceMinCents));
  if (f.priceMaxCents) p.set('priceMax', String(f.priceMaxCents));
  if (f.q) p.set('q', f.q);
  p.set('smart', words);
  return `${f.category ? `/c/${encodeURIComponent(f.category)}` : '/shop'}?${p.toString()}`;
}
