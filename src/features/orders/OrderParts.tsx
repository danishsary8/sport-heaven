import { CheckCircle2, Circle, MapPin, Store } from 'lucide-react';
import { formatDate, formatKhr, formatUsd, useI18n, type DictKey } from '../../lib/i18n';
import { Picture, cx } from '../../ui';
import { lineDetails } from '../cart/BagContents';
import type { OrderView } from './api';

export type OrderStatus = OrderView['status'];

export function statusLabel(status: string, t: ReturnType<typeof useI18n>['t']): string {
  return t(`status.${status}` as DictKey);
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  const tone =
    status === 'cancelled' || status === 'expired'
      ? 'bg-stone text-graphite'
      : status === 'pending_payment' || status === 'awaiting_pickup_payment'
        ? 'bg-vermilion/10 text-vermilion'
        : status === 'delivered' || status === 'completed'
          ? 'bg-success/10 text-success'
          : 'bg-cobalt/10 text-cobalt';
  return <span className={cx('inline-flex rounded-full px-3 py-1 text-sm font-semibold', tone)}>{statusLabel(status, t)}</span>;
}

/** The steps the order has been through, newest last, in cobalt (store/payment information colour). */
export function Timeline({ timeline = [] }: { timeline?: { at: string; to: string | null }[] }) {
  const { t, lang } = useI18n();
  const steps = timeline.filter((s) => s.to);
  return (
    <ol aria-label={t('order.progress')} className="flex flex-col gap-3">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={`${s.at}-${s.to}`} className="flex gap-3">
            {last ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-cobalt" aria-hidden /> : <Circle className="mt-0.5 size-5 shrink-0 text-cobalt/50" aria-hidden />}
            <span>
              <span className={cx('block', last && 'font-semibold')}>{statusLabel(s.to!, t)}</span>
              <span className="block text-sm text-graphite">{formatDate(s.at, lang, { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderItems({ items }: { items: OrderView['items'] }) {
  const { t } = useI18n();
  return (
    <ul className="divide-y divide-stone">
      {items.map((it) => (
        <li key={it.id} className="flex gap-3 py-3">
          <Picture src={it.imageUrl} alt="" sizes="64px" width={64} height={85} className="block h-[85px] w-16 shrink-0 overflow-hidden rounded-[6px] bg-stone" />
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug">{it.name}</p>
            <p className="text-sm text-graphite">{lineDetails(it, t)}</p>
            {it.customPrint && <p className="text-sm text-graphite">{t('bag.print', { name: it.customPrint.name, number: it.customPrint.number })}</p>}
            <p className="text-sm text-graphite">{t('order.qty', { n: it.qty })}</p>
          </div>
          <span className="tabular shrink-0 font-semibold">{formatUsd(it.lineTotalCents)}</span>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotals({ pricing }: { pricing: OrderView['pricing'] }) {
  const { t, lang } = useI18n();
  return (
    <dl className="flex flex-col gap-1.5 text-[15px]">
      <div className="flex justify-between">
        <dt>{t('bag.items')}</dt>
        <dd className="tabular">{formatUsd(pricing.merchandiseCents)}</dd>
      </div>
      {pricing.discounts.map((d) => (
        <div key={`${d.kind}-${d.label}`} className="flex justify-between text-vermilion">
          <dt>{d.label}</dt>
          <dd className="tabular">−{formatUsd(d.amountCents)}</dd>
        </div>
      ))}
      <div className="flex justify-between">
        <dt>{t('bag.delivery')}</dt>
        <dd className="tabular">{pricing.shippingCents ? formatUsd(pricing.shippingCents) : t('bag.free')}</dd>
      </div>
      <div className="mt-1 flex justify-between border-t border-stone pt-2 text-lg font-semibold">
        <dt>{t('co.total')}</dt>
        <dd className="tabular">{formatUsd(pricing.totalCents)}</dd>
      </div>
      <p className="text-right text-sm text-graphite tabular">{formatKhr(pricing.totalKhr, lang)}</p>
    </dl>
  );
}

type AddressLike = { recipientName?: string; street?: string; provinceName?: { en: string; km?: string }; districtName?: { en: string; km?: string }; communeName?: { en: string; km?: string } } | null;

export function Fulfilment({ order }: { order: Pick<OrderView, 'fulfillment' | 'pickupBranch' | 'paymentMethod'> & { shipAddress?: unknown } }) {
  const { t, lang } = useI18n();
  const a = (order.shipAddress ?? null) as AddressLike;
  const name = (n?: { en: string; km?: string }) => (n ? (lang === 'km' ? (n.km ?? n.en) : n.en) : null);
  return (
    <div className="flex flex-col gap-4 text-[15px]">
      {order.fulfillment === 'pickup' ? (
        <p className="flex gap-2">
          <Store className="mt-0.5 size-4 shrink-0 text-cobalt" aria-hidden />
          <span>
            <span className="block font-semibold">{t('order.pickupAt')}</span>
            {order.pickupBranch?.name}
          </span>
        </p>
      ) : (
        <p className="flex gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-cobalt" aria-hidden />
          <span>
            <span className="block font-semibold">{t('order.deliverTo')}</span>
            {a ? (
              <>
                {a.recipientName && <span className="block">{a.recipientName}</span>}
                {a.street && <span className="block">{a.street}</span>}
                <span className="block text-graphite">{[name(a.communeName), name(a.districtName), name(a.provinceName)].filter(Boolean).join(', ')}</span>
              </>
            ) : (
              <span className="block text-graphite">{t('order.addressHidden')}</span>
            )}
          </span>
        </p>
      )}
      <p>
        <span className="block font-semibold">{t('co.payment')}</span>
        {t(`co.pay.${order.paymentMethod}` as DictKey)}
      </p>
    </div>
  );
}
