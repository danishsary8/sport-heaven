import { Cookie, ShieldCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export function CookieConsentBanner() {
  const { cookieConsent, saveCookieConsent, navigate } = useStore();

  if (cookieConsent.decided) return null;

  return (
    <aside
      aria-label="Cookie preferences"
      className="no-print fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-auto z-40 sm:max-w-sm border border-[#0E1113]/15 bg-[#FDFCF9] p-3.5 sm:p-4 shadow-[0_18px_40px_rgba(14,17,19,0.14)] animate-modal-rise"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-[#0E1113]/15 bg-[#EAE7DF] text-[#0E1113]">
          <Cookie className="h-4 w-4" strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5A5D57]">
            Privacy &amp; Storage
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#0E1113]/85">
            We use essential storage for your bag &amp; custom kits, plus optional
            analytics to keep Phnom Penh branch stock accurate.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => saveCookieConsent({ analytics: true, marketing: true })}
              className="inline-flex h-8 items-center gap-1.5 bg-[#0E1113] px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FDFCF9] hover:bg-[#C8232C] transition-colors cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Accept All
            </button>
            <button
              type="button"
              onClick={() => saveCookieConsent({ analytics: false, marketing: false })}
              className="inline-flex h-8 items-center border border-[#0E1113]/20 bg-transparent px-3 text-[11px] font-medium text-[#0E1113] hover:bg-[#EAE7DF] transition-colors cursor-pointer"
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'policy', slug: 'cookie-policy' })}
              className="text-[11px] font-medium text-[#5A5D57] underline underline-offset-4 hover:text-[#0E1113] cursor-pointer"
            >
              Manage
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
