import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../../app/routes';
import { configureApi } from '../../../lib/api';
import { adminBase } from '../../../test/admin';
import { API, server, setupMsw } from '../../../test/msw';
import { renderRoutes } from '../../../test/render';

setupMsw();

beforeAll(() => {
  // Recharts measures its container.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const NOTE = { id: 12, channel: 'telegram', recipient: 'ops', template: 'payment_received', status: 'failed', attempts: 3, lastError: 'chat not found', createdAt: '2026-11-26T08:00:00Z', sentAt: null, nextAttemptAt: null };
const HOOK = { id: 5, provider: 'payway', eventId: 'e5', signatureValid: false, processingStatus: 'rejected', tranId: 'T-9', error: 'bad signature', receivedAt: '2026-11-26T08:00:00Z', processedAt: null };
let auth: (string | null)[] = [];
let tests: unknown[] = [];

beforeEach(() => {
  auth = [];
  tests = [];
  configureApi({ baseUrl: API });
  server.use(
    ...adminBase('admin'),
    http.get(`${API}/v1/admin/notifications`, () => HttpResponse.json({ notifications: [NOTE], total: 1 })),
    http.get(`${API}/v1/admin/payments/webhooks`, () => HttpResponse.json({ events: [HOOK], total: 1 })),
    http.post(`${API}/v1/admin/notifications/test`, async ({ request }) => {
      tests.push(await request.json());
      return HttpResponse.json({ sent: false, error: 'not configured' });
    }),
    http.get(`${API}/v1/admin/system-health`, ({ request }) => {
      auth.push(request.headers.get('authorization'));
      return HttpResponse.json({ error: { code: 'internal', message: 'Health is down for the test' } }, { status: 500 });
    }),
    http.get(`${API}/v1/admin/system-health/metrics`, () => HttpResponse.json({ error: { code: 'internal', message: 'x' } }, { status: 500 })),
  );
});

describe('admin logs and health', () => {
  it('lists failed messages and payment callbacks', async () => {
    renderRoutes(routes, '/admin/logs', { signedIn: true });
    const messages = await screen.findByRole('region', { name: 'Messages' });
    expect(await within(messages).findByText('chat not found')).toBeTruthy();
    const hooks = screen.getByRole('region', { name: 'Payment callbacks' });
    expect(await within(hooks).findByText('bad signature')).toBeTruthy();
  });

  it('sends a test message and shows the answer', async () => {
    renderRoutes(routes, '/admin/logs', { signedIn: true });
    fireEvent.click(await screen.findByRole('button', { name: 'Send a test Telegram message' }));
    expect(await screen.findByText('Not sent: not configured')).toBeTruthy();
    expect(tests).toEqual([{ channel: 'telegram' }]);
  });

  it('asks the health endpoint as the signed-in admin', async () => {
    renderRoutes(routes, '/admin/health', { signedIn: true });
    expect(await screen.findByRole('heading', { level: 1, name: 'System health' })).toBeTruthy();
    await waitFor(() => expect(auth[0]).toMatch(/^Bearer test:/));
  });
});
