import { useEffect, useState } from 'react';
import { formatKitVariant } from '../../lib/product-attributes';
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { PRODUCTS } from '../../data/catalog';
import { useStore } from '../../context/StoreContext';
import {
  calculateCartTotals,
  FREE_SHIPPING_THRESHOLD,
  formatKhr,
  formatUsd,
  getPatchLabel,
} from '../../utils/commerce';
import { ProductMedia } from '../product/ProductMedia';

export function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setCartOpen,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    promoCode,
    setPromoCode,
    navigate,
    navigateToShop,
  } = useStore();

  const [promoInput, setPromoInput] = useState(promoCode);

  useEffect(() => {
    if (!isCartOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCartOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCartOpen, setCartOpen]);

  if (!isCartOpen) return null;

  const totals = calculateCartTotals(cart, promoCode, 'delivery');
  const progressPct = Math.min(
    100,
    Math.round((totals.subtotal / FREE_SHIPPING_THRESHOLD) * 100),
  );

  const cartIds = new Set(cart.map((c) => c.productId));
  const upsells = PRODUCTS.filter(
    (p) =>
      (p.category === 'essentials' || p.category === 'balls') &&
      !cartIds.has(p.id),
  ).slice(0, 2);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoCode(promoInput.trim().toUpperCase());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
    >
      <div
        className="animate-overlay-fade fixed inset-0 bg-[#0B0D10]/45 backdrop-blur-[2px]"
        onClick={() => setCartOpen(false)}
      />

      <div className="animate-drawer-right relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#18222D]/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-[#18222D]" strokeWidth={1.7} />
            <h2 className="font-display text-lg font-bold tracking-tight text-[#18222D]">
              Your Bag ({totals.itemCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close shopping bag"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#56616A] hover:bg-[#F5F7F8] hover:text-[#18222D] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free Phnom Penh Delivery Progress Bar */}
        {cart.length > 0 && (
          <div className="border-b border-[#18222D]/8 bg-[#F5F7F8] px-6 py-3">
            <div className="flex items-center justify-between text-xs font-medium text-[#18222D]">
              {totals.freeShippingRemaining > 0 ? (
                <span>
                  Add <strong className="font-mono">{formatUsd(totals.freeShippingRemaining)}</strong> for free Phnom Penh express delivery
                </span>
              ) : (
                <span className="text-[#032EA1] font-semibold">
                  Free Phnom Penh Express Delivery unlocked
                </span>
              )}
              <span className="font-mono text-[11px] text-[#56616A]">{progressPct}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#18222D]/10">
              <div
                className="h-full bg-[#18222D] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Line Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="h-10 w-10 text-[#56616A]/50" strokeWidth={1.4} />
              <p className="mt-4 font-display text-base font-semibold text-[#18222D]">
                Your match bag is empty
              </p>
              <p className="mt-1 max-w-xs text-sm text-[#56616A]">
                Explore 14 flagship boots, 2026/27 Top 5 league kits, Cambodia Varaman jerseys, and FIFA match balls.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigateToShop({ category: 'all' });
                }}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-[#18222D] px-5 text-sm font-medium text-white hover:bg-[#0B0D10] cursor-pointer"
              >
                <span>Browse Catalog</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-[#18222D]/10">
                {cart.map((item) => (
                  <li key={item.lineId} className="flex gap-4 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        setCartOpen(false);
                        navigate({ page: 'product', slug: item.slug }, item.slug);
                      }}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-[#E5EBF0] cursor-pointer"
                      aria-label={`View ${item.name}`}
                    >
                      <ProductMedia product={item} className="h-full w-full" />
                    </button>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCartOpen(false);
                            navigate({ page: 'product', slug: item.slug }, item.slug);
                          }}
                          className="text-left text-sm font-semibold leading-snug text-[#18222D] hover:underline cursor-pointer"
                        >
                          {item.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.lineId)}
                          aria-label={`Remove ${item.name} from bag`}
                          className="p-1 text-[#56616A] hover:text-[#D81E2B] cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-0.5 text-xs text-[#56616A]">
                        {item.colorway} · Size {item.size}
                      </p>
                      {item.variant && (
                        <p className="mt-0.5 text-xs text-[#56616A]">{formatKitVariant(item.variant)}</p>
                      )}

                      {item.customPrint?.enabled && (
                        <div className="mt-1.5 rounded bg-[#F5F7F8] px-2.5 py-1.5 text-[11px] text-[#18222D] border border-[#18222D]/8">
                          <span className="font-semibold">Custom Print:</span>{' '}
                          <span className="font-mono uppercase">
                            {item.customPrint.playerName || 'NO NAME'} #{item.customPrint.squadNumber || '--'}
                          </span>
                          {item.customPrint.patch !== 'none' && (
                            <span className="block text-[#56616A]">
                              Patch: {getPatchLabel(item.customPrint.patch)}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-md border border-[#18222D]/15">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.lineId, -1)}
                            aria-label={`Decrease quantity for ${item.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center text-[#18222D] hover:bg-[#F5F7F8] cursor-pointer"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center font-mono text-xs font-semibold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.lineId, 1)}
                            aria-label={`Increase quantity for ${item.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center text-[#18222D] hover:bg-[#F5F7F8] cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <span className="font-mono text-sm font-semibold tabular-nums text-[#18222D]">
                          {formatUsd(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Complete Your Matchday Kit Quick Upsells */}
              {upsells.length > 0 && (
                <div className="mt-4 border-t border-[#18222D]/10 pt-4">
                  <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#56616A]">
                    Complete Your Match Bag
                  </p>
                  <div className="mt-2.5 space-y-2">
                    {upsells.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-lg border border-[#18222D]/10 bg-[#F5F7F8] p-2"
                      >
                        <ProductMedia
                          product={item}
                          className="h-11 w-12 shrink-0 rounded bg-[#E5EBF0]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-[#18222D]">
                            {item.shortName}
                          </p>
                          <p className="font-mono text-[11px] font-semibold text-[#56616A]">
                            {formatUsd(item.price)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addToCart(item, item.sizes[0], 1, undefined, false)}
                          className="h-8 rounded border border-[#18222D] bg-white px-2.5 text-[11px] font-semibold text-[#18222D] hover:bg-[#18222D] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Totals & Promo */}
        {cart.length > 0 && (
          <div className="border-t border-[#18222D]/10 bg-[#F5F7F8] px-6 py-4 space-y-3.5">
            <form onSubmit={handleApplyPromo} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#56616A]" />
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Promo code (try CASTLE10)"
                  aria-label="Promo code"
                  className="h-10 w-full rounded-md border border-[#18222D]/15 bg-white pl-8 pr-3 font-mono text-xs uppercase text-[#18222D] placeholder:normal-case placeholder:font-sans focus:border-[#18222D] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="h-10 rounded-md border border-[#18222D] px-4 text-xs font-semibold text-[#18222D] hover:bg-[#18222D] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                Apply
              </button>
            </form>

            {totals.promoMessage && (
              <p
                className={`text-xs font-medium ${
                  totals.promoValid ? 'text-[#032EA1]' : 'text-[#D81E2B]'
                }`}
              >
                {totals.promoMessage}
              </p>
            )}

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#56616A]">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums text-[#18222D]">
                  {formatUsd(totals.subtotal)}
                </span>
              </div>

              {totals.teamDiscount > 0 && (
                <div className="flex justify-between text-[#032EA1]">
                  <span>Squad Bulk Discount (5+ Kits · 10%)</span>
                  <span className="font-mono tabular-nums">
                    -{formatUsd(totals.teamDiscount)}
                  </span>
                </div>
              )}

              {totals.promoDiscount > 0 && (
                <div className="flex justify-between text-[#032EA1]">
                  <span>Promo ({promoCode})</span>
                  <span className="font-mono tabular-nums">
                    -{formatUsd(totals.promoDiscount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-[#56616A]">
                <span>Phnom Penh Express</span>
                <span className="font-mono tabular-nums text-[#18222D]">
                  {totals.shippingFee === 0 ? 'FREE' : formatUsd(totals.shippingFee)}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-t border-[#18222D]/10 pt-2.5">
                <span className="font-semibold text-[#18222D]">Estimated Total</span>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold tabular-nums text-[#18222D]">
                    {formatUsd(totals.totalUsd)}
                  </div>
                  <div className="font-mono text-[11px] tabular-nums text-[#56616A]">
                    ≈ {formatKhr(totals.totalUsd)} (1 USD = 4,100 KHR)
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate({ page: 'cart' });
                }}
                className="flex h-12 items-center justify-center border border-[#0E1113] bg-[#FDFCF9] font-mono text-[11px] font-bold tracking-[0.12em] text-[#0E1113] uppercase hover:bg-[#EAE7DF] transition-colors cursor-pointer sm:col-span-2"
              >
                Full Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate({ page: 'checkout' });
                }}
                className="flex h-12 items-center justify-center gap-2 bg-[#0E1113] font-mono text-xs font-bold tracking-[0.14em] text-[#FDFCF9] uppercase hover:bg-[#C8232C] transition-colors cursor-pointer sm:col-span-3"
              >
                <span>Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
