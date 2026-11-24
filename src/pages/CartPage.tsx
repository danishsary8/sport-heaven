import { useState } from 'react';
import { formatKitVariant } from '../lib/product-attributes';
import {
  ArrowRight,
  Gift,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react';
import { PRODUCTS } from '../data/catalog';
import { useStore } from '../context/StoreContext';
import {
  calculateCartTotals,
  FREE_SHIPPING_THRESHOLD,
  formatKhr,
  formatUsd,
  getPatchLabel,
} from '../utils/commerce';
import { ProductMedia } from '../components/product';

type ShippingRegion = 'phnom-penh' | 'province' | 'international' | 'pickup';

export function CartPage() {
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    giftNote,
    setGiftNote,
    promoCode,
    setPromoCode,
    addToCart,
    navigate,
    navigateToShop,
  } = useStore();

  const [promoInput, setPromoInput] = useState(promoCode);
  const [region, setRegion] = useState<ShippingRegion>('phnom-penh');

  const baseTotals = calculateCartTotals(
    cart,
    promoCode,
    region === 'pickup' ? 'pickup' : 'delivery',
  );

  // Region-aware shipping & estimated VAT/duties calculator
  const estimatedShipping =
    cart.length === 0 || region === 'pickup'
      ? 0
      : region === 'phnom-penh'
        ? baseTotals.shippingFee
        : region === 'province'
          ? baseTotals.subtotal >= 90
            ? 0
            : 3.5
          : 24;

  const estimatedTax = 0; // Cambodia retail prices include VAT
  const grandTotal = Number(
    (
      Math.max(
        0,
        baseTotals.subtotal - baseTotals.teamDiscount - baseTotals.promoDiscount,
      ) +
      estimatedShipping +
      estimatedTax
    ).toFixed(2),
  );

  const progressPct = Math.min(
    100,
    Math.round((baseTotals.subtotal / FREE_SHIPPING_THRESHOLD) * 100),
  );

  const cartIds = new Set(cart.map((c) => c.productId));
  const quickUpsells = PRODUCTS.filter(
    (p) => (p.category === 'essentials' || p.category === 'balls') && !cartIds.has(p.id),
  ).slice(0, 3);

  return (
    <div className="bg-[#F4F2EC] animate-page-reveal">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-10">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#0E1113]/12 pb-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5A5D57]">
              SPORT CASTLE BAG · FULL-PAGE SUMMARY
            </p>
            <h1 className="mt-1 font-display text-4xl sm:text-5xl font-extrabold uppercase text-[#0E1113]">
              Your Match Bag ({baseTotals.itemCount})
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigateToShop({ collectionSlug: 'all' })}
            className="font-mono text-xs uppercase tracking-[0.1em] text-[#0E1113] underline underline-offset-4 hover:text-[#C8232C] cursor-pointer"
          >
            Continue Shopping →
          </button>
        </div>

        {/* Free Shipping Bar */}
        <div className="mt-6 border border-[#0E1113]/12 bg-[#FDFCF9] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 font-medium text-[#0E1113]">
              <Truck className="h-4 w-4 text-[#C8232C]" />
              {baseTotals.freeShippingRemaining === 0 && cart.length > 0 ? (
                <span>
                  <strong className="text-[#032EA1]">FREE Same-Day Phnom Penh Express Delivery</strong>{' '}
                  unlocked!
                </span>
              ) : (
                <span>
                  Add <strong className="font-mono">{formatUsd(baseTotals.freeShippingRemaining)}</strong>{' '}
                  more to unlock Free Phnom Penh Express Delivery ($50+ threshold).
                </span>
              )}
            </span>
            <span className="font-mono text-xs text-[#5A5D57]">{progressPct}%</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-[#EAE7DF] overflow-hidden">
            <div
              className="h-full bg-[#0E1113] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="mt-8 border border-[#0E1113]/12 bg-[#FDFCF9] p-12 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-[#5A5D57]" strokeWidth={1.4} />
            <h2 className="mt-4 font-editorial italic text-3xl text-[#0E1113]">
              Your match bag is currently empty.
            </h2>
            <p className="mt-2 text-sm text-[#5A5D57]">
              Explore 14 flagship boots, 27 authentic 2026/27 kits, or custom metallic gift cards.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => navigateToShop({ collectionSlug: 'football-boots' })}
                className="bg-[#0E1113] px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#FDFCF9] hover:bg-[#C8232C] cursor-pointer"
              >
                Shop Boots
              </button>
              <button
                type="button"
                onClick={() => navigateToShop({ collectionSlug: 'ucl-2026-27' })}
                className="border border-[#0E1113] bg-[#FDFCF9] px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#0E1113] hover:bg-[#EAE7DF] cursor-pointer"
              >
                Shop 2026/27 Kits
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Line Items + Gift Note */}
            <div className="lg:col-span-8 space-y-4">
              <div className="border border-[#0E1113]/12 bg-[#FDFCF9] divide-y divide-[#0E1113]/10">
                {cart.map((item) => (
                  <div
                    key={item.lineId}
                    className="flex flex-col sm:flex-row gap-4 p-5 items-start sm:items-center"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        item.slug === 'gift-card'
                          ? navigate({ page: 'gift-card' })
                          : navigate({ page: 'product', slug: item.slug })
                      }
                      className="h-24 w-28 shrink-0 overflow-hidden bg-[#EAE7DF] border border-[#0E1113]/10 cursor-pointer"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5A5D57]">
                        {item.brand} · {item.colorway}
                      </p>
                      <h2 className="mt-0.5 text-base font-semibold text-[#0E1113]">
                        {item.name}
                      </h2>
                      <p className="mt-1 font-mono text-xs text-[#5A5D57]">
                        Size / Spec: <strong className="text-[#0E1113]">{item.size}</strong>
                      </p>
                      {item.variant && (
                        <p className="mt-0.5 text-xs text-[#5A5D57]">{formatKitVariant(item.variant)}</p>
                      )}
                      {item.customPrint?.enabled && (
                        <p className="mt-1 font-mono text-[11px] text-[#032EA1]">
                          HEAT-PRESS: {item.customPrint.playerName || 'NO NAME'} #
                          {item.customPrint.squadNumber || '--'} ·{' '}
                          {getPatchLabel(item.customPrint.patch)} (+$8.00)
                        </p>
                      )}
                      {item.giftCardMeta && (
                        <p className="mt-1 font-mono text-[11px] text-[#B8933B]">
                          FOR: {item.giftCardMeta.recipientName} ({item.giftCardMeta.recipientEmail})
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="flex items-center border border-[#0E1113]/20 bg-[#F4F2EC]">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.lineId, -1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="flex h-9 w-9 items-center justify-center text-[#0E1113] hover:bg-[#EAE7DF] cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-9 text-center font-mono text-xs font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.lineId, 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="flex h-9 w-9 items-center justify-center text-[#0E1113] hover:bg-[#EAE7DF] cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="w-24 text-right">
                        <p className="font-mono text-sm font-semibold tabular-nums text-[#0E1113]">
                          {formatUsd(item.unitPrice * item.quantity)}
                        </p>
                        <p className="font-mono text-[10px] text-[#5A5D57]">
                          {formatKhr(item.unitPrice * item.quantity)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.lineId)}
                        aria-label={`Remove ${item.name}`}
                        className="p-2 text-[#5A5D57] hover:text-[#C8232C] cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Gift Note Input */}
              <div className="border border-[#0E1113]/12 bg-[#FDFCF9] p-5">
                <label className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0E1113]">
                  <Gift className="h-4 w-4 text-[#B8933B]" />
                  <span>Add Complimentary Gift Note or Rider Instructions</span>
                </label>
                <textarea
                  rows={2}
                  value={giftNote}
                  onChange={(e) => setGiftNote(e.target.value)}
                  placeholder="Write a personal matchday gift message or special Phnom Penh delivery instructions..."
                  className="mt-3 w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 py-2 text-sm text-[#0E1113] focus:border-[#0E1113] focus:outline-none"
                />
              </div>

              {/* Complete Your Match Bag Upsells */}
              {quickUpsells.length > 0 && (
                <div className="border border-[#0E1113]/12 bg-[#FDFCF9] p-5">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5A5D57] mb-3">
                    Complete Your Match Bag
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {quickUpsells.map((up) => (
                      <div
                        key={up.id}
                        className="flex items-center gap-3 border border-[#0E1113]/12 bg-[#F4F2EC] p-2.5"
                      >
                        <ProductMedia product={up} className="h-14 w-16 shrink-0 bg-[#EAE7DF]" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-[#0E1113]">
                            {up.shortName}
                          </p>
                          <p className="font-mono text-xs text-[#5A5D57]">{formatUsd(up.price)}</p>
                          <button
                            type="button"
                            onClick={() => addToCart(up, up.sizes[0], 1, undefined, false)}
                            className="mt-1 font-mono text-[10px] font-semibold uppercase text-[#C8232C] hover:underline cursor-pointer"
                          >
                            + Quick Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sticky Order Calculator */}
            <aside className="lg:col-span-4">
              <div className="sticky top-24 border border-[#0E1113] bg-[#FDFCF9] p-6 space-y-5">
                <h2 className="font-display text-2xl font-extrabold uppercase text-[#0E1113] border-b border-[#0E1113]/12 pb-3">
                  Order Summary
                </h2>

                {/* Promo Code */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setPromoCode(promoInput.trim().toUpperCase());
                  }}
                  className="space-y-2"
                >
                  <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5A5D57]">
                    Promo / Coupon Code
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5A5D57]" />
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder="CASTLE10 or PPFREE"
                        className="h-10 w-full border border-[#0E1113]/20 bg-[#F4F2EC] pl-9 pr-3 font-mono text-xs uppercase text-[#0E1113] focus:border-[#0E1113] focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="h-10 bg-[#0E1113] px-4 font-mono text-xs font-semibold uppercase text-[#FDFCF9] hover:bg-[#C8232C] cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {baseTotals.promoMessage && (
                    <p
                      className={`font-mono text-[11px] ${
                        baseTotals.promoValid ? 'text-[#032EA1]' : 'text-[#C8232C]'
                      }`}
                    >
                      {baseTotals.promoMessage}
                    </p>
                  )}
                </form>

                {/* Shipping & Tax Estimator */}
                <div className="space-y-2 border-t border-[#0E1113]/12 pt-4">
                  <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5A5D57]">
                    Estimated Shipping &amp; Tax Calculator
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value as ShippingRegion)}
                    className="h-10 w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 text-xs font-medium text-[#0E1113] focus:border-[#0E1113] focus:outline-none"
                  >
                    <option value="phnom-penh">Phnom Penh Express Same-Day (Free $50+)</option>
                    <option value="pickup">In-Store Branch Pickup (Free · Ready 30m)</option>
                    <option value="province">Cambodia Provinces — Virak Buntham ($3.50 / Free $90+)</option>
                    <option value="international">International DHL Express ($24.00)</option>
                  </select>
                </div>

                {/* Totals */}
                <div className="space-y-2 border-t border-[#0E1113]/12 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#5A5D57]">Subtotal</span>
                    <span className="font-mono tabular-nums">{formatUsd(baseTotals.subtotal)}</span>
                  </div>
                  {baseTotals.teamDiscount > 0 && (
                    <div className="flex justify-between text-[#032EA1]">
                      <span>Squad Bulk Discount (5+ Kits)</span>
                      <span className="font-mono">-{formatUsd(baseTotals.teamDiscount)}</span>
                    </div>
                  )}
                  {baseTotals.promoDiscount > 0 && (
                    <div className="flex justify-between text-[#032EA1]">
                      <span>Promo ({promoCode})</span>
                      <span className="font-mono">-{formatUsd(baseTotals.promoDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#5A5D57]">Estimated Shipping</span>
                    <span className="font-mono">
                      {estimatedShipping === 0 ? 'FREE' : formatUsd(estimatedShipping)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5A5D57]">Cambodia VAT (Included)</span>
                    <span className="font-mono">$0.00</span>
                  </div>

                  <div className="flex items-baseline justify-between border-t border-[#0E1113] pt-3">
                    <span className="font-display text-lg font-extrabold uppercase">Total</span>
                    <div className="text-right">
                      <p className="font-mono text-xl font-bold tabular-nums text-[#0E1113]">
                        {formatUsd(grandTotal)}
                      </p>
                      <p className="font-mono text-[11px] text-[#5A5D57]">
                        ≈ {formatKhr(grandTotal)} (1 USD = 4,100 KHR)
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate({ page: 'checkout' })}
                  className="flex h-12 w-full items-center justify-center gap-2 bg-[#0E1113] font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#FDFCF9] hover:bg-[#C8232C] transition-colors cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
