import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { formatDate, useI18n } from '../../../lib/i18n';
import { Button, EmptyState, PageTitle, QueryView, Seo, Skeleton } from '../../../ui';
import { OrderDetailView } from '../../orders/OrderPage';
import { OrderList } from '../OrderRow';
import { useMyOrder, useMyOrders } from '../api';
import { canReturn } from '../returns';

export function MyOrdersPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const orders = useMyOrders(page);
  return (
    <div className="flex flex-col gap-6">
      <Seo title={t('acc.nav.orders')} noindex />
      <PageTitle>{t('acc.nav.orders')}</PageTitle>
      <QueryView
        query={orders}
        skeleton={<Skeleton className="h-48 w-full" />}
        isEmpty={(d) => d.orders.length === 0}
        empty={<EmptyState title={t('acc.noOrders')} action={<Link to="/shop" className="font-semibold underline underline-offset-4">{t('listing.shopAll')}</Link>} />}
      >
        {(d) => (
          <>
            <OrderList orders={d.orders} />
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
