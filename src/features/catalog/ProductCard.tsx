import { Plus, ShoppingBag } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { Picture, Price, cx } from '../../ui';
import type { ProductSummary } from './api';
import { WishlistButton } from './product/WishlistButton';

// The size picker loads the first time someone opens it, so the cards stay light on the home page.
const QuickAddPanel = lazy(() => import('./QuickAdd').then((m) => ({ default: m.QuickAddPanel })));

export const CARD_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw';

/** A product in a grid or rail: 3:4 photo on the stone stage, brand, name, price, and "Only N left" when low. */
/** `hash` opens the product at a section, e.g. `print` for the print studio. */
export function ProductCard({ product, priority = false, className, hash }: { product: ProductSummary; priority?: boolean; className?: string; hash?: string }) {
  const { t } = useI18n();
  const sale = product.discountPct ? t('card.sale', { n: product.discountPct }) : null;
  const tag = sale ?? (product.badges.includes('new') ? t('badge.new') : null);
  const [quick, setQuick] = useState(false);
  const canAdd = product.availability !== 'out';
  return (
    <article className={cx('group relative flex flex-col', className)}>
      <div className="stage relative aspect-[3/4] overflow-hidden rounded-[10px]">
        <Picture
          src={product.imageUrl}
          alt=""
          sizes={CARD_SIZES}
          priority={priority}
          imgClassName={cx(
            'transition-[transform,opacity] duration-500 ease-out group-hover:scale-[1.035]',
            product.hoverImageUrl && '[@media(hover:hover)]:group-hover:opacity-0',
            product.availability === 'out' && 'opacity-70',
          )}
          className="block h-full w-full"
        />
        {/* The second photo (usually the back of a shirt) fades in on hover. It loads with the card,
            so the first hover is already smooth; touch screens never load it. */}
        {product.hoverImageUrl && (
          <Picture
            src={product.hoverImageUrl}
            alt=""
            sizes={CARD_SIZES}
            className="absolute inset-0 hidden [@media(hover:hover)]:block"
            imgClassName="scale-[1.02] opacity-0 transition-[transform,opacity] duration-500 ease-out group-hover:scale-100 group-hover:opacity-100"
          />
        )}
        {tag && (
          <span
            className={cx(
              'absolute left-2 top-2 rounded-[3px] px-1.5 py-0.5 text-xs font-semibold leading-snug',
              sale ? 'bg-vermilion text-paper' : 'bg-paper text-obsidian shadow-[0_0_0_1px_rgb(14_17_19/0.06)]',
            )}
          >
            {tag}
          </span>
        )}
        {product.availability === 'out' && (
          <span className="absolute inset-x-2 bottom-2 rounded-[4px] bg-paper/95 px-2 py-1.5 text-center text-xs font-semibold text-graphite">{t('availability.out')}</span>
        )}
        {/* Above the card's full-size link: wishlist, and quick add (hover on desktop, a bag button on phones). */}
        <div className="absolute right-2 top-2 z-10">
          <WishlistButton slug={product.slug} name={product.name} variant="card" />
        </div>
        {canAdd && !quick && (
          <>
            <button
              type="button"
              onClick={() => setQuick(true)}
              className="absolute inset-x-2 bottom-2 z-10 hidden h-11 translate-y-2 items-center justify-center gap-2 rounded-[6px] bg-obsidian/90 text-[15px] font-semibold text-paper opacity-0 backdrop-blur transition-[opacity,transform] duration-300 ease-out hover:bg-obsidian focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:hover)]:flex"
            >
              <Plus className="size-4" aria-hidden />
              {t('card.quickAdd')}
              <span className="sr-only">: {product.name}</span>
            </button>
            <button
              type="button"
              onClick={() => setQuick(true)}
              aria-label={t('card.quickAddName', { name: product.name })}
              className="absolute bottom-2 right-2 z-10 grid size-10 place-items-center rounded-full bg-paper/95 text-obsidian shadow-[0_4px_14px_-6px_rgb(14_17_19/0.5)] [@media(hover:hover)]:hidden"
            >
              <ShoppingBag className="size-[18px]" aria-hidden />
            </button>
          </>
        )}
        {quick && (
          <Suspense fallback={null}>
            <QuickAddPanel slug={product.slug} name={product.name} onClose={() => setQuick(false)} />
          </Suspense>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-0.5">
        <p className="text-[13px] font-medium leading-tight text-graphite">{product.brand.name}</p>
        <h3 className="line-clamp-2 text-[15px] font-medium leading-snug">
          <Link to={`/p/${product.slug}${hash ? `#${hash}` : ''}`} className="decoration-obsidian/30 underline-offset-[3px] after:absolute after:inset-0 group-hover:underline">
            {product.name}
          </Link>
        </h3>
        <Price cents={product.priceCents} compareAtCents={product.compareAtCents} size="md" className="mt-1 flex-wrap" />
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
