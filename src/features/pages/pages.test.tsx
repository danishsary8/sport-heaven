import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app/routes';
import { configureApi } from '../../lib/api';
import { BRANCHES, MENU } from '../../test/fixtures';
import { API, server, setupMsw } from '../../test/msw';
import { renderRoutes } from '../../test/render';

setupMsw();

beforeEach(() => {
  configureApi({ baseUrl: API });
  server.use(
    http.get(`${API}/v1/catalog/menu`, () => HttpResponse.json(MENU)),
    http.get(`${API}/v1/branches`, () => HttpResponse.json(BRANCHES)),
    http.get(`${API}/v1/cart`, () => HttpResponse.json({ cart: { lines: [] } })),
  );
});

describe('stores and help', () => {
  it('lists each store with hours, phone and a Google Maps link', async () => {
    renderRoutes(routes, '/stores');
    expect(await screen.findByRole('heading', { level: 1, name: 'Our stores' })).toBeTruthy();
    const store = (await screen.findByRole('heading', { level: 2, name: 'Sport Castle Sen Sok' })).closest('article')!;
    expect(within(store).getByRole('link', { name: /012 000 001/ })).toHaveAttribute('href', 'tel:012000001');
    expect(within(store).getByRole('link', { name: 'Open Sport Castle Sen Sok in Google Maps' }).getAttribute('href')).toContain('11.58');
  });

  it('shows the help topics and the returns rules', async () => {
    renderRoutes(routes, '/help');
    expect(await screen.findByRole('heading', { level: 1, name: 'Help' })).toBeTruthy();
    within(screen.getByRole('main')).getByRole('link', { name: /^Returns and exchanges/ }).click();
    expect(await screen.findByRole('heading', { level: 1, name: 'Returns and exchanges' })).toBeTruthy();
    expect(screen.getAllByText(/30 days/).length).toBeGreaterThan(0);
  });

  it('marks the terms as a draft waiting for review', async () => {
    renderRoutes(routes, '/help/terms');
    expect(await screen.findByText(/Draft: waiting for the owner's review/)).toBeTruthy();
  });

  it('sends unknown help topics to the 404 page', async () => {
    renderRoutes(routes, '/help/nope');
    expect(await screen.findByRole('heading', { name: "This page doesn't exist" })).toBeTruthy();
  });
});
