import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Flame,
  MapPin,
  Package,
  RotateCcw,
  Truck,
} from 'lucide-react';
import type { Order, PageRoute } from '../../types/store';
import { formatKhr, formatUsd, getPatchLabel } from '../../utils/commerce';
import {
  ORDER_STATUS_FILTERS,
  filterOrdersByStatus,
  formatOrderDate,
  formatOrderFulfillmentLabel,
  getOrderHistorySummary,
  getOrderStatusCounts,
  getOrderStatusMeta,
  getRecentOrders,
  type OrderStatus,
  type OrderStatusFilter,
} from '../../utils/orderHistory';
import { assignMorphSource } from '../../hooks/useViewTransition';
import { OrderTransitTimeline } from './OrderTransitTimeline';

interface MyOrdersSectionProps {
  orders: Order[];
  memberEmail: string;
  mode: 'summary' | 'full';
  onNavigate: (next: PageRoute, morphSlug?: string) => void;
  onReorder: (order: Order) => void;
  onViewAllOrders?: () => void;
}

function StatusIcon({ status }: { status: OrderStatus }) {
  switch (status) {
    case 'Heat-Press Printing':
      return <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />;
    case 'Rider Dispatched':
      return <Truck className="h-3 w-3 shrink-0" aria-hidden="true" />;
    case 'Delivered':
      return <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />;
    case 'Confirmed':
    default:
      return <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />;
  }
}

export function MyOrdersSection({
  orders,
  memberEmail,
  mode,
  onNavigate,
  onReorder,
  onViewAllOrders,
}: MyOrdersSectionProps) {
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');

  const summary = useMemo(() => getOrderHistorySummary(orders), [orders]);
  const statusCounts = useMemo(() => getOrderStatusCounts(orders), [orders]);
  const visibleOrders = useMemo(() => {
    if (mode === 'summary') {
      return getRecentOrders(orders, 3);
    }
    return filterOrdersByStatus(orders, statusFilter);
  }, [mode, orders, statusFilter]);

  const handleTrackOrder = (order: Order) => {
    onNavigate({
      page: 'orders',
      orderId: order.id,
      email: order.customer.email || memberEmail,
    });
  };

  return (
    <section
      aria-labelledby={mode === 'summary' ? 'my-orders-overview-heading' : 'my-orders-full-heading'}
      className={mode === 'summary' ? 'mt-10' : ''}
    >
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#0E1113]/15 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-[#B8933B] uppercase">
            {mode === 'summary' ? 'RECENT ORDER ACTIVITY' : 'ORDER ARCHIVE · PHNOM PENH'}
          </p>
          <h2
            id={mode === 'summary' ? 'my-orders-overview-heading' : 'my-orders-full-heading'}
            className="mt-1 font-display text-3xl font-extrabold tracking-tight text-[#0E1113] uppercase sm:text-4xl"
          >
            My Orders
          </h2>
          <p className="mt-1 text-xs text-[#5A5D57]">
            {summary.totalOrders === 0
              ? 'Your recent Phnom Penh deliveries, heat-press studio orders, and branch pickups will appear here.'
              : `${summary.activeOrders} active ${summary.activeOrders === 1 ? 'order' : 'orders'} in progress · ${summary.deliveredOrders} delivered across ${summary.totalItems} ${summary.totalItems === 1 ? 'item' : 'items'}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {mode === 'summary' && onViewAllOrders && (
            <button
              type="button"
              onClick={onViewAllOrders}
              className="inline-flex items-center gap-2 border border-[#0E1113] bg-[#FDFCF9] px-4 py-2.5 font-mono text-[11px] font-bold tracking-[0.12em] text-[#0E1113] uppercase transition hover:bg-[#0E1113] hover:text-[#FDFCF9]"
            >
              <span>View All My Orders ({orders.length})</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate({ page: 'orders' })}
            className="inline-flex items-center gap-2 border border-[#0E1113]/20 bg-[#FDFCF9] px-4 py-2.5 font-mono text-[11px] font-bold tracking-[0.12em] text-[#0E1113]/80 uppercase transition hover:border-[#0E1113] hover:text-[#0E1113]"
          >
            <Truck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Track By Order ID</span>
          </button>
        </div>
      </div>

      {/* Full Mode: Summary Metrics + Status Filter Bar */}
      {mode === 'full' && (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-4">
              <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#5A5D57] uppercase">
                Total Orders
              </p>
              <p className="mt-1.5 font-mono text-2xl font-bold text-[#0E1113] tabular-nums">
                {summary.totalOrders}
              </p>
            </div>
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-4">
              <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#032EA1] uppercase">
                Active / In Transit
              </p>
              <p className="mt-1.5 font-mono text-2xl font-bold text-[#0E1113] tabular-nums">
                {summary.activeOrders}
              </p>
            </div>
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-4">
              <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-emerald-900 uppercase">
                Delivered
              </p>
              <p className="mt-1.5 font-mono text-2xl font-bold text-[#0E1113] tabular-nums">
                {summary.deliveredOrders}
              </p>
            </div>
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-4">
              <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#B8933B] uppercase">
                Total Spend
              </p>
              <p className="mt-1.5 font-mono text-2xl font-bold text-[#0E1113] tabular-nums">
                {formatUsd(summary.totalSpentUsd)}
              </p>
            </div>
          </div>

          <div
            role="group"
            aria-label="Filter orders by status"
            className="flex flex-wrap items-center gap-2"
          >
            {ORDER_STATUS_FILTERS.map((tab) => {
              const count = statusCounts[tab.value];
              const isSelected = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`inline-flex items-center gap-2 border px-3.5 py-2 font-mono text-[11px] font-bold tracking-[0.1em] uppercase whitespace-nowrap transition ${
                    isSelected
                      ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                      : 'border-[#0E1113]/15 bg-[#FDFCF9] text-[#0E1113]/75 hover:border-[#0E1113] hover:text-[#0E1113]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`font-mono text-[10px] tabular-nums ${
                      isSelected ? 'text-[#B8933B]' : 'text-[#5A5D57]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Orders List / Empty States */}
      {orders.length === 0 ? (
        <div className="mt-6 border border-[#0E1113]/15 bg-[#FDFCF9] px-6 py-14 text-center">
          <Package className="mx-auto h-8 w-8 text-[#0E1113]/35" aria-hidden="true" />
          <h3 className="mt-3 font-display text-2xl font-extrabold text-[#0E1113] uppercase">
            No Recent Orders Yet
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-[#5A5D57]">
            Explore our 2026/27 authentic kits, football boots, and custom heat-press studio with same-day Phnom Penh delivery.
          </p>
          <button
            type="button"
            onClick={() => onNavigate({ page: 'shop', collectionSlug: 'all' })}
            className="mt-5 inline-flex items-center gap-2 bg-[#0E1113] px-5 py-3 font-mono text-[11px] font-bold tracking-[0.14em] text-[#FDFCF9] uppercase transition hover:bg-[#C8232C]"
          >
            <span>Browse Master Catalog</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="mt-6 border border-[#0E1113]/15 bg-[#FDFCF9] px-6 py-12 text-center">
          <Package className="mx-auto h-7 w-7 text-[#0E1113]/35" aria-hidden="true" />
          <h3 className="mt-3 font-display text-2xl font-extrabold text-[#0E1113] uppercase">
            No {statusFilter === 'active' ? 'In-Progress' : statusFilter} Orders
          </h3>
          <p className="mt-1 text-xs text-[#5A5D57]">
            None of your {orders.length} recorded orders currently match this status filter.
          </p>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="mt-4 inline-flex items-center gap-2 border border-[#0E1113] bg-[#0E1113] px-4 py-2.5 font-mono text-[11px] font-bold tracking-[0.12em] text-[#FDFCF9] uppercase transition hover:bg-[#C8232C] hover:border-[#C8232C]"
          >
            Show All Orders ({orders.length})
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {visibleOrders.map((order) => {
            const meta = getOrderStatusMeta(order.status);
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <article
                key={order.id}
                className="border border-[#0E1113]/15 bg-[#FDFCF9] transition hover:border-[#0E1113]/40"
              >
                {/* Card Header: Order ID, Date, Semantic Status Badge, Total */}
                <div className="flex flex-col justify-between gap-3 border-b border-[#0E1113]/10 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="font-mono text-sm font-bold tracking-[0.06em] text-[#0E1113]">
                      #{order.id}
                    </span>
                    <span className="font-mono text-[11px] text-[#5A5D57]">
                      {formatOrderDate(order.createdAt)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.12em] uppercase whitespace-nowrap ${meta.badgeClass}`}
                    >
                      <StatusIcon status={order.status} />
                      <span>{meta.label}</span>
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.1em] text-[#5A5D57] uppercase">
                      {order.paymentMethod.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2.5 sm:text-right">
                    <span className="font-mono text-base font-bold text-[#0E1113] tabular-nums">
                      {formatUsd(order.totalUsd)}
                    </span>
                    <span className="font-mono text-[11px] text-[#5A5D57] tabular-nums">
                      ≈ {formatKhr(order.totalUsd)}
                    </span>
                  </div>
                </div>

                {/* Dynamic Visual Transit Timeline */}
                <OrderTransitTimeline
                  order={order}
                  variant={mode === 'full' ? 'detailed' : 'compact'}
                />

                {/* Items List */}
                <div className="divide-y divide-[#0E1113]/10 px-5">
                  {order.items.map((item) => (
                    <div
                      key={item.lineId}
                      className="flex items-center justify-between gap-4 py-3.5"
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <button
                          type="button"
                          aria-label={`View ${item.name}`}
                          onClick={(e) => {
                            const img = e.currentTarget.querySelector('img');
                            assignMorphSource(img);
                            onNavigate({ page: 'product', slug: item.slug }, item.slug);
                          }}
                          className="h-14 w-14 shrink-0 overflow-hidden border border-[#0E1113]/10 bg-[#EAE7DF] p-1 transition hover:border-[#0E1113]"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className={`h-full w-full object-contain ${item.imageCropClass ?? ''}`}
                          />
                        </button>
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() =>
                              onNavigate({ page: 'product', slug: item.slug }, item.slug)
                            }
                            className="block w-full text-left font-display text-base leading-tight font-extrabold break-words text-[#0E1113] uppercase transition hover:text-[#C8232C] sm:text-lg"
                          >
                            {item.name}
                          </button>
                          <p className="mt-0.5 font-mono text-[11px] text-[#5A5D57]">
                            Size {item.size} · Qty {item.quantity} · {formatUsd(item.unitPrice)}
                          </p>
                          {item.customPrint?.enabled && (
                            <p className="mt-0.5 font-mono text-[10px] font-bold tracking-[0.06em] text-[#C8232C] uppercase">
                              CUSTOM PRINT: {item.customPrint.playerName || 'NONE'} #
                              {item.customPrint.squadNumber || '--'} ·{' '}
                              {getPatchLabel(item.customPrint.patch)}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-xs font-bold text-[#0E1113] tabular-nums">
                        {formatUsd(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer: Fulfillment Metadata & Action Controls */}
                <div className="flex flex-col justify-between gap-3 border-t border-[#0E1113]/10 bg-[#FDFCF9] px-5 py-3.5 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-[#5A5D57]">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#0E1113]">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#B8933B]" aria-hidden="true" />
                      {formatOrderFulfillmentLabel(order)}
                    </span>
                    <span>
                      · {itemCount} {itemCount === 1 ? 'piece' : 'pieces'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTrackOrder(order)}
                      className="inline-flex items-center gap-1.5 border border-[#032EA1] bg-[#032EA1]/5 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.12em] text-[#032EA1] uppercase whitespace-nowrap transition hover:bg-[#032EA1] hover:text-[#FDFCF9]"
                    >
                      <Truck className="h-3 w-3" aria-hidden="true" />
                      <span>Track Live</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate({
                          page: 'account',
                          section: 'orders',
                          orderId: order.id,
                        })
                      }
                      className="inline-flex items-center gap-1.5 border border-[#0E1113] px-3 py-2 font-mono text-[10px] font-bold tracking-[0.12em] text-[#0E1113] uppercase whitespace-nowrap transition hover:bg-[#0E1113] hover:text-[#FDFCF9]"
                    >
                      <FileText className="h-3 w-3" aria-hidden="true" />
                      <span>Invoice &amp; Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onReorder(order)}
                      className="inline-flex items-center gap-1.5 bg-[#0E1113] px-3 py-2 font-mono text-[10px] font-bold tracking-[0.12em] text-[#FDFCF9] uppercase whitespace-nowrap transition hover:bg-[#C8232C]"
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                      <span>Reorder</span>
                    </button>
                    {mode === 'full' && (
                      <button
                        type="button"
                        onClick={() => onNavigate({ page: 'returns' })}
                        className="border border-[#0E1113]/20 px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-[#0E1113]/75 uppercase whitespace-nowrap transition hover:border-[#0E1113] hover:text-[#0E1113]"
                      >
                        Return
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
