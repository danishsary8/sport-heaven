import { useI18n } from '../lib/i18n';
import { cx } from './cx';

export type AvailabilityValue = 'ok' | 'low' | 'out';

/** In stock / Only 2 left / Sold out — the only stock information customers ever see. */
export function Availability({ value, count, className }: { value: AvailabilityValue; count?: number | null; className?: string }) {
  const { t } = useI18n();
  const label = value === 'ok' ? t('availability.ok') : value === 'low' && count ? t('availability.low', { n: count }) : value === 'low' ? t('availability.ok') : t('availability.out');
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-sm font-medium', value === 'low' ? 'text-vermilion' : value === 'out' ? 'text-graphite' : 'text-success', className)}>
      <span aria-hidden className={cx('size-2 rounded-full', value === 'low' ? 'bg-vermilion' : value === 'out' ? 'bg-graphite' : 'bg-success')} />
      {label}
    </span>
  );
}
