import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { AppProviders } from '../app/providers';
import { createTestAdapter } from '../lib/auth/testAuth';

/** Renders routes inside the real providers with a memory router. */
export function renderRoutes(routes: RouteObject[], url = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  const utils = render(
    <AppProviders adapter={createTestAdapter()} queryClient={queryClient} initialLang="en">
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...utils, router, queryClient };
}
