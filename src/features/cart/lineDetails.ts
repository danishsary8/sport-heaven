import type { useI18n } from '../../lib/i18n';

/** "Size EU 41, Black" — a plain phrase, never "EU 41 · Black". */
export function lineDetails(line: { size: string; color: string }, t: ReturnType<typeof useI18n>['t']): string {
  return line.color ? t('bag.details', { size: line.size, color: line.color }) : t('bag.sizeOnly', { size: line.size });
}
