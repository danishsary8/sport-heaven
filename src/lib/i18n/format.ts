import type { Lang } from './types';

const TZ = 'Asia/Phnom_Penh';
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const khrEn = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const khrKm = new Intl.NumberFormat('en-US-u-nu-khmr', { maximumFractionDigits: 0 });

/** Integer cents → "$95.00". */
export function formatUsd(cents: number): string {
  return usd.format(cents / 100);
}

/** Whole riel → "៛389,500" (English) or "៣៨៩,៥០០៛" (Khmer, Khmer digits). */
export function formatKhr(riel: number, lang: Lang): string {
  const n = Math.round(riel);
  return lang === 'km' ? `${khrKm.format(n)}៛` : `៛${khrEn.format(n)}`;
}

/** An ISO timestamp as a date in Phnom Penh: "27 Nov 2026". Extra options add a time, weekday, etc. */
export function formatDate(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions = {}): string {
  const base: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ, ...opts };
  return new Intl.DateTimeFormat(lang === 'km' ? 'km-KH' : 'en-GB', base).format(new Date(iso));
}
