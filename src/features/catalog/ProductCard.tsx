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
      <div className="stage relative aspect-[3/4] overflow-hidden rounded-[12px] shadow-[inset_0_0_0_1px_rgb(14_17_19/0.04)]">
        <Picture
          src={product.imageUrl}
          alt=""
          sizes={CARD_SIZES}
          priority={priority}
          imgClassName={cx(
            'transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.045]',
            product.hoverImageUrl && '[@media(hover:hover)]:group-hover:opacity-0',
            product.availability === 'out' && 'opacity-60 grayscale-[35%]',
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
            imgClassName="scale-[1.02] opacity-0 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-100 group-hover:opacity-100"
          />
        )}
        {/* A soft floor under the bottom edge, so the quick-add bar and sold-out label sit on the photo, not over it. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-obsidian/12 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {tag && (
          <span
            className={cx(
              'absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none',
              sale ? 'bg-vermilion text-paper' : 'bg-paper text-obsidian shadow-[0_1px_2px_rgb(14_17_19/0.08)]',
            )}
          >
            {tag}
          </span>
        )}
        {product.availability === 'out' && (
          <span className="absolute inset-x-2.5 bottom-2.5 rounded-full bg-paper/95 px-3 py-2 text-center text-xs font-semibold text-graphite backdrop-blur">{t('availability.out')}</span>
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
              className="absolute inset-x-2.5 bottom-2.5 z-10 hidden h-11 translate-y-3 items-center justify-between rounded-[8px] bg-paper/90 pl-4 pr-1.5 text-[14px] font-semibold text-obsidian opacity-0 shadow-[0_10px_24px_-12px_rgb(14_17_19/0.5)] backdrop-blur-md transition-[opacity,transform,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-paper focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:hover)]:flex"
            >
              <span>
                {t('card.quickAdd')}
                <span className="sr-only">: {product.name}</span>
              </span>
              <span aria-hidden className="grid size-8 place-items-center rounded-[6px] bg-obsidian text-paper">
                <Plus className="size-4" />
              </span>
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
            <QuickAddPanel slug={product.slug} name={product.name} image={product.imageUrl} onClose={() => setQuick(false)} />
          </Suspense>
        )}
      </div>
      <div className="mt-3 flex flex-col px-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[13px] font-medium leading-tight text-graphite">{product.brand.name}</p>
          {product.colors.length > 1 && <p className="shrink-0 text-[12px] text-graphite">{t('card.colors', { n: product.colors.length })}</p>}
        </div>
        <h3 className="mt-1 line-clamp-2 text-[15px] font-medium leading-snug">
          <Link to={`/p/${product.slug}${hash ? `#${hash}` : ''}`} className="decoration-obsidian/30 underline-offset-[3px] after:absolute after:inset-0 group-hover:underline">
            {product.name}
          </Link>
        </h3>
        <Price cents={product.priceCents} compareAtCents={product.compareAtCents} size="md" className="mt-1.5 flex-wrap" />
        {product.availability === 'low' && product.lowStockCount ? (
          <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-vermilion">
            <span aria-hidden className="size-1.5 rounded-full bg-vermilion" />
            {t('availability.low', { n: product.lowStockCount })}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      <div className="skeleton aspect-[3/4] rounded-[12px]" />
      <div className="skeleton h-3 w-1/3 rounded" />
      <div className="skeleton h-4 w-4/5 rounded" />
      <div className="skeleton h-4 w-1/4 rounded" />
    </div>
  );
}
