import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API, server, setupMsw } from '../../test/msw';
import { ApiError, apiFetch, configureApi } from './index';

setupMsw();

let token: string | null = null;
const getToken = vi.fn(async (force?: boolean): Promise<string | null> => (force ? token : token));
const onUnauthorized = vi.fn();
let lang: 'en' | 'km' = 'en';

beforeEach(() => {
  token = null;
  lang = 'en';
  getToken.mockClear();
  onUnauthorized.mockClear();
  configureApi({ baseUrl: API, getToken, onUnauthorized, lang: () => lang });
});

describe('apiFetch', () => {
  it('sends cookies, and a bearer token only when signed in', async () => {
    const seen: Array<{ credentials: string; auth: string | null }> = [];
    server.use(
      http.get(`${API}/v1/me`, ({ request }) => {
        seen.push({ credentials: request.credentials, auth: request.headers.get('authorization') });
        return HttpResponse.json({ ok: true });
      }),
    );
    await apiFetch('/v1/me');
    token = 't1';
    await apiFetch('/v1/me');
    expect(seen).toEqual([
      { credentials: 'include', auth: null },
      { credentials: 'include', auth: 'Bearer t1' },
    ]);
  });

  it('repeats array params, drops undefined and adds lang on request', async () => {
    let url = '';
    server.use(
      http.get(`${API}/v1/catalog/products`, ({ request }) => {
        url = request.url;
        return HttpResponse.json({});
      }),
    );
    lang = 'km';
    await apiFetch('/v1/catalog/products', {
      query: { brand: ['a', 'b'], q: undefined, page: 2, sale: true },
      withLang: true,
    });
    const params = new URL(url).searchParams;
    expect(params.getAll('brand')).toEqual(['a', 'b']);
    expect(params.has('q')).toBe(false);
    expect(params.get('page')).toBe('2');
    expect(params.get('sale')).toBe('true');
    expect(params.get('lang')).toBe('km');
  });

  it('sends JSON bodies', async () => {
    let body: unknown;
    let type: string | null = null;
    server.use(
      http.post(`${API}/v1/cart/items`, async ({ request }) => {
        type = request.headers.get('content-type');
        body = await request.json();
        return HttpResponse.json({ ok: 1 }, { status: 201 });
      }),
    );
    await expect(apiFetch('/v1/cart/items', { method: 'POST', body: { qty: 2 } })).resolves.toEqual({ ok: 1 });
    expect(type).toContain('application/json');
    expect(body).toEqual({ qty: 2 });
  });

  it('maps API errors with code, status, message and details', async () => {
    server.use(
      http.post(`${API}/v1/cart/items`, () =>
        HttpResponse.json(
          { error: { code: 'insufficient_stock', message: 'Only 2 available', details: { available: 2 } } },
          { status: 409 },
        ),
      ),
    );
    const err = await apiFetch('/v1/cart/items', { method: 'POST', body: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'insufficient_stock', status: 409, message: 'Only 2 available', details: { available: 2 } });
  });

  it('maps a non-JSON server failure to a network error', async () => {
    server.use(http.get(`${API}/v1/me`, () => new HttpResponse('<html>Bad gateway</html>', { status: 502 })));
    await expect(apiFetch('/v1/me')).rejects.toMatchObject({
      code: 'network',
      status: 502,
      message: 'The shop is having trouble reaching the server. Try again.',
    });
  });

  it('maps a failed connection to offline', async () => {
    server.use(http.get(`${API}/v1/me`, () => HttpResponse.error()));
    await expect(apiFetch('/v1/me')).rejects.toMatchObject({ code: 'offline', status: 0 });
  });

  it('refreshes the token once on 401, retries, then signs out on a second 401', async () => {
    token = 'old';
    const auths: Array<string | null> = [];
    server.use(
      http.get(`${API}/v1/me`, ({ request }) => {
        auths.push(request.headers.get('authorization'));
        return HttpResponse.json({ error: { code: 'unauthenticated', message: 'Sign in again' } }, { status: 401 });
      }),
    );
    getToken.mockImplementation(async (force?: boolean) => (force ? 'fresh' : token));
    await expect(apiFetch('/v1/me')).rejects.toMatchObject({ code: 'unauthenticated', status: 401 });
    expect(auths).toEqual(['Bearer old', 'Bearer fresh']);
    expect(getToken).toHaveBeenCalledWith(true);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('succeeds after a refresh without signing out', async () => {
    token = 'old';
    getToken.mockImplementation(async (force?: boolean) => (force ? 'fresh' : token));
    server.use(
      http.get(`${API}/v1/me`, ({ request }) =>
        request.headers.get('authorization') === 'Bearer fresh'
          ? HttpResponse.json({ id: 'u1' })
          : HttpResponse.json({ error: { code: 'unauthenticated', message: 'x' } }, { status: 401 }),
      ),
    );
    await expect(apiFetch('/v1/me')).resolves.toEqual({ id: 'u1' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not refresh or sign out a guest on 401', async () => {
    server.use(
      http.get(`${API}/v1/me`, () => HttpResponse.json({ error: { code: 'unauthenticated', message: 'x' } }, { status: 401 })),
    );
    await expect(apiFetch('/v1/me')).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('returns undefined for 204', async () => {
    server.use(http.delete(`${API}/v1/cart/items/x`, () => new HttpResponse(null, { status: 204 })));
    await expect(apiFetch('/v1/cart/items/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});

describe('text bodies', () => {
  it('sends a CSV body as text and reads a text response', async () => {
    let seen: { type: string | null; body: string } | null = null;
    server.use(
      http.post(`${API}/v1/csv`, async ({ request }) => {
        seen = { type: request.headers.get('content-type'), body: await request.text() };
        return HttpResponse.json({ ok: true });
      }),
      http.get(`${API}/v1/csv`, () => new HttpResponse('a,b\n1,2', { headers: { 'content-type': 'text/csv' } })),
    );
    configureApi({ baseUrl: API, getToken: async () => null });
    await apiFetch('/v1/csv', { method: 'POST', text: 'sku,price\nA,1', headers: { 'content-type': 'text/csv' } });
    expect(seen).toEqual({ type: 'text/csv', body: 'sku,price\nA,1' });
    expect(await apiFetch<string>('/v1/csv', { as: 'text' })).toBe('a,b\n1,2');
  });
});
