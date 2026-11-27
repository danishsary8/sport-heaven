import { Suspense } from 'react';
import { PageFallback } from '../PageFallback';
import { ChevronLeft, Lock } from 'lucide-react';
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { CheckoutSteps } from '../../features/checkout/CheckoutSteps';
import { useI18n } from '../../lib/i18n';
import { Wordmark } from '../../features/shell/Wordmark';

/** Checkout and payment: no shop navigation, only the logo and a way back to the bag. */
export function CheckoutLayout() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const step = pathname.startsWith('/pay') ? 2 : 1;
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-stone bg-paper">
        <div className="mx-auto grid h-16 max-w-[1180px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 lg:px-8">
          <Link to="/bag" className="inline-flex items-center gap-1 justify-self-start text-[14px] font-semibold text-graphite hover:text-obsidian hover:underline">
            <ChevronLeft className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t('checkout.backToBag')}</span>
            <span className="sr-only sm:hidden">{t('checkout.backToBag')}</span>
          </Link>
          <Wordmark />
          <p className="inline-flex items-center gap-1.5 justify-self-end text-[13px] font-semibold text-success">
            <Lock className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">{t('steps.secure')}</span>
          </p>
        </div>
        <div className="flag-rule h-[3px]" aria-hidden />
        <div className="mx-auto flex max-w-[1180px] justify-center px-4 py-3">
          <CheckoutSteps current={step} />
        </div>
      </header>
      <main id="main" className="flex-1">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <ScrollRestoration />
    </div>
  );
}
