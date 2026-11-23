import { useEffect } from 'react';
import {
  Bell,
  BellOff,
  Heart,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react';
import { useStore, useWishlistStore } from '../../context/StoreContext';
import { formatUsd } from '../../utils/commerce';
import { ProductMedia } from '../product/ProductMedia';

export function WishlistDrawer() {
  const {
    getProductById,
    isWishlistOpen,
    setWishlistOpen,
    addToCart,
    navigate,
    wishlistAlerts,
  } = useStore();
  const wishlistStore = useWishlistStore();

  useEffect(() => {
    if (!isWishlistOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setWishlistOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isWishlistOpen, setWishlistOpen]);

  if (!isWishlistOpen) return null;

  const savedProducts = wishlistStore.items
    .map((id) => getProductById(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Saved Gear Wishlist"
    >
      <div
        className="fixed inset-0 bg-[#0E1113]/45 backdrop-blur-[2px]"
        onClick={() => setWishlistOpen(false)}
      />

      <div className="animate-drawer-in relative z-10 flex h-full w-full max-w-md flex-col bg-[#FDFCF9] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#0E1113]/15 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Heart className="h-5 w-5 text-[#0E1113]" strokeWidth={1.7} />
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-tight text-[#0E1113] uppercase">
                Saved Gear ({savedProducts.length})
              </h2>
              {wishlistStore.isGuestSession && (
                <p className="font-mono text-[10px] text-[#5A5D57]">
                  Saved on this browser for your next visit
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {savedProducts.length > 0 && (
              <button
                type="button"
                onClick={() => wishlistStore.clear()}
                className="px-2 py-1 font-mono text-[10px] font-bold tracking-[0.12em] text-[#5A5D57] uppercase hover:text-[#C8232C] cursor-pointer"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={() => setWishlistOpen(false)}
              aria-label="Close wishlist"
              className="inline-flex h-9 w-9 items-center justify-center border border-transparent text-[#5A5D57] hover:border-[#0E1113]/15 hover:bg-[#F4F2EC] hover:text-[#0E1113] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Restock & Price-Drop Alert Bar */}
        {savedProducts.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-b border-[#0E1113]/15 bg-[#F4F2EC] px-6 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 shrink-0 text-[#B8933B]" aria-hidden="true" />
              <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#0E1113] uppercase">
                {wishlistAlerts.activeAlertCount} of {savedProducts.length} Alerted
              </span>
            </div>
            <button
              type="button"
              onClick={() => wishlistAlerts.checkForUpdates()}
              className="inline-flex items-center gap-1.5 border border-[#0E1113] bg-[#FDFCF9] px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.12em] text-[#0E1113] uppercase transition hover:bg-[#0E1113] hover:text-[#FDFCF9] cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              <span>Check Stock &amp; Drops</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {savedProducts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <Heart className="h-10 w-10 text-[#5A5D57]/50" strokeWidth={1.4} />
              <p className="mt-4 font-display text-xl font-extrabold text-[#0E1113] uppercase">
                No saved gear yet
              </p>
              <p className="mt-1 max-w-xs text-xs text-[#5A5D57]">
                Tap the heart icon on any boot, jersey, or F1 kit to receive instant restock &amp; price-drop alerts.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#0E1113]/10">
              {savedProducts.map((product) => {
                const alertOn = wishlistAlerts.isAlertEnabled(product.id);
                const latestEvent = wishlistAlerts.getLatestEventForProduct(product.id);
                const hasMarkdown =
                  typeof product.originalPrice === 'number' &&
                  product.originalPrice > product.price;

                return (
                  <li key={product.id} className="flex gap-4 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        setWishlistOpen(false);
                        navigate({ page: 'product', slug: product.slug }, product.slug);
                      }}
                      className="h-20 w-20 shrink-0 overflow-hidden border border-[#0E1113]/10 bg-[#EAE7DF] p-1 cursor-pointer"
                      aria-label={`View ${product.name}`}
                    >
                      <ProductMedia product={product} className="h-full w-full" />
                    </button>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setWishlistOpen(false);
                            navigate({ page: 'product', slug: product.slug }, product.slug);
                          }}
                          className="text-left font-display text-base font-extrabold leading-tight text-[#0E1113] uppercase hover:text-[#C8232C] cursor-pointer"
                        >
                          {product.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => wishlistStore.remove(product.id)}
                          aria-label={`Remove ${product.shortName} from wishlist`}
                          className="p-1 text-[#5A5D57] hover:text-[#C8232C] cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-0.5 font-mono text-[10px] text-[#5A5D57] uppercase">
                        {product.brand} · {product.colorway}
                      </p>

                      {latestEvent && (
                        <div className="mt-1.5">
                          <span
                            className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.12em] uppercase ${
                              latestEvent.type === 'price-drop'
                                ? 'border-[#B8933B]/45 bg-[#B8933B]/15 text-[#7A5B14]'
                                : 'border-emerald-800/30 bg-emerald-900/10 text-emerald-900'
                            }`}
                          >
                            {latestEvent.type === 'price-drop' ? (
                              <TrendingDown className="h-2.5 w-2.5" aria-hidden="true" />
                            ) : (
                              <PackageCheck className="h-2.5 w-2.5" aria-hidden="true" />
                            )}
                            <span>{latestEvent.title}</span>
                          </span>
                        </div>
                      )}

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono text-sm font-bold tabular-nums text-[#0E1113]">
                            {formatUsd(product.price)}
                          </span>
                          {hasMarkdown && (
                            <span className="font-mono text-[11px] text-[#5A5D57] line-through tabular-nums">
                              {formatUsd(product.originalPrice!)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => wishlistAlerts.toggleItemAlert(product.id)}
                            aria-pressed={alertOn}
                            aria-label={
                              alertOn
                                ? `Disable price and restock alerts for ${product.shortName}`
                                : `Enable price and restock alerts for ${product.shortName}`
                            }
                            className={`inline-flex h-8 items-center gap-1 border px-2.5 font-mono text-[10px] font-bold uppercase transition cursor-pointer ${
                              alertOn
                                ? 'border-[#B8933B] bg-[#B8933B]/15 text-[#0E1113]'
                                : 'border-[#0E1113]/15 bg-[#FDFCF9] text-[#5A5D57] hover:border-[#0E1113] hover:text-[#0E1113]'
                            }`}
                          >
                            {alertOn ? (
                              <Bell className="h-3 w-3 text-[#B8933B]" aria-hidden="true" />
                            ) : (
                              <BellOff className="h-3 w-3" aria-hidden="true" />
                            )}
                            <span>{alertOn ? 'Alerts On' : 'Muted'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const defaultSize =
                                product.sizes[Math.min(2, product.sizes.length - 1)] ??
                                product.sizes[0];
                              addToCart(product, defaultSize, 1, undefined, true);
                              setWishlistOpen(false);
                            }}
                            className="inline-flex h-8 items-center gap-1.5 bg-[#0E1113] px-3 font-mono text-[10px] font-bold tracking-[0.1em] text-[#FDFCF9] uppercase transition hover:bg-[#C8232C] cursor-pointer whitespace-nowrap"
                          >
                            <ShoppingBag className="h-3 w-3" aria-hidden="true" />
                            <span>Add to Bag</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
