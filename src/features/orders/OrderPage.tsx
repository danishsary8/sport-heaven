import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { isApiError } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
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
  const { t } = useI18n();
  const toast = useToast();
  const cancel = useCancelOrder(order.number);
  const [asking, setAsking] = useState(false);
  const unpaid = order.status === 'pending_payment' && order.paymentStatus === 'unpaid';
  const canCancel = order.status === 'pending_payment' || order.status === 'awaiting_pickup_payment';
  const thanks = confirmationMessage(order, t);

  return (
    <div className="flex flex-col gap-8">
      <div>
        {backTo && (
          <Link to={backTo.href} className="text-sm font-semibold text-graphite hover:underline">
            {backTo.label}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <PageTitle>{t('order.title', { number: order.number })}</PageTitle>
          <StatusBadge status={order.status} />
        </div>
        {thanks && <p className="mt-3 rounded-[8px] bg-cobalt/[0.06] px-4 py-3 text-[17px] font-semibold text-cobalt">{thanks}</p>}
        {unpaid && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to={`/pay/${order.number}`} className="inline-flex h-12 items-center rounded-[6px] bg-vermilion px-6 font-semibold text-paper hover:bg-[#A91D25]">
              {t('order.payNow')}
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="items-h">
            <h2 id="items-h" className="font-display text-2xl font-bold">
              {t('order.items')}
            </h2>
            <OrderItems items={order.items} />
          </section>
          <OrderTotals pricing={order.pricing} />
        </div>
        <aside className="flex flex-col gap-6">
          <section aria-labelledby="progress-h">
            <h2 id="progress-h" className="mb-3 font-display text-2xl font-bold">
              {t('order.progressTitle')}
            </h2>
            <Timeline timeline={order.timeline} />
          </section>
          <Fulfilment order={order} />
          {order.returnWindow && <p className="text-sm text-graphite">{t('order.returnWindowShort')}</p>}
          {canCancel && (
            <Button variant="ghost" className="self-start -ml-3" onClick={() => setAsking(true)}>
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
