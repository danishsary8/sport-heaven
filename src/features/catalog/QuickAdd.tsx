import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { isApiError } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { Skeleton, cx, useToast } from '../../ui';
import { useAddToCart } from '../cart/api';
import { useProduct } from './api';
import { sortSizes } from './product/sizes';

/**
 * Size picker over a product card's photo: choosing a size adds it to the bag. Uses the first colour
 * with stock (other colours are on the product page). Loaded on first use, so cards stay light.
 */
export function QuickAddPanel({ slug, name, onClose }: { slug: string; name: string; onClose(): void }) {
  const { t } = useI18n();
  const toast = useToast();
  const product = useProduct(slug);
  const add = useAddToCart();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, product.isSuccess]);

  const p = product.data?.product;
  const color = p ? (p.colors.find((c) => p.variants.some((v) => v.color === c.name && v.availability !== 'out'))?.name ?? p.colors[0]?.name) : undefined;
  const variants = p ? p.variants.filter((v) => v.color === color) : [];
  const sizes = sortSizes([...new Set(variants.map((v) => v.size))]);

  const choose = (variantId: string) =>
    add.mutate(
      { variantId, qty: 1 },
      {
        onSuccess: () => {
          toast.success(t('product.added'));
          onClose();
        },
        onError: (e) => toast.error(isApiError(e) ? e.message : t('common.error')),
      },
    );

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t('card.chooseSizeFor', { name })}
      className="animate-quick absolute inset-x-2 bottom-2 z-20 rounded-[8px] bg-paper/95 p-3 shadow-[0_10px_30px_-12px_rgb(14_17_19/0.45)] backdrop-blur"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{t('card.chooseSize')}</p>
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="-mr-1 grid size-8 place-items-center rounded-full hover:bg-stone">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      {product.isPending ? (
        <Skeleton className="h-9 w-full" />
      ) : product.isError ? (
        <Link to={`/p/${slug}`} className="text-sm font-semibold underline underline-offset-4">
          {t('card.openProduct')}
        </Link>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {sizes.map((s) => {
            const v = variants.find((x) => x.size === s)!;
            const out = v.availability === 'out';
            return (
              <button
                key={s}
                type="button"
                disabled={out || add.isPending}
                onClick={() => choose(v.id)}
                aria-label={out ? `${s}, ${t('availability.out')}` : t('card.addSize', { size: s })}
                className={cx(
                  'h-9 min-w-11 rounded-[6px] border px-2 font-display text-[15px] font-bold transition-colors',
                  out ? 'cursor-not-allowed border-stone text-graphite/60 line-through' : 'border-[#C9C5BB] bg-paper hover:border-obsidian hover:bg-obsidian hover:text-paper',
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
