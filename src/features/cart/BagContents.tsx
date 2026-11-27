import { Check, ChevronDown, Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { isApiError } from '../../lib/api';
import { formatUsd, useI18n } from '../../lib/i18n';
import { Button, Picture, Price, Skeleton, cx, useToast } from '../../ui';
import { useApplyPromo, useRemoveLine, useRemovePromo, useUpdateLine, type Cart, type CartLine } from './api';
import { useProduct } from '../catalog/api';
import { sortSizes } from '../catalog/product/sizes';

export function BagLines({ cart, compact = false }: { cart: Cart; compact?: boolean }) {
  return (
    <ul className="divide-y divide-stone">
      {cart.lines.map((line) => (
        <BagLine key={line.id} line={line} compact={compact} />
      ))}
    </ul>
  );
}

function BagLine({ line, compact }: { line: CartLine; compact: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const update = useUpdateLine();
  const remove = useRemoveLine();
  const busy = update.isPending || remove.isPending;
  const onError = (e: unknown) => toast.error(isApiError(e) ? e.message : t('common.error'));
  const setQty = (qty: number) => update.mutate({ id: line.id, qty }, { onError });

  const problem =
    line.problem === 'unavailable'
      ? t('bag.problem.unavailable')
      : line.problem === 'exceeds_stock'
        ? line.availability === 'low' && line.lowStockCount
          ? t('bag.problem.onlyLeft', { n: line.lowStockCount })
          : t('bag.problem.notEnough')
        : null;

  return (
    <li className={cx('flex gap-3 py-4', busy && 'opacity-60')}>
      <Link to={`/p/${line.productSlug}`} tabIndex={-1} aria-hidden className={cx('stage block shrink-0 overflow-hidden rounded-[10px]', compact ? 'h-24 w-[72px]' : 'h-32 w-24')}>
        <Picture src={line.imageUrl} alt="" sizes="96px" width={96} height={128} className="block h-full w-full" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] text-graphite">{line.brand}</p>
            <Link to={`/p/${line.productSlug}`} className="line-clamp-2 font-medium leading-snug hover:underline">
              {line.productName}
            </Link>
          </div>
          <Price cents={line.lineTotalCents} size="sm" className="shrink-0" />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-graphite">
          <SizeSwitcher line={line} disabled={busy} onChange={(variantId, size) => update.mutate({ id: line.id, variantId }, { onError, onSuccess: () => toast.show({ tone: 'info', title: t('bag.sizeChanged', { size }), duration: 3000 }) })} />
          {line.color && <span>{line.color}</span>}
        </div>
        {line.customPrint && (
          <p className="text-sm text-graphite">
            {t('bag.print', { name: line.customPrint.name, number: line.customPrint.number })}
            {line.printFeeCents > 0 && ` (+${formatUsd(line.printFeeCents)})`}
          </p>
        )}
        {line.discountCents > 0 && <p className="text-sm text-vermilion">{t('bag.lineSaving', { amount: formatUsd(line.discountCents) })}</p>}
        {problem && (
          <p role="alert" className="text-sm font-medium text-vermilion">
            {problem}
          </p>
        )}
        {!problem && line.availability === 'low' && line.lowStockCount ? <p className="text-sm text-vermilion">{t('availability.low', { n: line.lowStockCount })}</p> : null}
        <div className="mt-auto flex items-center justify-between pt-1">
          {line.problem === 'unavailable' ? (
            <span />
          ) : (
            <div className="inline-flex items-center rounded-full border border-[#D6D2C8] bg-paper">
              <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-stone disabled:opacity-40 disabled:hover:bg-transparent" aria-label={t('bag.minus')} disabled={busy || line.qty <= 1} onClick={() => setQty(line.qty - 1)}>
                <Minus className="size-4" aria-hidden />
              </button>
              <span className="tabular w-8 text-center text-[15px] font-semibold" aria-label={t('bag.qty', { n: line.qty })}>
                {line.qty}
              </span>
              <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-stone disabled:opacity-40 disabled:hover:bg-transparent" aria-label={t('bag.plus')} disabled={busy || line.qty >= line.maxQty} onClick={() => setQty(line.qty + 1)}>
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          )}
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm text-graphite hover:bg-stone hover:text-obsidian"
            aria-label={t('bag.remove', { name: line.productName })}
            disabled={busy}
            onClick={() => remove.mutate(line.id, { onError })}
          >
            <Trash2 className="size-4" aria-hidden />
            <span aria-hidden>{t('bag.removeShort')}</span>
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * "Size EU 41" on a bag line opens the product's other sizes (same colour); choosing one swaps the line.
 * The product's sizes load when the list first opens.
 */
function SizeSwitcher({ line, disabled, onChange }: { line: CartLine; disabled: boolean; onChange(variantId: string, size: string): void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      wrap.current?.querySelector<HTMLButtonElement>('button')?.focus();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-label={t('bag.changeSize', { size: line.size })}
        onClick={() => setOpen((o) => !o)}
        className="-ml-1 inline-flex h-8 items-center gap-1 rounded-full border border-[#D6D2C8] bg-paper pl-3 pr-2 font-medium text-obsidian hover:border-obsidian disabled:opacity-50"
      >
        {t('bag.sizeOnly', { size: line.size })}
        <ChevronDown className={cx('size-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <SizeList
          line={line}
          onPick={(variantId, size) => {
            setOpen(false);
            if (size !== line.size) onChange(variantId, size);
          }}
        />
      )}
    </div>
  );
}

function SizeList({ line, onPick }: { line: CartLine; onPick(variantId: string, size: string): void }) {
  const { t } = useI18n();
  const product = useProduct(line.productSlug);
  const ref = useRef<HTMLDivElement>(null);
  const p = product.data?.product;
  const sameColour = p?.variants.filter((v) => v.color === line.color) ?? [];
  const variants = sameColour.length ? sameColour : (p?.variants ?? []);
  const sizes = sortSizes([...new Set(variants.map((v) => v.size))]);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-checked="true"], [role="radio"]:not([disabled])')?.focus();
  }, [product.isSuccess]);

  return (
    <div ref={ref} className="animate-mega absolute left-0 top-full z-30 mt-2 w-[min(280px,80vw)] rounded-[10px] bg-paper p-3 shadow-[0_18px_40px_-16px_rgb(14_17_19/0.45),0_0_0_1px_rgb(14_17_19/0.06)]">
      <p className="mb-2 text-[13px] font-semibold text-obsidian">{t('bag.pickSize')}</p>
      {product.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : product.isError ? (
        <p className="text-sm text-graphite">{t('common.error')}</p>
      ) : (
        <div role="radiogroup" aria-label={t('bag.pickSize')} className="grid grid-cols-4 gap-1.5">
          {sizes.map((s) => {
            const v = variants.find((x) => x.size === s)!;
            const out = v.availability === 'out';
            const on = s === line.size;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={out && !on}
                aria-label={out ? `${s}, ${t('availability.out')}` : s}
                onClick={() => onPick(v.id, s)}
                className={cx(
                  'relative h-9 rounded-[6px] border font-display text-[15px] font-bold transition-colors',
                  on ? 'border-obsidian bg-obsidian text-paper' : out ? 'cursor-not-allowed border-transparent bg-stone/50 text-graphite/50 line-through' : 'border-[#D6D2C8] hover:border-obsidian',
                )}
              >
                {s.replace(/^EU\s+/, '')}
                {on && <Check className="absolute -right-1 -top-1 size-3.5 rounded-full bg-success p-0.5 text-paper" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PromoField({ cart }: { cart: Cart }) {
  const { t } = useI18n();
  const apply = useApplyPromo();
  const remove = useRemovePromo();
  const [code, setCode] = useState('');
  const promo = cart.pricing.promo;

  if (promo.code) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[6px] bg-stone px-3 py-2 text-sm">
        <span>
          <span className="font-semibold">{t('bag.promoApplied', { code: promo.code })}</span>
          {promo.message && <span className="block text-graphite">{promo.message}</span>}
        </span>
        <button type="button" className="font-semibold underline underline-offset-4" onClick={() => remove.mutate()} disabled={remove.isPending}>
          {t('bag.promoRemove')}
        </button>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim()) apply.mutate(code.trim().toUpperCase(), { onSuccess: () => setCode('') });
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <label htmlFor="promo" className="text-sm font-semibold">
        {t('bag.promo')}
      </label>
      <div className="flex gap-2">
        <input
          id="promo"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={40}
          autoCapitalize="characters"
          autoComplete="off"
          aria-invalid={apply.isError || undefined}
          aria-describedby={apply.isError ? 'promo-error' : undefined}
          className="h-11 min-w-0 flex-1 rounded-[6px] border border-[#C9C5BB] bg-paper px-3 uppercase"
        />
        <Button type="submit" variant="secondary" loading={apply.isPending}>
          {t('bag.promoApply')}
        </Button>
      </div>
      {apply.isError && (
        <p id="promo-error" role="alert" className="text-sm font-medium text-vermilion">
          {isApiError(apply.error) ? apply.error.message : t('common.error')}
        </p>
      )}
    </form>
  );
}

/** Totals exactly as the API sends them. Delivery is unknown until checkout, so the total is "before delivery". */
export function BagTotals({ cart }: { cart: Cart }) {
  const { t } = useI18n();
  const p = cart.pricing;
  return (
    <dl className="flex flex-col gap-1.5 text-[15px]">
      <div className="flex justify-between">
        <dt>{t('bag.items')}</dt>
        <dd className="tabular">{formatUsd(p.merchandiseCents)}</dd>
      </div>
      {p.discounts.map((d) => (
        <div key={`${d.kind}-${d.label}`} className="flex justify-between text-vermilion">
          <dt>{d.label}</dt>
          <dd className="tabular">−{formatUsd(d.amountCents)}</dd>
        </div>
      ))}
      <div className="flex justify-between text-graphite">
        <dt>{t('bag.delivery')}</dt>
        <dd>{t('bag.deliveryLater')}</dd>
      </div>
      <div className="mt-1 flex justify-between border-t border-stone pt-2 text-lg font-semibold">
        <dt>{t('bag.total')}</dt>
        <dd className="tabular">{formatUsd(p.totalCents)}</dd>
      </div>
      {p.freeDeliveryRemainingCents ? <p className="text-sm text-cobalt">{t('bag.freeDeliveryIn', { amount: formatUsd(p.freeDeliveryRemainingCents) })}</p> : null}
      {p.messages.map((m) => (
        <p key={m} className="text-sm text-graphite">
          {m}
        </p>
      ))}
    </dl>
  );
}

export function CheckoutButton({ cart, onNavigate }: { cart: Cart; onNavigate?: () => void }) {
  const { t } = useI18n();
  if (!cart.checkoutReady) {
    return (
      <Button variant="buy" size="lg" block disabled>
        {t('bag.checkout')}
      </Button>
    );
  }
  return (
    <Link to="/checkout" onClick={onNavigate} className="inline-flex h-13 w-full items-center justify-center rounded-[6px] bg-vermilion px-6 text-base font-semibold text-paper hover:bg-[#A91D25]">
      {t('bag.checkout')}
    </Link>
  );
}
