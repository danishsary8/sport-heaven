import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { isApiError } from '../../lib/api';
import { Copy, Lock } from 'lucide-react';
import { formatDate, formatUsd, useI18n } from '../../lib/i18n';
import { CheckoutSteps } from '../checkout/CheckoutSteps';
import { Button, EmptyState, PageTitle, QueryView, Seo, Sheet, Skeleton, useToast } from '../../ui';
import { useCancelOrder, useOrder, type OrderView } from './api';
import { Fulfilment, OrderItems, OrderTotals, StatusBadge, Timeline } from './OrderParts';
import { confirmationMessage } from './confirmation';

export function OrderPage() {
  const { number = '' } = useParams();
  const { t } = useI18n();
  const order = useOrder(number);
  if (order.isError && isApiError(order.error) && [401, 403, 404].includes(order.error.status)) {
    return (
      <section className="mx-auto max-w-[720px] px-4 py-10">
        <Seo title={t('order.title', { number })} noindex />
        <EmptyState
          title={t('pay.noAccess')}
          body={t('pay.noAccessBody')}
          action={
            <Link to="/track" className="inline-flex h-11 items-center rounded-[6px] bg-obsidian px-5 font-semibold text-paper">
              {t('pay.findOrder')}
            </Link>
          }
        />
      </section>
    );
  }
  return (
    <section className="mx-auto max-w-[1120px] px-4 pb-16 pt-6 lg:px-8 lg:pt-10">
      <Seo title={t('order.title', { number })} noindex />
      <QueryView query={order} skeleton={<Skeleton className="h-96 w-full" />}>
        {(d) => <OrderDetailView order={d.order} />}
      </QueryView>
    </section>
  );
}

export function OrderDetailView({ order, backTo }: { order: OrderView; backTo?: { href: string; label: string } }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const cancel = useCancelOrder(order.number);
  const [asking, setAsking] = useState(false);
  const unpaid = order.status === 'pending_payment' && order.paymentStatus === 'unpaid';
  const canCancel = order.status === 'pending_payment' || order.status === 'awaiting_pickup_payment';
  const thanks = confirmationMessage(order, t);

  const copy = () => {
    void navigator.clipboard?.writeText(order.number).then(
      () => toast.success(t('order.copied')),
      () => undefined,
    );
  };
  const placed = formatDate(order.createdAt, lang, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col gap-8">
      {backTo && (
        <Link to={backTo.href} className="-mb-4 text-sm font-semibold text-graphite hover:underline">
          {backTo.label}
        </Link>
      )}
      {thanks ? (
        <div className="flex flex-col items-center text-center">
          <CheckoutSteps current={4} className="mb-8" />
          <svg viewBox="0 0 56 56" className="done-mark size-[72px]" aria-hidden>
            <circle cx="28" cy="28" r="25" fill="#1F6B3A" stroke="#1F6B3A" strokeWidth="3" />
            <path d="M17 29l7 7 15-16" fill="none" stroke="#FDFCF9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="animate-rise mt-5 max-w-[22ch] font-display text-[40px] font-bold leading-[0.98] sm:text-[52px]" style={{ ['--d' as string]: '900ms' }}>
            {thanks}
          </p>
          <p className="animate-rise mt-3 max-w-[52ch] text-[15px] text-graphite" style={{ ['--d' as string]: '1000ms' }}>
            {order.fulfillment === 'pickup' ? t('order.nextPickup') : t('order.nextDelivery')}
          </p>
          {/* The order number as a match-ticket stub: the number on the left, when and how much on the right. */}
          <div className="animate-rise mt-8 w-full max-w-[560px]" style={{ ['--d' as string]: '1100ms' }}>
            <div className="ticket grid grid-cols-[1.3fr_1fr] overflow-hidden rounded-[14px] bg-obsidian text-left text-paper">
              <div className="flex flex-col gap-1 border-r-2 border-dashed border-paper/20 p-5">
                <span className="text-[13px] text-paper/60">{t('order.number')}</span>
                <h1 className="font-display text-[30px] font-bold leading-none tracking-[0.01em] sm:text-[34px]">
                  <span className="sr-only">{t('order.title', { number: order.number })}</span>
                  <span aria-hidden>{order.number}</span>
                </h1>
                <button type="button" onClick={copy} className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-paper/10 px-3 py-1 text-[13px] font-semibold hover:bg-paper/20">
                  <Copy className="size-3.5" aria-hidden />
                  {t('order.copy')}
                </button>
              </div>
              <div className="flex flex-col justify-between gap-2 p-5">
                <span className="text-[13px] text-paper/60">{placed}</span>
                <span className="tabular font-display text-[28px] font-bold leading-none">{formatUsd(order.pricing.totalCents)}</span>
                <span className="flag-rule block h-2 w-10 rounded-[1px]" aria-hidden />
              </div>
            </div>
          </div>
          <div className="animate-rise mt-6 flex flex-wrap justify-center gap-3" style={{ ['--d' as string]: '1200ms' }}>
            <Link to="/shop" className="inline-flex h-12 items-center rounded-[10px] bg-obsidian px-6 font-semibold text-paper hover:bg-[#2A2E31]">
              {t('order.keepShopping')}
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <PageTitle>{t('order.title', { number: order.number })}</PageTitle>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-2 text-sm text-graphite">{t('order.placedOn', { date: placed })}</p>
          {unpaid && (
            <div className="mt-5 flex flex-wrap items-center gap-4 rounded-[14px] bg-vermilion/[0.06] p-4">
              <p className="flex-1 text-[15px] font-medium">{t('order.unpaidNote')}</p>
              <Link to={`/pay/${order.number}`} className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-vermilion px-6 font-semibold text-paper hover:bg-[#A91D25]">
                <Lock className="size-4" aria-hidden />
                {t('order.payNow')}
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <section aria-labelledby="items-h" className="flex h-fit flex-col gap-4 rounded-[16px] border border-stone p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="items-h" className="font-display text-[28px] font-bold leading-none">
              {t('order.items')}
            </h2>
            {thanks && <StatusBadge status={order.status} />}
          </div>
          <OrderItems items={order.items} />
          <div className="border-t border-dashed border-[#C9C5BB] pt-4">
            <OrderTotals pricing={order.pricing} />
          </div>
        </section>
        <aside className="flex flex-col gap-4">
          <section aria-labelledby="progress-h" className="rounded-[16px] bg-chalk p-5 sm:p-6">
            <h2 id="progress-h" className="mb-4 font-display text-[28px] font-bold leading-none">
              {t('order.progressTitle')}
            </h2>
            <Timeline timeline={order.timeline} />
          </section>
          <section className="rounded-[16px] border border-stone p-5 sm:p-6">
            <Fulfilment order={order} />
          </section>
          {order.returnWindow && <p className="px-1 text-sm text-graphite">{t('order.returnWindowShort')}</p>}
          {canCancel && (
            <Button variant="ghost" className="self-start" onClick={() => setAsking(true)}>
              {t('order.cancel')}
            </Button>
          )}
        </aside>
      </div>

      <Sheet open={asking} onClose={() => setAsking(false)} side="center" title={t('order.cancelTitle')}>
        <p>{t('order.cancelBody')}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="primary"
            loading={cancel.isPending}
            onClick={() =>
              cancel.mutate(undefined, {
                onSuccess: () => {
                  setAsking(false);
                  toast.success(t('order.cancelled'));
                },
                onError: (e) => toast.error(isApiError(e) ? e.message : t('common.error')),
              })
            }
          >
            {t('order.cancelYes')}
          </Button>
          <Button variant="secondary" onClick={() => setAsking(false)}>
            {t('order.cancelNo')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
