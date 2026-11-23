import { useState } from 'react';
import {
  Check,
  Package,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';
import { PRODUCTS } from '../data/catalog';
import { useStore } from '../context/StoreContext';
import {
  formatKhr,
  formatTelegramOrderMessage,
  formatUsd,
  getPatchLabel,
} from '../utils/commerce';

const STAGES = [
  'Confirmed',
  'Heat-Press Printing',
  'Rider Dispatched',
  'Delivered',
] as const;

export function OrdersPage() {
  const { orders, addToCart, setCartOpen, pushToast } = useStore();
  const [lookup, setLookup] = useState('');

  const cleanLookup = lookup.trim().toUpperCase().replace(/^#/, '');
  const visibleOrders = cleanLookup
    ? orders.filter(
        (o) =>
          o.id.toUpperCase().includes(cleanLookup) ||
          o.customer.phone.replace(/\s/g, '').includes(cleanLookup.replace(/\s/g, '')),
      )
    : orders;

  const handleReorder = (orderId: string) => {
    const found = orders.find((o) => o.id === orderId);
    if (!found) return;
    found.items.forEach((item) => {
      const product = PRODUCTS.find((p) => p.id === item.productId);
      if (product) {
        addToCart(product, item.size, item.quantity, item.customPrint, false);
      }
    });
    pushToast(`Added items from #${orderId} back to your bag`);
    setCartOpen(true);
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#18222D]/10 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#032EA1]">
            Phnom Penh Dispatch &amp; Printing Tracker
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#18222D]">
            Order History &amp; Live Status
          </h1>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#56616A]" />
          <input
            type="text"
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="Lookup Order ID (e.g. SC-8810) or Phone"
            aria-label="Lookup order by ID or phone"
            className="h-10 w-full rounded-md border border-[#18222D]/15 bg-white pl-9 pr-3 font-mono text-xs text-[#18222D] focus:border-[#18222D] focus:outline-none"
          />
        </div>
      </div>

      {visibleOrders.length === 0 ? (
        <div className="mt-10 rounded-xl border border-[#18222D]/10 bg-white p-12 text-center">
          <Package className="mx-auto h-9 w-9 text-[#56616A]/50" />
          <p className="mt-3 font-display text-base font-bold text-[#18222D]">
            No orders matched &ldquo;{lookup}&rdquo;
          </p>
          <p className="mt-1 text-xs text-[#56616A]">
            Try searching SC-8810 or clear the search box to view your recent orders.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {visibleOrders.map((order) => {
            const stageIdx = STAGES.indexOf(order.status);
            return (
              <article
                key={order.id}
                className="rounded-xl border border-[#18222D]/10 bg-white p-6 space-y-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#18222D]/8 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="font-mono text-lg font-bold text-[#18222D]">
                        #{order.id}
                      </h2>
                      <span className="text-xs font-semibold text-[#032EA1]">
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#56616A]">
                      Placed {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      · {order.customer.fullName} ·{' '}
                      {order.fulfillmentMethod === 'delivery'
                        ? `Express Delivery (${order.customer.khan})`
                        : `Pickup at ${order.pickupBranch?.toUpperCase()}`}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-lg font-bold tabular-nums text-[#18222D]">
                      {formatUsd(order.totalUsd)}
                    </p>
                    <p className="font-mono text-[11px] tabular-nums text-[#56616A]">
                      {formatKhr(order.totalUsd)} · {order.paymentMethod.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* 4-Stage Visual Progress Stepper */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STAGES.map((stage, idx) => {
                    const completed = idx <= stageIdx;
                    return (
                      <div
                        key={stage}
                        className={`rounded-lg border p-3 text-xs ${
                          completed
                            ? 'border-[#18222D] bg-[#F5F7F8] text-[#18222D]'
                            : 'border-[#18222D]/10 text-[#56616A]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                              completed
                                ? 'bg-[#18222D] text-white'
                                : 'bg-[#E8EDF2] text-[#56616A]'
                            }`}
                          >
                            {completed ? <Check className="h-2.5 w-2.5" /> : idx + 1}
                          </span>
                          <span className="truncate">{stage}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Items */}
                <ul className="divide-y divide-[#18222D]/8 text-xs">
                  {order.items.map((item) => (
                    <li
                      key={item.lineId}
                      className="flex items-start justify-between gap-4 py-2.5"
                    >
                      <div>
                        <p className="font-semibold text-[#18222D]">
                          {item.quantity}x {item.name} — Size {item.size}
                        </p>
                        {item.customPrint?.enabled && (
                          <p className="mt-0.5 font-mono text-[11px] text-[#032EA1]">
                            Custom Print: {item.customPrint.playerName} #
                            {item.customPrint.squadNumber} ·{' '}
                            {getPatchLabel(item.customPrint.patch)}
                          </p>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-[#18222D]">
                        {formatUsd(item.unitPrice * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#18222D]/8 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(formatTelegramOrderMessage(order))
                        .catch(() => {});
                      pushToast(`Copied #${order.id} receipt for Telegram`);
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#18222D]/20 px-3.5 text-xs font-semibold text-[#18222D] hover:border-[#18222D] cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Copy Telegram Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(order.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#18222D] px-3.5 text-xs font-semibold text-white hover:bg-[#0B0D10] cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Buy Again</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
