import { Minus, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { isApiError } from '../../lib/api';
import { formatUsd, useI18n } from '../../lib/i18n';
import { Button, Picture, Price, cx, useToast } from '../../ui';
import { useApplyPromo, useRemoveLine, useRemovePromo, useUpdateLine, type Cart, type CartLine } from './api';
import { lineDetails } from './lineDetails';

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
      <Link to={`/p/${line.productSlug}`} tabIndex={-1} aria-hidden className={cx('block shrink-0 overflow-hidden rounded-[6px] bg-stone', compact ? 'h-24 w-[72px]' : 'h-32 w-24')}>
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
        <p className="text-sm text-graphite">{lineDetails(line, t)}</p>
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
            <div className="inline-flex items-center rounded-[6px] border border-[#C9C5BB]">
              <button type="button" className="grid size-9 place-items-center disabled:opacity-40" aria-label={t('bag.minus')} disabled={busy || line.qty <= 1} onClick={() => setQty(line.qty - 1)}>
                <Minus className="size-4" aria-hidden />
              </button>
              <span className="tabular w-8 text-center text-[15px] font-semibold" aria-label={t('bag.qty', { n: line.qty })}>
                {line.qty}
              </span>
              <button type="button" className="grid size-9 place-items-center disabled:opacity-40" aria-label={t('bag.plus')} disabled={busy || line.qty >= line.maxQty} onClick={() => setQty(line.qty + 1)}>
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          )}
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-[6px] px-2 text-sm text-graphite hover:bg-stone hover:text-obsidian"
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
