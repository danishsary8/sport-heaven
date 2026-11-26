import { useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { isApiError } from '../../../lib/api';
import { formatUsd } from '../../../lib/i18n';
import { Button, EmptyState, Field, QueryView, Select, Sheet, Skeleton, TextArea, useToast } from '../../../ui';
import { useBranches } from '../../catalog/api';
import { OrderItems, OrderTotals } from '../../orders/OrderParts';
import { useIsAdmin } from '../AdminLayout';
import { post, useAdminMutation, useAdminQuery } from '../api';
import type { AdminOrderDetail, AdminOrderList, OrderStatus } from '../types';
import { AdminPage, Pager, Pill, dateTime, human, methodName } from '../ui';

const STATUSES: OrderStatus[] = ['pending_payment', 'awaiting_pickup_payment', 'confirmed', 'printing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'expired'];

/** Mirrors the backend status machine (orders/statusMachine.ts); the server still checks every change. */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['confirmed', 'printing'],
  awaiting_pickup_payment: ['ready_for_pickup'],
  confirmed: ['printing', 'ready_for_pickup', 'out_for_delivery'],
  printing: ['ready_for_pickup', 'out_for_delivery'],
  ready_for_pickup: ['completed'],
  out_for_delivery: ['delivered'],
  delivered: ['completed'],
  expired: ['confirmed', 'printing'],
  completed: [],
  cancelled: [],
};
const CANCELLABLE: OrderStatus[] = ['pending_payment', 'awaiting_pickup_payment', 'confirmed', 'printing', 'ready_for_pickup'];

export function statusTone(s: OrderStatus): 'neutral' | 'good' | 'warn' | 'bad' | 'info' {
  if (s === 'cancelled' || s === 'expired') return 'neutral';
  if (s === 'pending_payment' || s === 'awaiting_pickup_payment') return 'warn';
  if (s === 'delivered' || s === 'completed') return 'good';
  return 'info';
}

export function AdminOrdersPage() {
  const admin = useIsAdmin();
  const branches = useBranches();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const query = {
    q: params.get('q') ?? undefined,
    status: params.get('status') ?? undefined,
    branch: params.get('branch') ?? undefined,
    needsRefund: params.get('needsRefund') ?? undefined,
    page: Number(params.get('page') ?? 1),
  };
  const list = useAdminQuery<AdminOrderList>(['orders'], '/v1/admin/orders', query);
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    next.delete('page');
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };
  return (
    <AdminPage title="Orders">
      <div className="flex flex-wrap items-end gap-3">
        <form
          role="search"
          className="flex min-w-[220px] flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setParam('q', q.trim());
          }}
        >
          <Field label="Search orders" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order number, phone or name" className="flex-1" />
          <Button type="submit" variant="primary" className="self-end">
            Search
          </Button>
        </form>
        <Select label="Status" value={params.get('status') ?? ''} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {human(s)}
            </option>
          ))}
        </Select>
        {admin && (
          <Select label="Store" value={params.get('branch') ?? ''} onChange={(e) => setParam('branch', e.target.value)}>
            <option value="">All stores</option>
            {(branches.data?.branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.shortName}
              </option>
            ))}
          </Select>
        )}
        <label className="flex h-11 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="size-5 accent-obsidian" checked={params.get('needsRefund') === 'true'} onChange={(e) => setParam('needsRefund', e.target.checked ? 'true' : '')} />
          Needs a refund
        </label>
      </div>
      <QueryView query={list} skeleton={<Skeleton className="h-64 w-full" />} isEmpty={(d) => d.orders.length === 0} empty={<EmptyState title="No orders match" />}>
        {(d) => (
          <>
            <ul className="divide-y divide-stone rounded-[8px] border border-stone">
              {d.orders.map((o) => (
                <li key={o.number}>
                  <Link to={`/admin/orders/${o.number}`} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 p-3 hover:bg-chalk sm:grid-cols-[180px_1fr_auto_auto] sm:items-center">
                    <span className="font-semibold tabular">{o.number}</span>
                    <span className="text-right sm:order-4">
                      <Pill tone={statusTone(o.status)}>{human(o.status)}</Pill>
                    </span>
                    <span className="text-sm text-graphite sm:text-[15px] sm:text-obsidian">
                      {o.contactName}, {o.fulfillment === 'pickup' ? 'pickup' : 'delivery'}, {o.branches.join(', ') || 'no store yet'}
                    </span>
                    <span className="text-right text-sm tabular sm:order-3 sm:text-[15px]">
                      {formatUsd(o.totalCents)} <span className="text-graphite">{dateTime(o.createdAt)}</span>
                      {o.needsRefund && (
                        <>
                          {' '}
                          <Pill tone="bad">Refund</Pill>
                        </>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Pager page={d.page} pageSize={d.pageSize} total={d.total} onPage={(p) => setParam('page', String(p))} />
          </>
        )}
      </QueryView>
    </AdminPage>
  );
}

export function AdminOrderPage() {
  const { number = '' } = useParams();
  const detail = useAdminQuery<AdminOrderDetail>(['order', number], `/v1/admin/orders/${encodeURIComponent(number)}`);
  return (
    <QueryView query={detail} skeleton={<Skeleton className="h-96 w-full" />}>
      {(d) => <OrderDetail d={d} />}
    </QueryView>
  );
}

function OrderDetail({ d }: { d: AdminOrderDetail }) {
  const toast = useToast();
  const o = d.order;
  const base = `/v1/admin/orders/${encodeURIComponent(o.number)}`;
  const invalidate = [['order', o.number], ['orders'], ['overview']];
  const act = useAdminMutation(({ path, body }: { path: string; body?: unknown }) => post<AdminOrderDetail>(`${base}/${path}`, body), invalidate);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [note, setNote] = useState('');
  const run = (path: string, body: unknown, done?: string) =>
    act.mutate({ path, body }, { onSuccess: () => done && toast.success(done), onError: (e) => toast.error(isApiError(e) ? e.message : 'Something went wrong.') });
  const cashDue = o.paymentMethod === 'cash_on_pickup' && o.paymentStatus === 'unpaid' && !['cancelled', 'expired', 'completed'].includes(o.status);

  return (
    <AdminPage
      title={`Order ${o.number}`}
      actions={
        <Link to="/admin/orders" className="font-semibold underline underline-offset-4">
          All orders
        </Link>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={statusTone(o.status)}>{human(o.status)}</Pill>
        <Pill tone={o.paymentStatus === 'paid' ? 'good' : 'warn'}>{human(o.paymentStatus)}</Pill>
        <Pill>{methodName(o.paymentMethod)}</Pill>
        {d.needsRefund && <Pill tone="bad">Needs a refund</Pill>}
      </div>

      <section aria-label="Actions" className="flex flex-wrap gap-2">
        {cashDue && (
          <Button variant="buy" loading={act.isPending} onClick={() => run('collect-cash', {}, 'Cash recorded')}>
            Take cash {formatUsd(o.pricing.totalCents)}
          </Button>
        )}
        {NEXT[o.status]
          .filter((to) => !(cashDue && to === 'completed'))
          .map((to) => (
            <Button key={to} variant="primary" loading={act.isPending && act.variables?.path === 'status'} onClick={() => run('status', { to }, `Marked ${human(to).toLowerCase()}`)}>
              Mark {human(to).toLowerCase()}
            </Button>
          ))}
        {d.needsRefund && (
          <Button variant="secondary" onClick={() => run('refunded', {}, 'Marked refunded')}>
            Mark refunded
          </Button>
        )}
        {CANCELLABLE.includes(o.status) && (
          <Button variant="secondary" onClick={() => setCancelOpen(true)}>
            Cancel order
          </Button>
        )}
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="pick" className="rounded-[8px] border border-cobalt/30 p-4">
            <h2 id="pick" className="mb-2 font-semibold text-cobalt">
              Pick list
            </h2>
            {Object.keys(d.pickList).length === 0 ? (
              <p className="text-sm text-graphite">Nothing allocated to a store yet.</p>
            ) : (
              Object.entries(d.pickList).map(([branch, lines]) => (
                <div key={branch} className="mb-3 last:mb-0">
                  <p className="text-sm font-semibold capitalize">{branch}</p>
                  <table className="mt-1 w-full text-left text-sm">
                    <tbody>
                      {lines.map((l) => (
                        <tr key={l.sku} className="border-t border-stone">
                          <td className="py-1.5 pr-2 font-mono text-xs">{l.sku}</td>
                          <td className="py-1.5 pr-2">
                            {l.name}, size {l.size}
                            {l.customPrint && <span className="block text-graphite">Print {l.customPrint.name} {l.customPrint.number}</span>}
                          </td>
                          <td className="py-1.5 text-right tabular font-semibold">× {l.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </section>
          <OrderItems items={o.items} />
          <OrderTotals pricing={o.pricing} />
        </div>
        <aside className="flex flex-col gap-6 text-[15px]">
          <section>
            <h2 className="font-semibold">Customer</h2>
            <p>{o.contact?.name}</p>
            {o.contact?.phoneE164 && (
              <a href={`tel:${o.contact.phoneE164}`} className="tabular underline underline-offset-4">
                {o.contact.phoneE164}
              </a>
            )}
            <p className="text-graphite">Prefers {o.contact?.channel}</p>
            {o.note && <p className="mt-2 rounded bg-stone px-2 py-1">Customer note: {o.note}</p>}
          </section>
          <section>
            <h2 className="font-semibold">{o.fulfillment === 'pickup' ? 'Pickup' : 'Delivery'}</h2>
            {o.fulfillment === 'pickup' ? (
              <p>{o.pickupBranch?.name}</p>
            ) : o.shipAddress ? (
              <p>
                {o.shipAddress.recipientName}, <span className="tabular">{o.shipAddress.phoneE164}</span>
                <br />
                {o.shipAddress.street}
                {o.shipAddress.landmark && <>, {o.shipAddress.landmark}</>}
                <br />
                {[o.shipAddress.communeName?.en, o.shipAddress.districtName?.en, o.shipAddress.provinceName?.en].filter(Boolean).join(', ')}
              </p>
            ) : null}
          </section>
          <section>
            <h2 className="font-semibold">Payments</h2>
            <ul className="text-sm">
              {d.payments.map((p) => (
                <li key={p.attempt} className="flex justify-between gap-2 border-t border-stone py-1.5">
                  <span>
                    {methodName(p.method)}, {p.status}
                    <span className="block font-mono text-xs text-graphite">{p.tranId}</span>
                  </span>
                  <span className="tabular">{formatUsd(p.amountCents)}</span>
                </li>
              ))}
              {d.payments.length === 0 && <li className="text-graphite">No payment attempts.</li>}
            </ul>
          </section>
          <section>
            <h2 className="font-semibold">History</h2>
            <ol className="text-sm">
              {d.events.map((e, i) => (
                <li key={i} className="border-t border-stone py-1.5">
                  <span className="text-graphite">{dateTime(e.at)}</span>{' '}
                  {e.kind === 'status' && e.to ? `${human(e.to)}` : human(e.kind)}
                  {e.actorName ? `, by ${e.actorName}` : e.actor !== 'system' ? `, by ${e.actor}` : ''}
                  {e.note && <span className="block">{e.note}</span>}
                </li>
              ))}
            </ol>
            <form
              className="mt-3 flex flex-col gap-2"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                if (!note.trim()) return;
                act.mutate({ path: 'notes', body: { note: note.trim() } }, { onSuccess: () => setNote('') });
              }}
            >
              <TextArea label="Add a note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="[&_textarea]:min-h-16" />
              <Button type="submit" variant="secondary" size="sm" className="self-start">
                Save note
              </Button>
            </form>
          </section>
        </aside>
      </div>
      <CancelDialog open={cancelOpen} number={o.number} busy={act.isPending} onClose={() => setCancelOpen(false)} onCancel={(reason) => act.mutate({ path: 'cancel', body: { reason } }, { onSuccess: () => (setCancelOpen(false), toast.success('Order cancelled')) })} />
    </AdminPage>
  );
}

function CancelDialog({ open, number, busy, onClose, onCancel }: { open: boolean; number: string; busy: boolean; onClose(): void; onCancel(reason: string): void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet open={open} onClose={onClose} side="center" title={`Cancel order ${number}`}>
      <p className="mb-3 text-[15px]">Held stock goes back on sale. If the order was paid, it is flagged for a refund.</p>
      <Field label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} error={error} maxLength={500} />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="primary"
          loading={busy}
          onClick={() => {
            if (!reason.trim()) return setError('Write why the order is cancelled.');
            setError(null);
            onCancel(reason.trim());
          }}
        >
          Cancel the order
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Keep it
        </Button>
      </div>
    </Sheet>
  );
}

