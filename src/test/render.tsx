import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { AppProviders } from '../app/providers';
import { createTestAdapter } from '../lib/auth/testAuth';
import type { Lang } from '../lib/i18n';

/**
 * Renders routes inside the real providers with a memory router. With `signedIn`, the test adapter holds a
 * token before the first render, so the app starts a session (the test must answer POST /v1/auth/session).
 */
export function renderRoutes(routes: RouteObject[], url = '/', opts: { signedIn?: boolean; lang?: Lang; state?: unknown; staleTime?: number } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: opts.staleTime ?? 0 } } });
  const router = createMemoryRouter(routes, { initialEntries: [opts.state ? { pathname: url.split('?')[0]!, search: url.includes('?') ? `?${url.split('?')[1]}` : '', state: opts.state } : url] });
  const adapter = createTestAdapter();
  if (opts.signedIn) void adapter.testSignIn!('test:u1:+85512345678:-');
  const utils = render(
    <AppProviders adapter={adapter} queryClient={queryClient} initialLang={opts.lang ?? 'en'}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...utils, router, queryClient, adapter };
}
