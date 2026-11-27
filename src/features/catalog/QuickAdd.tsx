import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { Skeleton, cx } from '../../ui';
import { AddToBagButton, useAddedAlert } from '../cart/AddToBagButton';
import { useAddToCart } from '../cart/api';
import { useProduct } from './api';
import { sortSizes } from './product/sizes';

/**
 * The quick-add bar opened into a size panel over the card's photo. Nothing is added until a size is
 * chosen and "Add to bag" is pressed. Uses the first colour with stock (other colours are on the product page).
 */
export function QuickAddPanel({ slug, name, image, onClose }: { slug: string; name: string; image?: string | null; onClose(): void }) {
  const { t } = useI18n();
  const product = useProduct(slug);
  const add = useAddToCart();
  const alert = useAddedAlert();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role="radio"]:not([disabled]), button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, product.isSuccess]);

  const p = product.data?.product;
  const color = p ? (p.colors.find((c) => p.variants.some((v) => v.color === c.name && v.availability !== 'out'))?.name ?? p.colors[0]?.name) : undefined;
  const variants = p ? p.variants.filter((v) => v.color === color) : [];
  const sizes = sortSizes([...new Set(variants.map((v) => v.size))]);
  const chosen = size ? variants.find((v) => v.size === size) : undefined;

  const addChosen = () => {
    if (!chosen) return Promise.reject(new Error('no size'));
    return add.mutateAsync({ variantId: chosen.id, qty: 1 }).then(
      () => undefined,
      (e: unknown) => {
        alert.failed(e);
        throw e;
      },
    );
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t('card.chooseSizeFor', { name })}
      className="animate-quick-open absolute inset-x-1.5 bottom-1.5 z-20 max-h-[calc(100%-0.75rem)] overflow-y-auto overscroll-contain rounded-[8px] bg-paper/[0.97] p-2.5 sm:inset-x-2 sm:bottom-2 sm:p-3 shadow-[0_16px_36px_-14px_rgb(14_17_19/0.5)] backdrop-blur-md"
    >
      <div className="mb-2 flex items-center justify-between gap-2 sm:mb-2.5">
        <p className="text-sm font-semibold">{size ? t('card.sizeChosen', { size }) : t('card.chooseSize')}</p>
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="-mr-1 -mt-1 grid size-8 place-items-center rounded-full text-graphite hover:bg-stone hover:text-obsidian">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      {product.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : product.isError ? (
        <Link to={`/p/${slug}`} className="text-sm font-semibold underline underline-offset-4">
          {t('card.openProduct')}
        </Link>
      ) : (
        <>
          <div role="radiogroup" aria-label={t('product.size')} className="grid grid-cols-4 gap-1 sm:gap-1.5">
            {sizes.map((s) => {
              const v = variants.find((x) => x.size === s)!;
              const out = v.availability === 'out';
              const on = size === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={out}
                  onClick={() => setSize(s)}
                  aria-label={out ? `${s}, ${t('availability.out')}` : s}
                  className={cx(
                    'h-8 rounded-[6px] border px-0.5 font-display text-[14px] sm:h-9 sm:text-[15px] font-bold leading-none transition-[background-color,border-color,color,transform] active:scale-95',
                    out
                      ? 'cursor-not-allowed border-transparent bg-stone/50 text-graphite/50 line-through'
                      : on
                        ? 'border-obsidian bg-obsidian text-paper'
                        : 'border-[#D6D2C8] bg-paper hover:border-obsidian',
                  )}
                >
                  {s.replace(/^EU\s+/, '')}
                </button>
              );
            })}
          </div>
          {sizes.some((s) => s.startsWith('EU ')) && <p className="mt-1.5 hidden text-xs text-graphite sm:block">{t('card.euSizes')}</p>}
          <AddToBagButton
            className="mt-2 sm:mt-2.5"
            size="md"
            tone="dark"
            disabled={!chosen}
            label={chosen ? t('product.add') : t('card.pickSizeFirst')}
            srLabel={chosen ? t('card.addSize', { size: chosen.size }) : undefined}
            onAdd={addChosen}
            onLanded={() => {
              // The alert waits for the bag to land, so the flight and the alert don't cross.
              if (chosen) alert.added({ name, size: chosen.size, image });
              onClose();
            }}
          />
        </>
      )}
    </div>
  );
}
