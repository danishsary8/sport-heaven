import { Link } from 'react-router';
import { formatUsd } from '../../../lib/i18n';
import { QueryView, Skeleton, cx } from '../../../ui';
import { useIsAdmin } from '../AdminLayout';
import { useAdminQuery } from '../api';
import type { Overview } from '../types';
import { AdminPage } from '../ui';

export function OverviewPage() {
  const admin = useIsAdmin();
  const overview = useAdminQuery<Overview>(['overview'], '/v1/admin/overview', undefined, { refetchInterval: 60_000 });
  return (
    <AdminPage title="Overview">
      <QueryView query={overview} skeleton={<Skeleton className="h-64 w-full" />}>
        {(o) => (
          <>
            <section aria-label="Today" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Orders today" value={String(o.today.orders)} />
              <Stat label="Paid today" value={String(o.today.paidOrders)} />
              <Stat label="Takings today" value={formatUsd(o.today.revenueCents)} className="col-span-2 sm:col-span-1" />
            </section>
            {o.branch && <p className="text-sm text-graphite">Numbers for your store ({o.branch}).</p>}
            <section aria-labelledby="waiting">
              <h2 id="waiting" className="mb-3 text-lg font-semibold">
                Waiting for you
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <Todo to="/admin/orders?status=confirmed" label="To pack" n={o.awaitingFulfilment.confirmed} />
                <Todo to="/admin/orders?status=printing" label="Being printed" n={o.awaitingFulfilment.printing} />
                <Todo to="/admin/orders?status=ready_for_pickup" label="Ready for pickup" n={o.awaitingFulfilment.readyForPickup} />
                <Todo to="/admin/orders?status=out_for_delivery" label="Out for delivery" n={o.awaitingFulfilment.outForDelivery} />
                <Todo to="/admin/orders?status=pending_payment" label="Waiting for payment" n={o.pendingPayments} />
                <Todo to="/admin/orders?needsRefund=true" label="Refunds to make" n={o.needsRefund} urgent />
                <Todo to="/admin/returns?status=requested" label="Returns to decide" n={o.openReturns} urgent />
                <Todo to="/admin/questions?status=pending" label="Questions to answer" n={o.pendingQuestions} />
                <Todo to="/admin/stock" label="Sizes with 1 to 3 left" n={o.lowStockRows} />
                <Todo to="/admin/stock" label="Stock rows to count" n={o.needsCountRows} />
                {admin && <Todo to="/admin/logs" label="Messages that failed" n={o.outboxFailed} urgent />}
              </ul>
            </section>
          </>
        )}
      </QueryView>
    </AdminPage>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cx('min-w-0 rounded-[8px] border border-stone p-3 lg:p-4', className)}>
      <p className="text-sm text-graphite">{label}</p>
      <p className="tabular font-display text-3xl font-bold lg:text-4xl">{value}</p>
    </div>
  );
}

function Todo({ to, label, n, urgent }: { to: string; label: string; n: number; urgent?: boolean }) {
  return (
    <li>
      <Link to={to} className={cx('flex items-center justify-between rounded-[8px] border p-3 hover:bg-chalk', urgent && n > 0 ? 'border-vermilion/50' : 'border-stone')}>
        <span>{label}</span>
        <span className={cx('tabular text-xl font-bold', urgent && n > 0 && 'text-vermilion', n === 0 && 'text-graphite')}>{n}</span>
      </Link>
    </li>
  );
}
