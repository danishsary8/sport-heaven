import { formatUsd, useI18n } from '../lib/i18n';
import { cx } from './cx';

/** A price in dollars; on sale it is vermilion with the old price struck through. */
export function Price({ cents, compareAtCents, size = 'md', className }: { cents: number; compareAtCents?: number | null; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const { t } = useI18n();
  const onSale = compareAtCents != null && compareAtCents > cents;
  const text = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' }[size];
  return (
    <span className={cx('tabular inline-flex items-baseline gap-2 font-semibold', text, className)}>
      <span className={onSale ? 'text-vermilion' : undefined}>{formatUsd(cents)}</span>
      {onSale && (
        <>
          <span className="sr-only">{t('price.was', { price: '' }).trim()}</span>
          <s className="text-[0.85em] font-normal text-graphite">{formatUsd(compareAtCents)}</s>
        </>
      )}
    </span>
  );
}
