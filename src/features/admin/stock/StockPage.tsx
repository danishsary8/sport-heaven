import { ArrowLeftRight, ClipboardCheck, History, Minus, Plus, Search, ShoppingBag, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { isApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { Button, EmptyState, ErrorState, Field, Picture, Select, Sheet, Skeleton, cx, useToast } from '../../../ui';
import { useBranches, useMenu } from '../../catalog/api';
import { post, useAdminMutation, useAdminQuery } from '../api';
import type { Movement, StockList, StockSize, StockView } from '../types';
import { AdminPage, Pager, Pill, dateTime, human } from '../ui';

interface SaleLine {
  variant: StockSize;
  name: string;
  qty: number;
}

const VIEWS: { id: StockView; label: string; empty: string }[] = [
  { id: 'all', label: 'All products', empty: 'No products match.' },
  { id: 'low', label: 'Running low', empty: 'Nothing is running low at this store.' },
  { id: 'out', label: 'Sold out', empty: 'Every size has stock at this store.' },
  { id: 'count', label: 'To count', empty: 'Every size has been counted.' },
];
const PAGE_SIZE = 20;

/**
 * The stock screen. Opens on every product at my store with each size's numbers; chips narrow it to what needs
 * attention (running low, sold out, waiting for a count), and the search box takes a scanned barcode, a SKU or a
 * name. Each size can be sold at the counter, counted, moved to another store, or traced in its history.
 */
export function StockPage() {
  const { user } = useAuth();
  const toast = useToast();
  const branches = useBranches();
  const menu = useMenu();
  const [params, setParams] = useSearchParams();
  const [branch, setBranch] = useState(user?.staffBranchId ?? '');
  const branchId = branch || branches.data?.branches[0]?.id || '';
  const branchName = branches.data?.branches.find((b) => b.id === branchId)?.shortName ?? branchId;
  const view = (VIEWS.some((v) => v.id === params.get('view')) ? params.get('view') : 'all') as StockView;
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [text, setText] = useState(q);
  const searchBox = useRef<HTMLInputElement>(null);

  const setParam = (changes: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        if (!('page' in changes)) next.delete('page');
        return next;
      },
      { replace: true },
    );

  // Typing searches after a short pause; Enter (what a barcode scanner sends) searches at once.
  useEffect(() => {
    if (text.trim() === q) return;
    const id = window.setTimeout(() => setParam({ q: text.trim() || null }), 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const list = useAdminQuery<StockList>(
    ['stock', 'list'],
    '/v1/admin/stock/list',
    { branchId, view, page, pageSize: PAGE_SIZE, ...(q ? { q } : {}), ...(category ? { category } : {}) },
    { enabled: !!branchId, keepPrevious: true },
  );

  const [sale, setSale] = useState<SaleLine[]>([]);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ kind: 'count' | 'transfer' | 'history'; v: StockSize; name: string } | null>(null);
  const record = useAdminMutation((body: unknown) => post('/v1/admin/stock/sale', body), [['stock'], ['overview']]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setParam({ q: text.trim() || null });
  };
  const addToSale = (v: StockSize, name: string) =>
    setSale((s) => (s.some((l) => l.variant.id === v.id) ? s.map((l) => (l.variant.id === v.id ? { ...l, qty: l.qty + 1 } : l)) : [...s, { variant: v, name, qty: 1 }]));
  const inSale = (id: string) => sale.find((l) => l.variant.id === id)?.qty ?? 0;
  const count = sale.reduce((n, l) => n + l.qty, 0);
  const counts = list.data?.counts;
  const current = VIEWS.find((v) => v.id === view)!;

  return (
    <AdminPage title="Stock" description={`What is on the shelf at ${branchName || 'your store'}, size by size.`}>
      <div className="flex flex-wrap items-end gap-3">
        {user?.role === 'admin' ? (
          <Select
            label="Store"
            value={branchId}
            onChange={(e) => {
              setBranch(e.target.value);
              setSale([]);
            }}
          >
            {(branches.data?.branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.shortName}
              </option>
            ))}
          </Select>
        ) : (
          <p className="h-11 content-center text-[15px]">
            Store: <span className="font-semibold">{branchName}</span>
          </p>
        )}
        <form onSubmit={submit} role="search" className="relative min-w-[240px] flex-1">
          <Field
            ref={searchBox}
            label="Scan or search"
            placeholder="Barcode, SKU or product name"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            autoComplete="off"
            enterKeyHint="search"
            className="[&_input]:pl-10 [&_input]:pr-10"
          />
          <Search aria-hidden className="pointer-events-none absolute bottom-3.5 left-3.5 size-4 text-graphite" />
          {text && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute bottom-2 right-2 grid size-7 place-items-center rounded-full text-graphite hover:bg-stone"
              onClick={() => {
                setText('');
                setParam({ q: null });
                searchBox.current?.focus();
              }}
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </form>
        <Select label="Category" value={category} onChange={(e) => setParam({ category: e.target.value || null })}>
          <option value="">All categories</option>
          {(menu.data?.categories ?? []).map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
        {VIEWS.map((v) => {
          const n = counts?.[v.id];
          const on = v.id === view;
          const attention = v.id !== 'all' && !!n;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={on}
              onClick={() => setParam({ view: v.id === 'all' ? null : v.id })}
              className={cx(
                'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                on ? 'border-obsidian bg-obsidian text-paper' : 'border-[#C9C5BB] hover:border-obsidian',
              )}
            >
              {v.label}
              {n != null && (
                <span
                  className={cx(
                    'tabular rounded-full px-2 py-0.5 text-xs',
                    on ? 'bg-paper/15' : attention ? (v.id === 'out' ? 'bg-vermilion/10 text-vermilion' : 'bg-brass/20') : 'bg-stone',
                  )}
                >
                  {n}
                  <span className="sr-only">{v.id === 'all' ? ' products' : ' sizes'}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!branchId || list.isPending ? (
        <div className="flex flex-col gap-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState message={isApiError(list.error) ? list.error.message : undefined} onRetry={() => void list.refetch()} />
      ) : list.data.products.length === 0 ? (
        <EmptyState title={q ? `Nothing found for “${q}”` : current.empty} body={q ? 'Check the SKU, or search by part of the product name.' : undefined} />
      ) : (
        <div className={cx('flex flex-col gap-3 transition-opacity', list.isPlaceholderData && 'opacity-60')}>
          {list.data.products.map((p) => {
            const onHand = p.variants.reduce((n, v) => n + v.onHand, 0);
            return (
              <section key={p.id} aria-label={p.name} className="overflow-hidden rounded-[10px] border border-stone bg-paper">
                <header className="flex items-center gap-3 border-b border-stone px-3 py-2.5">
                  <Picture src={p.imageUrl} alt="" sizes="48px" width={48} height={48} className="stage size-12 shrink-0 overflow-hidden rounded-[6px]" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold leading-snug">{p.name}</h2>
                    <p className="text-sm text-graphite">
                      {[p.category, `${onHand} in store`].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  {p.status !== 'active' && <Pill>{human(p.status)}</Pill>}
                </header>
                <table className="w-full text-[15px] max-sm:block">
                  <thead className="sr-only sm:not-sr-only">
                    <tr className="text-left text-xs font-semibold text-graphite">
                      <th scope="col" className="px-3 py-1.5 font-semibold">Size</th>
                      <th scope="col" className="px-2 py-1.5 text-right font-semibold">Free</th>
                      <th scope="col" className="px-2 py-1.5 text-right font-semibold">On shelf</th>
                      <th scope="col" className="px-2 py-1.5 text-right font-semibold">Held</th>
                      <th scope="col" className="px-3 py-1.5"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone max-sm:block">
                    {p.variants.map((v) => {
                      const free = v.available - inSale(v.id);
                      const flagged = (view === 'low' && v.low) || (view === 'out' && v.available <= 0) || (view === 'count' && v.needsCount);
                      return (
                        <tr key={v.id} aria-label={`${v.size} ${v.color}`} className={cx('align-middle max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] max-sm:items-center', flagged && 'bg-brass/10')}>
                          <th scope="row" className="px-3 py-2 text-left font-normal">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold">{v.size}</span>
                              {v.available <= 0 ? <Pill tone="bad">Sold out</Pill> : v.low ? <Pill tone="warn">Low</Pill> : null}
                              {v.needsCount && <Pill tone="info">To count</Pill>}
                            </span>
                            <span className="block max-w-[13rem] truncate font-mono text-xs text-graphite sm:max-w-none">{v.sku}</span>
                          </th>
                          <td className="tabular px-2 py-2 text-right text-lg font-bold">
                            {v.available}
                            <span className="block text-[11px] font-normal text-graphite sm:sr-only"> free</span>
                          </td>
                          <td className="tabular px-2 py-2 text-right">
                            {v.onHand}
                            <span className="block text-[11px] text-graphite sm:sr-only"> on shelf</span>
                          </td>
                          <td className={cx('tabular px-2 py-2 text-right', v.reserved ? 'text-cobalt' : 'text-graphite')}>
                            {v.reserved}
                            <span className="block text-[11px] text-graphite sm:sr-only"> held</span>
                            <span className="sr-only"> for online orders</span>
                          </td>
                          <td className="px-3 py-2 max-sm:col-span-4 max-sm:pt-0">
                            <span className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 sm:flex sm:flex-wrap sm:justify-end">
                              <Button size="sm" variant="buy" aria-label={`Sell ${v.size}`} disabled={free < 1} onClick={() => addToSale(v, p.name)}>
                                <ShoppingBag className="size-4" aria-hidden />
                                <span>Sell</span>
                              </Button>
                              <Button size="sm" variant="secondary" aria-label={`Count ${v.size}`} onClick={() => setDialog({ kind: 'count', v, name: p.name })}>
                                <ClipboardCheck className="size-4" aria-hidden />
                                <span>Count</span>
                              </Button>
                              <Button size="sm" variant="ghost" aria-label={`Transfer ${v.size}`} title="Move to another store" onClick={() => setDialog({ kind: 'transfer', v, name: p.name })}>
                                <ArrowLeftRight className="size-4" aria-hidden />
                              </Button>
                              <Button size="sm" variant="ghost" aria-label={`History ${v.size}`} title="History" onClick={() => setDialog({ kind: 'history', v, name: p.name })}>
                                <History className="size-4" aria-hidden />
                              </Button>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            );
          })}
          <Pager page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={(n) => setParam({ page: n > 1 ? String(n) : null })} />
        </div>
      )}

      {sale.length > 0 && (
        <section aria-labelledby="sale-h" className="sticky bottom-3 z-20 rounded-[10px] border-2 border-vermilion/60 bg-paper p-4 shadow-[0_18px_40px_-20px_rgb(14_17_19/0.45)]">
          <h2 id="sale-h" className="mb-2 font-semibold">
            Sale
          </h2>
          <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto">
            {sale.map((l) => (
              <li key={l.variant.id} className="flex items-center justify-between gap-3 text-[15px]">
                <span className="min-w-0">
                  {l.name}, size {l.variant.size}
                  <span className="block font-mono text-xs text-graphite">{l.variant.sku}</span>
                </span>
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`One less ${l.variant.size}`}
                    className="grid size-8 place-items-center rounded border border-[#C9C5BB]"
                    onClick={() => setSale((s) => s.flatMap((x) => (x.variant.id !== l.variant.id ? [x] : x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : [])))}
                  >
                    <Minus className="size-3.5" aria-hidden />
                  </button>
                  <span className="tabular w-6 text-center font-semibold">{l.qty}</span>
                  <button
                    type="button"
                    aria-label={`One more ${l.variant.size}`}
                    disabled={l.qty >= l.variant.available}
                    className="grid size-8 place-items-center rounded border border-[#C9C5BB] disabled:opacity-40"
                    onClick={() => addToSale(l.variant, l.name)}
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </button>
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

      {dialog?.kind === 'count' && <CountDialog v={dialog.v} name={dialog.name} branchId={branchId} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'transfer' && <TransferDialog v={dialog.v} branchId={branchId} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'history' && <HistoryDialog v={dialog.v} branchId={branchId} onClose={() => setDialog(null)} />}
    </AdminPage>
  );
}

const REASONS = ['Shelf count', 'Delivery received', 'Damaged', 'Found', 'Returned to supplier'];

/** Count a size: type (or step to) the number on the shelf. The server writes the difference and clears "to count". */
function CountDialog({ v, name, branchId, onClose }: { v: StockSize; name: string; branchId: string; onClose(): void }) {
  const toast = useToast();
  const [value, setValue] = useState(String(v.onHand));
  const [reason, setReason] = useState(REASONS[0]!);
  const [error, setError] = useState<string | null>(null);
  const save = useAdminMutation((body: unknown) => post<{ delta: number }>('/v1/admin/stock/count', body), [['stock'], ['overview']]);
  const n = value === '' ? NaN : Number(value);
  const diff = Number.isInteger(n) ? n - v.onHand : 0;
  const step = (d: number) => setValue((s) => String(Math.max(0, (Number(s) || 0) + d)));
  return (
    <Sheet open onClose={onClose} side="center" title={`Count ${v.size}`}>
      <p className="text-[15px]">
        {name}, size {v.size} <span className="font-mono text-xs text-graphite">{v.sku}</span>
      </p>
      <p className="mt-1 text-sm text-graphite">
        The system has {v.onHand} on the shelf{v.reserved ? `, ${v.reserved} of them held for online orders` : ''}.
      </p>
      <div className="mt-4 flex items-end gap-2">
        <button type="button" aria-label="One less" className="grid h-[50px] w-12 shrink-0 place-items-center rounded-[8px] border border-obsidian hover:bg-stone" onClick={() => step(-1)}>
          <Minus className="size-5" strokeWidth={2.5} aria-hidden />
        </button>
        <Field
          label="On the shelf now"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 5))}
          onFocus={(e) => e.target.select()}
          className="w-36 [&_input]:text-center [&_input]:text-xl [&_input]:font-bold"
        />
        <button type="button" aria-label="One more" className="grid h-[50px] w-12 shrink-0 place-items-center rounded-[8px] border border-obsidian hover:bg-stone" onClick={() => step(1)}>
          <Plus className="size-5" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
      <p className={cx('mt-2 text-sm font-semibold', diff > 0 ? 'text-success' : diff < 0 ? 'text-vermilion' : 'text-graphite')} aria-live="polite">
        {diff > 0 ? `${diff} will be added` : diff < 0 ? `${-diff} will be taken off` : 'Same as the system: the size is marked as counted'}
      </p>
      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-semibold">Why</legend>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={r === reason}
              onClick={() => setReason(r)}
              className={cx('h-9 rounded-full border px-3.5 text-sm font-medium', r === reason ? 'border-obsidian bg-obsidian text-paper' : 'border-[#C9C5BB] hover:border-obsidian')}
            >
              {r}
            </button>
          ))}
        </div>
      </fieldset>
      {error && <ErrorState message={error} className="mt-3" />}
      <Button
        className="mt-5"
        variant="primary"
        block
        loading={save.isPending}
        onClick={() => {
          if (!Number.isInteger(n)) return setError('Enter how many are on the shelf.');
          if (n < v.reserved) return setError(`${v.reserved} ${v.reserved === 1 ? 'is' : 'are'} held for online orders, so the count can't be below ${v.reserved}.`);
          setError(null);
          save.mutate(
            { variantId: v.id, branchId, count: n, note: reason },
            {
              onSuccess: () => {
                toast.success(diff === 0 ? `${v.size} counted` : `${v.size} now ${n} on the shelf`);
                onClose();
              },
              onError: (e) => setError(isApiError(e) ? e.message : 'Something went wrong.'),
            },
          );
        }}
      >
        Save count
      </Button>
    </Sheet>
  );
}

function TransferDialog({ v, branchId, onClose }: { v: StockSize; branchId: string; onClose(): void }) {
  const toast = useToast();
  const branches = useBranches();
  const others = (branches.data?.branches ?? []).filter((b) => b.id !== branchId);
  const [to, setTo] = useState('');
  const [qty, setQty] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const move = useAdminMutation((body: unknown) => post('/v1/admin/stock/transfer', body), [['stock']]);
  return (
    <Sheet open onClose={onClose} side="center" title={`Transfer ${v.size}`}>
      <p className="mb-3 text-sm text-graphite">
        {v.sku}: {v.available} free to move.
      </p>
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
          if (n > v.available) return setError(`Only ${v.available} free to move.`);
          move.mutate({ variantId: v.id, from: branchId, to, qty: n }, { onSuccess: () => (toast.success('Transfer recorded'), onClose()), onError: (e) => setError(isApiError(e) ? e.message : 'Something went wrong.') });
        }}
      >
        Transfer
      </Button>
    </Sheet>
  );
}

function HistoryDialog({ v, branchId, onClose }: { v: StockSize; branchId: string; onClose(): void }) {
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
              <span className={cx('tabular font-semibold', m.deltaOnHand > 0 ? 'text-success' : m.deltaOnHand < 0 ? 'text-vermilion' : '')}>{m.deltaOnHand > 0 ? `+${m.deltaOnHand}` : m.deltaOnHand}</span>
            </li>
          ))}
          {moves.data?.movements.length === 0 && <li className="py-2 text-graphite">No movements yet.</li>}
        </ul>
      )}
    </Sheet>
  );
}
