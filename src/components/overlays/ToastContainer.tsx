import { useEffect, useState } from 'react';
import { ArrowRight, Check, PackageCheck, TrendingDown, X } from 'lucide-react';
import { useStore, type ToastItem } from '../../context/StoreContext';

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [paused, setPaused] = useState(false);
  const variant = toast.variant ?? 'default';
  const durationMs = toast.durationMs ?? (variant === 'default' ? 3600 : 7000);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => {
      onDismiss(toast.id);
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [toast.id, durationMs, paused, onDismiss]);

  const isPriceDrop = variant === 'price-drop';
  const isBackInStock = variant === 'back-in-stock';
  const isWishlistAlert = isPriceDrop || isBackInStock;

  if (!isWishlistAlert) {
    return (
      <div
        role="status"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="flex items-center gap-3 border border-[#FDFCF9]/15 bg-[#0E1113] px-4 py-3 text-[#FDFCF9] shadow-xl"
      >
        <Check className="h-4 w-4 shrink-0 text-[#B8933B]" aria-hidden="true" />
        <p className="flex-1 text-xs font-medium leading-snug">{toast.message}</p>
        {toast.actionLabel && toast.onAction && (
          <button
            type="button"
            onClick={() => {
              toast.onAction?.();
              onDismiss(toast.id);
            }}
            className="shrink-0 font-mono text-[11px] font-bold tracking-[0.1em] text-[#B8933B] uppercase hover:underline cursor-pointer whitespace-nowrap"
          >
            {toast.actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="shrink-0 text-[#FDFCF9]/60 hover:text-[#FDFCF9] cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      data-toast-variant={variant}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden border border-[#FDFCF9]/15 bg-[#0E1113] text-[#FDFCF9] shadow-2xl"
    >
      {/* Semantic top/left accent rail */}
      <div
        className={`absolute inset-y-0 left-0 w-1 ${
          isPriceDrop ? 'bg-[#B8933B]' : 'bg-emerald-500'
        }`}
        aria-hidden="true"
      />

      <div className="flex items-start gap-3 py-3.5 pr-3.5 pl-4">
        {toast.image && (
          <div className="h-12 w-12 shrink-0 overflow-hidden border border-[#FDFCF9]/15 bg-[#EAE7DF] p-1">
            <img
              src={toast.image}
              alt=""
              className="h-full w-full object-contain"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isPriceDrop ? (
              <TrendingDown
                className="h-3.5 w-3.5 shrink-0 text-[#B8933B]"
                aria-hidden="true"
              />
            ) : (
              <PackageCheck
                className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                aria-hidden="true"
              />
            )}
            <span
              className={`font-mono text-[10px] font-bold tracking-[0.16em] uppercase ${
                isPriceDrop ? 'text-[#B8933B]' : 'text-emerald-400'
              }`}
            >
              {toast.title ?? (isPriceDrop ? 'Price Drop' : 'Back in Stock')}
            </span>
          </div>

          <p className="mt-1 text-xs font-medium leading-snug text-[#FDFCF9]">
            {toast.message}
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {toast.meta && (
              <span className="font-mono text-[10px] tracking-[0.06em] text-[#FDFCF9]/65 tabular-nums">
                {toast.meta}
              </span>
            )}
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  onDismiss(toast.id);
                }}
                className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold tracking-[0.14em] uppercase whitespace-nowrap cursor-pointer transition ${
                  isPriceDrop
                    ? 'text-[#B8933B] hover:text-[#FDFCF9]'
                    : 'text-emerald-400 hover:text-[#FDFCF9]'
                }`}
              >
                <span>{toast.actionLabel}</span>
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="shrink-0 p-0.5 text-[#FDFCF9]/55 transition hover:text-[#FDFCF9] cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismissToast, route } = useStore();

  const isOpsRoute =
    route.page === 'admin' || route.page === 'system-health';
  const visibleToasts = isOpsRoute
    ? toasts.filter(
        (toast) =>
          toast.variant !== 'price-drop' && toast.variant !== 'back-in-stock',
      )
    : toasts;

  if (visibleToasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed right-4 bottom-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5 sm:right-5 sm:bottom-5"
    >
      {visibleToasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
