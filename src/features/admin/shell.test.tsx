import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app/routes';
import { configureApi } from '../../lib/api';
import { adminBase } from '../../test/admin';
import { API, server, setupMsw } from '../../test/msw';
import { renderRoutes } from '../../test/render';

setupMsw();

const OVERVIEW = {
  today: { orders: 6, paidOrders: 5, revenueCents: 153000 },
  pendingPayments: 2,
  needsRefund: 1,
  awaitingFulfilment: { confirmed: 4, printing: 1, readyForPickup: 2, outForDelivery: 0 },
  openReturns: 3,
  pendingQuestions: 2,
  lowStockRows: 12,
  needsCountRows: 40,
  outboxFailed: 0,
  branch: null,
};

beforeEach(() => {
  configureApi({ baseUrl: API });
  server.use(http.get(`${API}/v1/admin/overview`, () => HttpResponse.json(OVERVIEW)));
});

describe('admin shell', () => {
  it('sends guests to sign in', async () => {
    server.use(...adminBase('customer'));
    const { router } = renderRoutes(routes, '/admin');
    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
  });

  it('tells customers the area is for staff', async () => {
    server.use(...adminBase('customer'));
    renderRoutes(routes, '/admin', { signedIn: true });
    expect(await screen.findByRole('heading', { name: 'This area is for staff' })).toBeTruthy();
  });

  it('shows staff the counter tools but not the admin-only screens', async () => {
    server.use(...adminBase('staff'));
    renderRoutes(routes, '/admin', { signedIn: true });
    const nav = await screen.findByRole('navigation', { name: 'Admin' });
    expect(within(nav).getByRole('link', { name: 'Orders' })).toBeTruthy();
    expect(within(nav).getByRole('link', { name: 'Stock' })).toBeTruthy();
    expect(within(nav).queryByRole('link', { name: 'Products' })).toBeNull();
    expect(within(nav).queryByRole('link', { name: 'Users' })).toBeNull();
  });

  it('groups the admin menu by job, and hides groups staff cannot use', async () => {
    server.use(...adminBase('admin'));
    renderRoutes(routes, '/admin', { signedIn: true });
    const nav = await screen.findByRole('navigation', { name: 'Admin' });
    expect(within(nav).getAllByRole('heading').map((h) => h.textContent)).toEqual(['Sell', 'Catalogue', 'Customers', 'Setup']);
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows staff only the groups they use', async () => {
    server.use(...adminBase('staff'));
    renderRoutes(routes, '/admin', { signedIn: true });
    const nav = await screen.findByRole('navigation', { name: 'Admin' });
    expect(within(nav).getAllByRole('heading').map((h) => h.textContent)).toEqual(['Sell', 'Customers']);
  });

  it("shows today's numbers and what is waiting, with links", async () => {
    server.use(...adminBase('admin'));
    renderRoutes(routes, '/admin', { signedIn: true });
    expect(await screen.findByText('$1,530.00')).toBeTruthy();
    expect(screen.getByRole('link', { name: /To pack.*4/ })).toHaveAttribute('href', '/admin/orders?status=confirmed');
    expect(screen.getByRole('link', { name: /Returns to decide.*3/ })).toHaveAttribute('href', '/admin/returns?status=requested');
    const nav = screen.getByRole('navigation', { name: 'Admin' });
    expect(within(nav).getByRole('link', { name: 'Products' })).toBeTruthy();
    expect(within(nav).getByRole('link', { name: 'Logs' })).toBeTruthy();
  });
});
