import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { formatDate, formatUsd, useI18n } from '../../../lib/i18n';
import { Button, EmptyState, Picture, QueryView, Seo, Skeleton } from '../../../ui';
import { OrderDetailView } from '../../orders/OrderPage';
import { StatusBadge } from '../../orders/OrderParts';
import { useMyOrder, useMyOrders, type MyOrder } from '../api';

export function MyOrdersPage() {
  const { t, lang } = useI18n();
  const [page, setPage] = useState(1);
  const orders = useMyOrders(page);
  return (
    <div className="flex flex-col gap-6">
      <Seo title={t('acc.nav.orders')} noindex />
      <h1 className="font-display text-5xl font-bold">{t('acc.nav.orders')}</h1>
      <QueryView
        query={orders}
        skeleton={<Skeleton className="h-48 w-full" />}
        isEmpty={(d) => d.orders.length === 0}
        empty={<EmptyState title={t('acc.noOrders')} action={<Link to="/shop" className="font-semibold underline underline-offset-4">{t('listing.shopAll')}</Link>} />}
      >
        {(d) => (
          <>
            <ul className="divide-y divide-stone rounded-[8px] border border-stone">
              {d.orders.map((o) => (
                <li key={o.number}>
                  <Link to={`/account/orders/${o.number}`} className="flex items-center gap-3 p-4 hover:bg-chalk">
                    <Picture src={o.firstItem?.imageUrl} alt="" sizes="48px" width={48} height={64} className="block h-16 w-12 shrink-0 overflow-hidden rounded bg-stone" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{o.number}</span>
                      <span className="block truncate text-sm text-graphite">{o.itemCount > 1 ? t('acc.orderItems', { name: o.firstItem?.name ?? '', n: o.itemCount - 1 }) : (o.firstItem?.name ?? '')}</span>
                      <span className="block text-sm text-graphite">
                        {formatDate(o.createdAt, lang)}, {formatUsd(o.totalCents)}
                      </span>
                    </span>
                    <StatusBadge status={o.status} />
                    <ChevronRight className="size-4 shrink-0 text-graphite" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              {page > 1 && (
                <Button variant="secondary" onClick={() => setPage(page - 1)}>
                  {t('acc.newer')}
                </Button>
              )}
              {d.page * d.pageSize < d.total && (
                <Button variant="secondary" onClick={() => setPage(page + 1)}>
                  {t('acc.older')}
                </Button>
              )}
            </div>
          </>
        )}
      </QueryView>
    </div>
  );
}

/** Items can be returned while the exchange window is open and something is still returnable. */
export function canReturn(order: MyOrder['order'], now = Date.now()): boolean {
  return !!order.returnWindow && new Date(order.returnWindow.exchangeUntil).getTime() > now && order.items.some((i) => i.returnableQty > 0);
}

export function MyOrderPage() {
  const { number = '' } = useParams();
  const { t, lang } = useI18n();
  const order = useMyOrder(number);
  return (
    <>
      <Seo title={t('order.title', { number })} noindex />
      <QueryView query={order} skeleton={<Skeleton className="h-96 w-full" />}>
        {(d) => (
          <div className="flex flex-col gap-6">
            <OrderDetailView order={d.order} backTo={{ href: '/account/orders', label: t('acc.nav.orders') }} />
            {d.order.returnWindow && (
              <section className="rounded-[8px] border border-stone p-4">
                <p className="text-[15px]">
                  {t('acc.returnWindow', { exchange: formatDate(d.order.returnWindow.exchangeUntil, lang), refund: formatDate(d.order.returnWindow.refundUntil, lang) })}
                </p>
                {canReturn(d.order) && (
                  <Link to={`/account/returns/new?order=${encodeURIComponent(d.order.number)}`} className="mt-3 inline-flex h-11 items-center rounded-[6px] bg-obsidian px-5 font-semibold text-paper">
                    {t('acc.startReturn')}
                  </Link>
                )}
              </section>
            )}
          </div>
        )}
      </QueryView>
    </>
  );
}
