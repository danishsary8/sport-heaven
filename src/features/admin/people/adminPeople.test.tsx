import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../../app/routes';
import { configureApi } from '../../../lib/api';
import { adminBase } from '../../../test/admin';
import { API, server, setupMsw } from '../../../test/msw';
import { renderRoutes } from '../../../test/render';

setupMsw();

const USER = { id: '8c65f3f9-85c7-4859-95b0-1d1afb8a0617', phone: '+85512345678', email: null, fullName: 'Dara Sok', role: 'customer', staffBranchId: null, phoneVerified: true, createdAt: '2026-11-01T00:00:00Z' };
const Q = { id: 'b1b1b1b1-1111-4111-8111-111111111111', productSlug: 'predator', productName: 'Predator Elite', authorName: 'Sokha', question: 'Do they run small?', answer: null, status: 'pending', fromMember: false, answeredAt: null, createdAt: '2026-11-25T00:00:00Z' };
const RMA = { number: 'RMA-2611-AAAA', orderNumber: 'SC-2611-AAAAA', resolution: 'refund', status: 'requested', refundCents: 9500, note: 'Box damaged', items: [{ orderItemId: 'i1', name: 'Predator Elite', size: 'EU 41', qty: 1, reason: 'Too small', refundCents: 9500, exchangeSize: null }], createdAt: '2026-11-25T00:00:00Z', decidedAt: null, decisionNote: null };

let calls: { method: string; url: string; body: unknown }[] = [];
let queries: URLSearchParams[] = [];
const rec = (reply: Record<string, unknown> = {}) => async ({ request }: { request: Request }) => {
  calls.push({ method: request.method, url: request.url.replace(API, ''), body: await request.json() });
  return HttpResponse.json(reply);
};

beforeEach(() => {
  calls = [];
  queries = [];
  configureApi({ baseUrl: API });
  server.use(
    ...adminBase('admin'),
    http.get(`${API}/v1/admin/users`, ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json({ users: [USER], total: 1, page: 1, pageSize: 20 });
    }),
    http.patch(`${API}/v1/admin/users/:id/role`, rec({ user: { ...USER, role: 'staff', staffBranchId: 'sensok' } })),
    http.post(`${API}/v1/admin/users/:id/loyalty`, rec({ balance: 150 })),
    http.get(`${API}/v1/admin/questions`, ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json({ questions: [Q], total: 1 });
    }),
    http.patch(`${API}/v1/admin/questions/:id`, rec({ question: { id: Q.id, status: 'published', answer: 'True to size.', answeredAt: '2026-11-26T00:00:00Z' } })),
    http.get(`${API}/v1/admin/returns`, ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json({ returns: [RMA], total: 1, page: 1, pageSize: 25 });
    }),
    http.post(`${API}/v1/admin/returns/:number/decision`, rec({ return: { ...RMA, status: 'approved' } })),
  );
});

describe('admin users', () => {
  it('finds a user and makes them staff at a store', async () => {
    const { router } = renderRoutes(routes, '/admin/users', { signedIn: true });
    fireEvent.change(await screen.findByLabelText('Search users'), { target: { value: '012345678' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(queries.some((q) => q.get('q') === '012345678')).toBe(true));
    expect(router.state.location.search).not.toContain('012345678');
    const row = await screen.findByRole('listitem', { name: /Dara Sok/ });
    fireEvent.change(within(row).getByLabelText('Role'), { target: { value: 'staff' } });
    await within(row).findByRole('option', { name: 'Sen Sok' });
    fireEvent.change(within(row).getByLabelText('Store'), { target: { value: 'sensok' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Save role' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'PATCH', url: `/v1/admin/users/${USER.id}/role`, body: { role: 'staff', staffBranchId: 'sensok' } }));
  });

  it('adjusts points with a note', async () => {
    renderRoutes(routes, '/admin/users', { signedIn: true });
    const row = await screen.findByRole('listitem', { name: /Dara Sok/ });
    fireEvent.change(within(row).getByLabelText('Points to add or remove'), { target: { value: '-50' } });
    fireEvent.change(within(row).getByLabelText('Why'), { target: { value: 'Returned order' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Adjust points' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', url: `/v1/admin/users/${USER.id}/loyalty`, body: { delta: -50, note: 'Returned order' } }));
  });
});

describe('admin questions', () => {
  it('answers and publishes a pending question', async () => {
    renderRoutes(routes, '/admin/questions', { signedIn: true });
    const item = await screen.findByRole('article', { name: /Do they run small/ });
    expect(queries[0]!.get('status')).toBe('pending');
    fireEvent.change(within(item).getByLabelText('Answer'), { target: { value: 'True to size.' } });
    fireEvent.click(within(item).getByRole('button', { name: 'Publish answer' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'PATCH', url: `/v1/admin/questions/${Q.id}`, body: { answer: 'True to size.', status: 'published' } }));
  });

  it('hides a question', async () => {
    renderRoutes(routes, '/admin/questions', { signedIn: true });
    const item = await screen.findByRole('article', { name: /Do they run small/ });
    fireEvent.click(within(item).getByRole('button', { name: 'Hide' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'PATCH', url: `/v1/admin/questions/${Q.id}`, body: { status: 'hidden' } }));
  });
});

describe('admin returns', () => {
  it('approves a return into a store', async () => {
    renderRoutes(routes, '/admin/returns?status=requested', { signedIn: true });
    const item = await screen.findByRole('article', { name: /RMA-2611-AAAA/ });
    expect(within(item).getByText(/Too small/)).toBeTruthy();
    expect(within(item).getByRole('link', { name: 'SC-2611-AAAAA' })).toHaveAttribute('href', '/admin/orders/SC-2611-AAAAA');
    await within(item).findByRole('option', { name: 'Sen Sok' });
    fireEvent.change(within(item).getByLabelText('Restock at'), { target: { value: 'sensok' } });
    fireEvent.click(within(item).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', url: '/v1/admin/returns/RMA-2611-AAAA/decision', body: { decision: 'approve', branchId: 'sensok' } }));
  });

  it('rejects a return with a note for the customer', async () => {
    renderRoutes(routes, '/admin/returns', { signedIn: true });
    const item = await screen.findByRole('article', { name: /RMA-2611-AAAA/ });
    fireEvent.change(within(item).getByLabelText('Note to the customer'), { target: { value: 'Worn on grass' } });
    fireEvent.click(within(item).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', url: '/v1/admin/returns/RMA-2611-AAAA/decision', body: { decision: 'reject', note: 'Worn on grass' } }));
  });
});
