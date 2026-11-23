import { useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  MapPin,
  Package,
  Printer,
  ShieldCheck,
  Truck,
  UserPlus,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { assignMorphSource } from '../hooks/useViewTransition';
import { formatKhr, formatUsd, getPatchLabel } from '../utils/commerce';

interface OrderConfirmationPageProps {
  orderId?: string;
}

export function OrderConfirmationPage({ orderId }: OrderConfirmationPageProps) {
  const {
    orders,
    lastOrderId,
    isAuthenticated,
    registerMember,
    navigate,
    navigateToShop,
  } = useStore();

  const targetId = orderId ?? lastOrderId;
  const order = orders.find((o) => o.id === targetId) ?? orders[0];

  const [guestPassword, setGuestPassword] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-extrabold uppercase">No recent order found</h1>
        <button
          type="button"
          onClick={() => navigateToShop({ collectionSlug: 'all' })}
          className="mt-4 bg-[#0E1113] px-6 py-3 font-mono text-xs uppercase text-[#FDFCF9] cursor-pointer"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const handleCreateGuestAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestPassword.length < 8) return;
    registerMember({
      fullName: order.customer.fullName,
      email: order.customer.email || `${order.customer.phone.replace(/\s+/g, '')}@sportcastle.kh`,
      phone: order.customer.phone,
    });
    setAccountCreated(true);
  };

  return (
    <div className="bg-[#F4F2EC] animate-page-reveal py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Confirmation Banner */}
        <div className="border border-[#0E1113] bg-[#FDFCF9] p-8 shadow-[8px_8px_0px_rgba(14,17,19,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#0E1113]/12 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#032EA1]">
                <CheckCircle2 className="h-4 w-4" />
                <span>ORDER CONFIRMED · THANK YOU</span>
              </div>
              <h1 className="mt-2 font-display text-4xl sm:text-5xl font-extrabold uppercase text-[#0E1113]">
                Order #{order.id}
              </h1>
              <p className="mt-1 font-editorial italic text-xl text-[#5A5D57]">
                Prepared with precision at our Phnom Penh atelier for {order.customer.fullName}.
              </p>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-10 items-center gap-2 border border-[#0E1113]/25 bg-[#F4F2EC] px-4 font-mono text-xs font-semibold uppercase text-[#0E1113] hover:border-[#0E1113] cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate({
                    page: 'orders',
                    orderId: order.id,
                    email: order.customer.email,
                  })
                }
                className="inline-flex h-10 items-center gap-2 bg-[#0E1113] px-4 font-mono text-xs font-semibold uppercase text-[#FDFCF9] hover:bg-[#C8232C] cursor-pointer whitespace-nowrap"
              >
                <Truck className="h-3.5 w-3.5" />
                Track Live
              </button>
            </div>
          </div>

          {/* Delivery Window & Logistics */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 border-b border-[#0E1113]/12 pb-6">
            <div className="border border-[#0E1113]/10 bg-[#F4F2EC] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5A5D57]">
                Estimated Arrival Window
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0E1113]">
                {order.fulfillmentMethod === 'pickup'
                  ? 'Ready in 30 mins (48h hold)'
                  : 'Today · Within 2–3 Hours'}
              </p>
            </div>
            <div className="border border-[#0E1113]/10 bg-[#F4F2EC] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5A5D57]">
                Fulfillment Destination
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0E1113]">
                {order.fulfillmentMethod === 'pickup'
                  ? `${order.pickupBranch?.toUpperCase()} Branch Pickup`
                  : `${order.customer.khan}, Phnom Penh`}
              </p>
              {order.customer.coordinates && (
                <p className="mt-1 inline-flex items-center gap-1 font-mono text-[10.5px] text-[#032EA1]">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>
                    GPS {order.customer.coordinates.lat.toFixed(4)},{' '}
                    {order.customer.coordinates.lng.toFixed(4)}
                  </span>
                </p>
              )}
            </div>
            <div className="border border-[#0E1113]/10 bg-[#F4F2EC] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5A5D57]">
                Payment Method
              </p>
              <p className="mt-1 font-mono text-sm font-semibold uppercase text-[#0E1113]">
                {order.paymentMethod.replace('-', ' ')}
              </p>
            </div>
          </div>

          {/* Itemized Receipt */}
          <div className="mt-6">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5A5D57]">
              Itemized Receipt ({order.items.length} Line Items)
            </h2>
            <div className="mt-3 divide-y divide-[#0E1113]/10 border border-[#0E1113]/12">
              {order.items.map((item) => (
                <div key={item.lineId} className="flex items-center justify-between gap-4 p-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      assignMorphSource(e.currentTarget.querySelector('img'));
                      navigate({ page: 'product', slug: item.slug }, item.slug);
                    }}
                    className="group flex items-center gap-3 min-w-0 text-left cursor-pointer"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-14 w-16 shrink-0 object-contain bg-[#EAE7DF] p-1 transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1 truncate text-sm font-semibold text-[#0E1113] group-hover:text-[#C8232C] transition-colors">
                        <span className="truncate">
                          {item.quantity}× {item.name}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </p>
                      <p className="font-mono text-[11px] text-[#5A5D57]">
                        Size: {item.size} · {item.colorway}
                      </p>
                      {item.customPrint?.enabled && (
                        <p className="font-mono text-[11px] text-[#032EA1]">
                          Print: {item.customPrint.playerName} #{item.customPrint.squadNumber} (
                          {getPatchLabel(item.customPrint.patch)})
                        </p>
                      )}
                    </div>
                  </button>
                  <span className="font-mono text-sm font-semibold tabular-nums shrink-0">
                    {formatUsd(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {order.giftNote && (
              <div className="mt-3 border border-[#B8933B]/40 bg-[#B8933B]/10 p-3 text-xs text-[#0E1113]">
                <strong>Gift / Rider Note:</strong> {order.giftNote}
              </div>
            )}

            <div className="mt-5 ml-auto max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-[#5A5D57]">
                <span>Subtotal</span>
                <span className="font-mono">{formatUsd(order.subtotal)}</span>
              </div>
              {order.teamDiscount > 0 && (
                <div className="flex justify-between text-[#032EA1]">
                  <span>Team Bulk Savings</span>
                  <span className="font-mono">-{formatUsd(order.teamDiscount)}</span>
                </div>
              )}
              {order.promoDiscount > 0 && (
                <div className="flex justify-between text-[#032EA1]">
                  <span>Promo ({order.promoCode})</span>
                  <span className="font-mono">-{formatUsd(order.promoDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#5A5D57]">
                <span>Shipping</span>
                <span className="font-mono">
                  {order.shippingFee === 0 ? 'FREE' : formatUsd(order.shippingFee)}
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-[#0E1113] pt-2 font-bold">
                <span>Total Paid</span>
                <div className="text-right">
                  <p className="font-mono text-lg">{formatUsd(order.totalUsd)}</p>
                  <p className="font-mono text-[11px] font-normal text-[#5A5D57]">
                    ≈ {formatKhr(order.totalUsd)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Guest-to-Account Creation Prompt */}
          {(!isAuthenticated || order.customer.isGuest) && !accountCreated && (
            <form
              onSubmit={handleCreateGuestAccount}
              className="mt-8 border border-[#0E1113]/15 bg-[#F4F2EC] p-5 no-print"
            >
              <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0E1113]">
                <UserPlus className="h-4 w-4 text-[#C8232C]" />
                <span>Save Your Details &amp; Earn {Math.round(order.totalUsd * 10)} Club Points</span>
              </div>
              <p className="mt-1 text-xs text-[#5A5D57]">
                Checked out as a guest? Set a password now to claim your Sport Castle Club tier
                and 1-click size exchanges.
              </p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  minLength={8}
                  required
                  value={guestPassword}
                  onChange={(e) => setGuestPassword(e.target.value)}
                  placeholder="Create password (8+ characters)"
                  className="h-10 flex-1 border border-[#0E1113]/20 bg-[#FDFCF9] px-3 text-sm focus:border-[#0E1113] focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-10 bg-[#0E1113] px-5 font-mono text-xs font-semibold uppercase text-[#FDFCF9] hover:bg-[#C8232C] cursor-pointer"
                >
                  Create Club Account
                </button>
              </div>
            </form>
          )}

          {accountCreated && (
            <div className="mt-6 flex items-center gap-2 border border-[#032EA1] bg-[#032EA1]/8 p-4 text-xs text-[#032EA1]">
              <ShieldCheck className="h-4 w-4" />
              <span>Sport Castle Club account activated! Your order &amp; points are now saved.</span>
            </div>
          )}

          {/* Post-Purchase Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#0E1113]/12 pt-6 no-print">
            <div className="flex items-center gap-2 text-xs text-[#5A5D57]">
              <Package className="h-4 w-4 text-[#0E1113]" />
              <span>Need a size swap later? Use our 30-day automated Returns Portal anytime.</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate({ page: 'returns' })}
                className="border border-[#0E1113]/20 px-4 py-2 font-mono text-xs uppercase text-[#0E1113] hover:border-[#0E1113] cursor-pointer"
              >
                Returns Portal
              </button>
              <button
                type="button"
                onClick={() => navigateToShop({ collectionSlug: 'all' })}
                className="bg-[#0E1113] px-5 py-2 font-mono text-xs font-semibold uppercase text-[#FDFCF9] hover:bg-[#C8232C] cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
