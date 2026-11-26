import { useState, type FormEvent } from 'react';
import { isApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { Button, EmptyState, ErrorState, Field, Select, Sheet, Skeleton, useToast } from '../../../ui';
import { useBranches } from '../../catalog/api';
import { post, useAdminMutation, useAdminQuery } from '../api';
import type { Lookup, LookupVariant, Movement } from '../types';
import { AdminPage, dateTime, human } from '../ui';

interface SaleLine {
  variant: LookupVariant;
  name: string;
  qty: number;
}

/** The counter screen: scanner-friendly search (Enter submits), sizes at my store, sell, adjust, transfer, history. */
export function StockPage() {
  const { user } = useAuth();
  const toast = useToast();
  const branches = useBranches();
  const [branch, setBranch] = useState(user?.staffBranchId ?? '');
  const branchId = branch || branches.data?.branches[0]?.id || '';
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const lookup = useAdminQuery<Lookup>(['stock', 'lookup'], '/v1/admin/stock/lookup', { q, branchId }, { enabled: q.length > 0 && !!branchId });
  const [sale, setSale] = useState<SaleLine[]>([]);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ kind: 'adjust' | 'transfer' | 'history'; v: LookupVariant } | null>(null);
  const record = useAdminMutation((body: unknown) => post('/v1/admin/stock/sale', body), [['stock'], ['overview']]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setQ(text.trim());
  };
  const addToSale = (v: LookupVariant, name: string) =>
    setSale((s) => (s.some((l) => l.variant.id === v.id) ? s.map((l) => (l.variant.id === v.id ? { ...l, qty: l.qty + 1 } : l)) : [...s, { variant: v, name, qty: 1 }]));
  const count = sale.reduce((n, l) => n + l.qty, 0);

  return (
    <AdminPage title="Stock">
      <div className="flex flex-wrap items-end gap-3">
        {user?.role === 'admin' ? (
          <Select label="Store" value={branchId} onChange={(e) => setBranch(e.target.value)}>
            {(branches.data?.branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.shortName}
              </option>
            ))}
          </Select>
        ) : (
          <p className="h-11 content-center text-[15px]">
            Store: <span className="font-semibold capitalize">{branchId}</span>
          </p>
        )}
        <form onSubmit={submit} className="flex min-w-[240px] flex-1 gap-2">
          <Field label="SKU or product name" value={text} onChange={(e) => setText(e.target.value)} autoFocus autoComplete="off" enterKeyHint="search" className="flex-1" />
          <Button type="submit" variant="primary" className="self-end">
            Find
          </Button>
        </form>
      </div>

      {sale.length > 0 && (
        <section aria-labelledby="sale-h" className="rounded-[8px] border-2 border-vermilion/60 p-4">
          <h2 id="sale-h" className="mb-2 font-semibold">
            Sale
          </h2>
          <ul className="flex flex-col gap-2">
            {sale.map((l) => (
              <li key={l.variant.id} className="flex items-center justify-between gap-3 text-[15px]">
                <span className="min-w-0">
                  {l.name}, size {l.variant.size}
                  <span className="block font-mono text-xs text-graphite">{l.variant.sku}</span>
                </span>
                <span className="flex items-center gap-2">
                  <button type="button" aria-label={`One less ${l.variant.size}`} className="size-8 rounded border border-[#C9C5BB]" onClick={() => setSale((s) => s.flatMap((x) => (x.variant.id !== l.variant.id ? [x] : x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : [])))}>
                    −
                  </button>
                  <span className="tabular w-6 text-center font-semibold">{l.qty}</span>
                </span>
              </li>
            ))}
          </ul>
          {saleError && <ErrorState message={saleError} className="mt-3" />}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="buy"
              loading={record.isPending}
              onClick={() => {
                setSaleError(null);
                record.mutate(
                  { branchId, lines: sale.map((l) => ({ variantId: l.variant.id, qty: l.qty })) },
                  {
                    onSuccess: () => {
                      setSale([]);
                      toast.success('Sale recorded');
                    },
                    onError: (e) => setSaleError(isApiError(e) ? e.message : 'Something went wrong.'),
                  },
                );
              }}
            >
              Record sale of {count} {count === 1 ? 'item' : 'items'}
            </Button>
            <Button variant="ghost" onClick={() => setSale([])}>
              Clear
            </Button>
          </div>
        </section>
      )}

      {!q ? (
        <p className="text-graphite">Scan a barcode or type a SKU or product name, then press Enter.</p>
      ) : lookup.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : lookup.isError ? (
        <ErrorState message={isApiError(lookup.error) ? lookup.error.message : undefined} onRetry={() => void lookup.refetch()} />
      ) : lookup.data?.products.length === 0 ? (
        <EmptyState title="Nothing found" body="Check the SKU, or search by part of the product name." />
      ) : (
        lookup.data?.products.map((p) => (
          <section key={p.id} aria-label={p.name} className="rounded-[8px] border border-stone">
            <h2 className="border-b border-stone px-3 py-2 font-semibold">{p.name}</h2>
            <ul className="divide-y divide-stone">
              {p.variants.map((v) => (
                <li key={v.id} aria-label={`${v.size} ${v.color}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
                  <span className="min-w-[96px]">
                    <span className="font-semibold">{v.size}</span>
                    <span className="block font-mono text-xs text-graphite">{v.sku}</span>
                  </span>
                  <span className="flex gap-4 text-[15px]">
                    <span>
                      <span className="tabular font-semibold">{v.onHand}</span> <span className="text-sm text-graphite">on hand</span>
                    </span>
                    <span>
                      <span className="tabular">{v.reserved}</span> <span className="text-sm text-graphite">held</span>
                    </span>
                    <span>
                      <span className="tabular font-semibold">{v.available}</span> <span className="text-sm text-graphite">free</span>
                    </span>
                  </span>
                  <span className="ml-auto flex flex-wrap gap-1.5">
                    <Button size="sm" variant="buy" aria-label={`Sell ${v.size}`} disabled={v.available < 1} onClick={() => addToSale(v, p.name)}>
                      Sell
                    </Button>
                    <Button size="sm" variant="secondary" aria-label={`Adjust ${v.size}`} onClick={() => setDialog({ kind: 'adjust', v })}>
                      Adjust
                    </Button>
                    <Button size="sm" variant="secondary" aria-label={`Transfer ${v.size}`} onClick={() => setDialog({ kind: 'transfer', v })}>
                      Move
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`History ${v.size}`} onClick={() => setDialog({ kind: 'history', v })}>
                      History
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {dialog?.kind === 'adjust' && <AdjustDialog v={dialog.v} branchId={branchId} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'transfer' && <TransferDialog v={dialog.v} branchId={branchId} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'history' && <HistoryDialog v={dialog.v} branchId={branchId} onClose={() => setDialog(null)} />}
    </AdminPage>
  );
}

function AdjustDialog({ v, branchId, onClose }: { v: LookupVariant; branchId: string; onClose(): void }) {
  const toast = useToast();
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const adjust = useAdminMutation((body: unknown) => post('/v1/admin/stock/adjust', body), [['stock'], ['overview']]);
  return (
    <Sheet open onClose={onClose} side="center" title={`Adjust ${v.size}`}>
      <p className="mb-3 text-[15px]">
        {v.sku}: {v.onHand} on hand. A count fixes the number and clears the "needs count" flag.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Change (use minus to remove)" inputMode="numeric" value={delta} onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ''))} />
        <Field label="Reason" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Counted, damaged, found…" />
      </div>
      {error && <ErrorState message={error} className="mt-3" />}
      <Button
        className="mt-4"
        variant="primary"
        loading={adjust.isPending}
        onClick={() => {
          const d = Number(delta);
          if (!Number.isInteger(d) || d === 0) return setError('Enter a whole number that is not zero.');
          if (!note.trim()) return setError('Write the reason.');
          adjust.mutate({ variantId: v.id, branchId, delta: d, note: note.trim() }, { onSuccess: () => (toast.success('Stock adjusted'), onClose()), onError: (e) => setError(isApiError(e) ? e.message : 'Something went wrong.') });
        }}
      >
        Save adjustment
      </Button>
    </Sheet>
  );
}

function TransferDialog({ v, branchId, onClose }: { v: LookupVariant; branchId: string; onClose(): void }) {
  const toast = useToast();
  const branches = useBranches();
  const others = (branches.data?.branches ?? []).filter((b) => b.id !== branchId);
  const [to, setTo] = useState('');
  const [qty, setQty] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const move = useAdminMutation((body: unknown) => post('/v1/admin/stock/transfer', body), [['stock']]);
  return (
    <Sheet open onClose={onClose} side="center" title={`Transfer ${v.size}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="To store" value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">Choose</option>
          {others.map((b) => (
            <option key={b.id} value={b.id}>
              {b.shortName}
            </option>
          ))}
        </Select>
        <Field label="Quantity" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} />
      </div>
      {error && <ErrorState message={error} className="mt-3" />}
      <Button
        className="mt-4"
        variant="primary"
        loading={move.isPending}
        onClick={() => {
          if (!to) return setError('Choose the store.');
          const n = Number(qty);
          if (!n) return setError('Enter how many.');
          move.mutate({ variantId: v.id, from: branchId, to, qty: n }, { onSuccess: () => (toast.success('Transfer recorded'), onClose()), onError: (e) => setError(isApiError(e) ? e.message : 'Something went wrong.') });
        }}
      >
        Transfer
      </Button>
    </Sheet>
  );
}

function HistoryDialog({ v, branchId, onClose }: { v: LookupVariant; branchId: string; onClose(): void }) {
  const moves = useAdminQuery<{ movements: Movement[] }>(['stock', 'movements', v.id], '/v1/admin/stock/movements', { variantId: v.id, branchId, limit: 50 });
  return (
    <Sheet open onClose={onClose} side="right" title={`History of ${v.sku}`}>
      {moves.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ul className="divide-y divide-stone text-[15px]">
          {(moves.data?.movements ?? []).map((m) => (
            <li key={m.id} className="flex justify-between gap-3 py-2">
              <span>
                {human(m.reason)}
                {m.refId && <span className="text-graphite"> {m.refId}</span>}
                {m.note && <span className="block text-sm text-graphite">{m.note}</span>}
                <span className="block text-sm text-graphite">{dateTime(m.createdAt)}</span>
              </span>
              <span className="tabular font-semibold">{m.deltaOnHand > 0 ? `+${m.deltaOnHand}` : m.deltaOnHand}</span>
            </li>
          ))}
          {moves.data?.movements.length === 0 && <li className="py-2 text-graphite">No movements yet.</li>}
        </ul>
      )}
    </Sheet>
  );
}
