import { ChevronLeft } from 'lucide-react';
import { Link, Outlet, ScrollRestoration } from 'react-router';
import { Wordmark } from '../../features/shell/Wordmark';

/** Checkout and payment: no shop navigation, only the logo and a way back to the bag. */
export function CheckoutLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-stone">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-4 lg:px-8">
          <Wordmark />
          <Link to="/bag" className="inline-flex items-center gap-1 text-[15px] font-semibold hover:underline">
            <ChevronLeft className="size-4" aria-hidden />
            Back to bag
          </Link>
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}
