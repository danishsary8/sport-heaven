import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { Picture, Price, cx } from '../../ui';
import type { ProductSummary } from './api';

export const CARD_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw';

/** A product in a grid or rail: 3:4 photo on the stone stage, brand, name, price, and "Only N left" when low. */
export function ProductCard({ product, priority = false, className }: { product: ProductSummary; priority?: boolean; className?: string }) {
  const { t } = useI18n();
  const sale = product.discountPct ? t('card.sale', { n: product.discountPct }) : null;
  const tag = sale ?? (product.badges.includes('new') ? t('badge.new') : null);
  return (
    <article className={cx('group relative flex flex-col', className)}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[6px] bg-stone">
        <Picture src={product.imageUrl} alt="" sizes={CARD_SIZES} priority={priority} imgClassName="transition-transform duration-300 group-hover:scale-[1.03]" className="block h-full w-full" />
        {tag && (
          <span className={cx('absolute left-2 top-2 rounded-[4px] px-1.5 py-0.5 text-xs font-bold', sale ? 'bg-vermilion text-paper' : 'bg-paper text-obsidian')}>{tag}</span>
        )}
        {product.availability === 'out' && (
          <span className="absolute inset-x-0 bottom-0 bg-paper/90 px-2 py-1 text-center text-xs font-semibold text-graphite">{t('availability.out')}</span>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-0.5">
        <p className="text-[13px] text-graphite">{product.brand.name}</p>
        <h3 className="line-clamp-2 text-[15px] font-medium leading-snug">
          <Link to={`/p/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <Price cents={product.priceCents} compareAtCents={product.compareAtCents} size="sm" className="mt-0.5 flex-wrap" />
        {product.availability === 'low' && product.lowStockCount ? (
          <p className="text-[13px] font-medium text-vermilion">{t('availability.low', { n: product.lowStockCount })}</p>
        ) : product.colors.length > 1 ? (
          <p className="text-[13px] text-graphite">{t('card.colors', { n: product.colors.length })}</p>
        ) : null}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      <div className="skeleton aspect-[3/4] rounded-[6px]" />
      <div className="skeleton h-3 w-1/3 rounded" />
      <div className="skeleton h-4 w-4/5 rounded" />
      <div className="skeleton h-4 w-1/4 rounded" />
    </div>
  );
}
