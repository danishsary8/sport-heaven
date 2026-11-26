import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { formatDate, formatUsd, useI18n } from '../../lib/i18n';
import { Picture } from '../../ui';
import { StatusBadge } from '../orders/OrderParts';
import type { MyOrders } from './api';

export type OrderSummary = MyOrders['orders'][number];

/**
 * One order in the member's lists: photo of the first item, number, what's in it, date and total,
 * and the status. On phones the status drops under the details so the number never wraps.
 */
export function OrderRow({ order }: { order: OrderSummary }) {
  const { t, lang } = useI18n();
  const first = order.firstItem;
  const contents = order.itemCount > 1 ? t('acc.orderItems', { name: first?.name ?? '', n: order.itemCount - 1 }) : (first?.name ?? '');
  return (
    <Link to={`/account/orders/${encodeURIComponent(order.number)}`} className="group flex items-center gap-4 p-4 transition-colors hover:bg-chalk">
      <Picture src={first?.imageUrl} alt="" sizes="56px" width={56} height={75} className="stage block h-[75px] w-14 shrink-0 overflow-hidden rounded-[4px]" />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
        <span className="min-w-0 flex-1">
          <span className="tabular block font-semibold">{order.number}</span>
          {contents && <span className="block truncate text-sm text-graphite">{contents}</span>}
          <span className="tabular block text-sm text-graphite">
            {formatDate(order.createdAt, lang)}, {formatUsd(order.totalCents)}
          </span>
        </span>
        <span className="shrink-0">
          <StatusBadge status={order.status} />
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-graphite transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

/** A bordered list of orders. */
export function OrderList({ orders }: { orders: OrderSummary[] }) {
  return (
    <ul className="divide-y divide-stone overflow-hidden rounded-[8px] border border-stone bg-paper">
      {orders.map((o) => (
        <li key={o.number}>
          <OrderRow order={o} />
        </li>
      ))}
    </ul>
  );
}
