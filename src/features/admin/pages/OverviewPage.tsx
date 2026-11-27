import { AlertTriangle, Banknote, ClipboardList, Clock3, HelpCircle, Package, PackageCheck, Printer, RotateCcw, ShoppingBag, Truck, Warehouse } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatUsd } from '../../../lib/i18n';
import { Picture, QueryView, Skeleton, cx } from '../../../ui';
import { useIsAdmin } from '../AdminLayout';
import { useAdminQuery } from '../api';
import type { Overview, Sales } from '../types';
import { AdminPage } from '../ui';

const RANGES = [7, 14, 30] as const;

export function OverviewPage() {
  const admin = useIsAdmin();
  const [range, setRange] = useState<(typeof RANGES)[number]>(14);
  const overview = useAdminQuery<Overview>(['overview'], '/v1/admin/overview', undefined, { refetchInterval: 60_000 });
  const sales = useAdminQuery<Sales>(['overview', 'sales'], '/v1/admin/overview/sales', { days: range }, { refetchInterval: 5 * 60_000, keepPrevious: true });

  return (
    <AdminPage title="Overview" description={overview.data?.branch ? `Numbers for your store (${overview.data.branch}).` : 'How the shop is doing, and what needs you now.'}>
      <QueryView query={overview} skeleton={<Skeleton className="h-28 w-full rounded-[14px]" />}>
        {(o) => (
          <section aria-label="Today" className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[14px] bg-obsidian px-5 py-4 text-paper">
            <span className="text-sm font-semibold text-paper/60">Today</span>
            <TodayFigure label="Orders today" unit={o.today.orders === 1 ? 'order' : 'orders'} value={String(o.today.orders)} />
            <TodayFigure label="Paid today" unit="paid" value={String(o.today.paidOrders)} />
            <TodayFigure label="Takings today" unit="takings" value={formatUsd(o.today.revenueCents)} />
          </section>
        )}
      </QueryView>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold leading-none">Last {range} days</h2>
        <div role="radiogroup" aria-label="Range" className="inline-flex rounded-full bg-stone p-1">
          {RANGES.map((r) => (
            <label key={r} className={cx('cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-obsidian', range === r ? 'bg-paper text-obsidian shadow-[0_1px_3px_rgb(14_17_19/0.15)]' : 'text-graphite hover:text-obsidian')}>
              <input type="radio" name="range" className="sr-only" checked={range === r} onChange={() => setRange(r)} aria-label={`${r} days`} />
              {r} days
            </label>
          ))}
        </div>
      </div>

      {sales.data ? (
        <>
          <section aria-label="Key figures" className={cx('grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-3', sales.isFetching && sales.isPlaceholderData && 'opacity-60')}>
            <Kpi label="Takings" value={formatUsd(sales.data.totals.revenueCents)} now={sales.data.totals.revenueCents} before={sales.data.previous.revenueCents} icon={<Banknote className="size-4" />} />
            <Kpi label="Paid orders" value={String(sales.data.totals.paidOrders)} now={sales.data.totals.paidOrders} before={sales.data.previous.paidOrders} icon={<ShoppingBag className="size-4" />} />
            <Kpi label="Average order" value={formatUsd(sales.data.totals.averageOrderCents)} now={sales.data.totals.averageOrderCents} before={sales.data.previous.averageOrderCents} icon={<ClipboardList className="size-4" />} />
          </section>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <section aria-label="Takings by day" className="rounded-[14px] border border-stone p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-graphite">Takings by day</h3>
              <SalesChart days={sales.data.days} />
            </section>
            <div className="flex flex-col gap-4">
              <section aria-labelledby="top-h" className="rounded-[14px] border border-stone p-4 sm:p-5">
                <h3 id="top-h" className="mb-3 text-sm font-semibold text-graphite">Best sellers</h3>
                {sales.data.topProducts.length === 0 ? (
                  <p className="text-sm text-graphite">No sales in this period yet.</p>
                ) : (
                  <ol className="flex flex-col gap-2.5">
                    {sales.data.topProducts.map((p) => (
                      <li key={p.productId} className="flex items-center gap-3">
                        <Picture src={p.imageUrl} alt="" sizes="40px" width={40} height={40} className="stage block size-10 shrink-0 overflow-hidden rounded-[8px]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="block text-xs text-graphite">{p.qty} sold</span>
                        </span>
                        <span className="tabular text-sm font-semibold">{formatUsd(p.revenueCents)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
              {sales.data.byCategory.length > 0 && (
                <section aria-labelledby="cat-h" className="rounded-[14px] border border-stone p-4 sm:p-5">
                  <h3 id="cat-h" className="mb-3 text-sm font-semibold text-graphite">By category</h3>
                  <ul className="flex flex-col gap-2.5">
                    {sales.data.byCategory.map((c) => {
                      const max = sales.data!.byCategory[0]!.revenueCents || 1;
                      return (
                        <li key={c.slug} className="text-sm">
                          <span className="flex justify-between gap-2">
                            <span>{c.name}</span>
                            <span className="tabular font-semibold">{formatUsd(c.revenueCents)}</span>
                          </span>
                          <span aria-hidden className="mt-1 block h-1.5 overflow-hidden rounded-full bg-stone">
                            <span className="block h-full rounded-full bg-cobalt transition-[width] duration-500" style={{ width: `${Math.max(4, (c.revenueCents / max) * 100)}%` }} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </>
      ) : sales.isError ? (
        <p className="rounded-[14px] bg-chalk p-4 text-sm text-graphite">The sales figures did not load. They refresh by themselves every few minutes.</p>
      ) : (
        <Skeleton className="h-72 w-full rounded-[14px]" />
      )}

      {overview.data && (
        <section aria-labelledby="waiting">
          <h2 id="waiting" className="mb-3 font-display text-2xl font-bold leading-none">
            Waiting for you
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <Todo to="/admin/orders?status=confirmed" label="To pack" n={overview.data.awaitingFulfilment.confirmed} icon={<PackageCheck />} />
            <Todo to="/admin/orders?status=printing" label="Being printed" n={overview.data.awaitingFulfilment.printing} icon={<Printer />} />
            <Todo to="/admin/orders?status=ready_for_pickup" label="Ready for pickup" n={overview.data.awaitingFulfilment.readyForPickup} icon={<Package />} />
            <Todo to="/admin/orders?status=out_for_delivery" label="Out for delivery" n={overview.data.awaitingFulfilment.outForDelivery} icon={<Truck />} />
            <Todo to="/admin/orders?status=pending_payment" label="Waiting for payment" n={overview.data.pendingPayments} icon={<Clock3 />} />
            <Todo to="/admin/orders?needsRefund=true" label="Refunds to make" n={overview.data.needsRefund} icon={<Banknote />} urgent />
            <Todo to="/admin/returns?status=requested" label="Returns to decide" n={overview.data.openReturns} icon={<RotateCcw />} urgent />
            <Todo to="/admin/questions?status=pending" label="Questions to answer" n={overview.data.pendingQuestions} icon={<HelpCircle />} />
            <Todo to="/admin/stock?view=low" label="Sizes with 1 to 3 left" n={overview.data.lowStockRows} icon={<Warehouse />} />
            <Todo to="/admin/stock?view=count" label="Stock rows to count" n={overview.data.needsCountRows} icon={<ClipboardList />} />
            {admin && <Todo to="/admin/logs" label="Messages that failed" n={overview.data.outboxFailed} icon={<AlertTriangle />} urgent />}
          </ul>
        </section>
      )}
    </AdminPage>
  );
}

function TodayFigure({ label, unit, value }: { label: string; unit: string; value: string }) {
  return (
    <p className="flex items-baseline gap-2" aria-label={`${label}: ${value}`}>
      <span className="tabular font-display text-2xl font-bold leading-none">{value}</span>
      <span aria-hidden className="text-sm text-paper/70">{unit}</span>
    </p>
  );
}

/** A figure for the period and how it moved against the period before (green up, red down). */
function Kpi({ label, value, now, before, icon }: { label: string; value: string; now: number; before: number; icon: ReactNode }) {
  const change = before > 0 ? Math.round(((now - before) / before) * 100) : null;
  const up = change !== null && change > 0;
  const down = change !== null && change < 0;
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2 rounded-[14px] border border-stone bg-paper p-4 sm:p-5">
      <span className="flex items-center gap-2 text-sm font-semibold text-graphite">
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-stone text-obsidian">
          {icon}
        </span>
        {label}
      </span>
      <span className="tabular font-display text-[34px] font-bold leading-none">{value}</span>
      <span className={cx('text-sm font-semibold', up ? 'text-success' : down ? 'text-vermilion' : 'text-graphite')}>
        {change === null ? 'No earlier figures' : `${change > 0 ? '+' : ''}${change}% vs previous period`}
      </span>
    </div>
  );
}

const shortDate = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

function SalesChart({ days }: { days: Sales['days'] }) {
  const data = days.map((d) => ({ ...d, label: shortDate(d.date), dollars: d.revenueCents / 100 }));
  return (
    <div className="mt-3 h-72" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="takings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#032EA1" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#032EA1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EAE7DF" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5A5D57' }} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis tick={{ fontSize: 12, fill: '#5A5D57' }} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => `$${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`} />
          <Tooltip
            cursor={{ stroke: '#0E1113', strokeOpacity: 0.15 }}
            contentStyle={{ borderRadius: 10, border: '1px solid #EAE7DF', fontSize: 13 }}
            formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Takings']}
          />
          <Area type="monotone" dataKey="dollars" stroke="#032EA1" strokeWidth={2.5} fill="url(#takings)" animationDuration={600} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Todo({ to, label, n, urgent, icon }: { to: string; label: string; n: number; urgent?: boolean; icon: ReactNode }) {
  const hot = urgent && n > 0;
  return (
    <li>
      <Link
        to={to}
        className={cx(
          'group flex items-center gap-3 rounded-[12px] border p-3 transition-colors hover:bg-chalk',
          hot ? 'border-vermilion/40 bg-vermilion/[0.04]' : 'border-stone',
          n === 0 && 'opacity-70',
        )}
      >
        <span aria-hidden className={cx('grid size-9 shrink-0 place-items-center rounded-full [&>svg]:size-4', hot ? 'bg-vermilion text-paper' : 'bg-stone text-obsidian')}>
          {icon}
        </span>
        <span className="flex-1">{label}</span>
        <span className={cx('tabular font-display text-2xl font-bold leading-none', hot && 'text-vermilion', n === 0 && 'text-graphite')}>{n}</span>
      </Link>
    </li>
  );
}
