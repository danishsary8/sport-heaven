import { Suspense } from 'react';
import { PageFallback } from '../PageFallback';
import { Outlet, ScrollRestoration } from 'react-router';
import { Footer } from '../../features/shell/Footer';
import { Header } from '../../features/shell/Header';

export function StoreLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="flex-1">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
