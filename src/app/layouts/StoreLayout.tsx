import { Suspense, lazy } from 'react';
import { PageFallback } from '../PageFallback';
import { Outlet, ScrollRestoration } from 'react-router';
import { Header } from '../../features/shell/Header';

// The footer sits below every page, so it loads after the first screen instead of with it.
const Footer = lazy(() => import('../../features/shell/Footer').then((m) => ({ default: m.Footer })));

export function StoreLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="min-h-dvh flex-1">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
      <ScrollRestoration />
    </div>
  );
}
