import { useQueryClient } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch, isApiError } from '../../../lib/api';
import { Button, Field, Select, Sheet, useToast } from '../../../ui';
import { useBranches } from '../../catalog/api';
import { post } from '../api';
import type { AdminProduct } from '../types';

/** The restock endpoint takes at most this many sizes per call; bigger restocks are sent in parts. */
const LINES_PER_CALL = 500;

/**
 * Restock the ticked products: the same amount added to every size that is on sale, at one store.
 * Each size's stock change is recorded as a restock (with the note) in the stock history.
 */
export function RestockDialog({ open, productIds, onClose, onDone }: { open: boolean; productIds: string[]; onClose(): void; onDone(): void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const branches = useBranches();
  const [branch, setBranch] = useState('');
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const [sizes, setSizes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const branchId = branch || branches.data?.branches[0]?.id || '';
  const branchName = branches.data?.branches.find((b) => b.id === branchId)?.shortName ?? branchId;
  const n = Number(qty);
  const valid = Number.isInteger(n) && n >= 1 && n <= 999;
  const key = productIds.join(',');

  // Find every size of the ticked products when the dialog opens (sizes switched off in the shop are left out).
  useEffect(() => {
    if (!open) return;
    let live = true;
    Promise.all(productIds.map((id) => apiFetch<{ product: AdminProduct }>(`/v1/admin/products/${id}`)))
      .then((res) => live && setSizes(res.flatMap((r) => r.product.variants.filter((v) => v.status === 'active').map((v) => v.id))))
      .catch((e: unknown) => live && setError(isApiError(e) ? e.message : 'Could not load the sizes. Try again.'));
    return () => {
      live = false;
    };
    // `key` stands for the ticked products.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  const close = () => {
    if (busy) return;
    setSizes(null);
    setError(null);
    onClose();
  };

  const restock = async () => {
    if (!sizes?.length || !valid || !branchId) return;
    setBusy(true);
    setError(null);
    let done = 0;
    let units = 0;
    try {
      for (let i = 0; i < sizes.length; i += LINES_PER_CALL) {
        const lines = sizes.slice(i, i + LINES_PER_CALL).map((variantId) => ({ variantId, qty: n }));
        const r = await post<{ sizes: number; units: number }>('/v1/admin/stock/restock', { branchId, lines, ...(note.trim() ? { note: note.trim() } : {}) });
        done += r.sizes;
        units += r.units;
      }
      toast.success(`Added ${n} to ${done} ${done === 1 ? 'size' : 'sizes'} (${units} units) at ${branchName}`);
      await Promise.all([qc.invalidateQueries({ queryKey: ['admin'] }), qc.invalidateQueries({ queryKey: ['catalog'] })]);
      setSizes(null);
      setQty('1');
      setNote('');
      setBusy(false);
      onDone();
    } catch (e) {
      setBusy(false);
      // Parts already sent stay recorded; say how far it got.
      setError(`${done ? `${done} sizes were restocked, then it stopped: ` : ''}${isApiError(e) ? e.message : 'Something went wrong.'}`);
    }
  };

  const step = (d: number) => setQty((s) => String(Math.min(999, Math.max(1, (Number(s) || 0) + d))));
  const count = productIds.length;

  return (
    <Sheet
      open={open}
      onClose={close}
      side="center"
      title={`Restock ${count} ${count === 1 ? 'product' : 'products'}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={busy} onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!valid || !sizes?.length || !branchId} loading={busy} onClick={() => void restock()}>
            {sizes ? `Restock ${sizes.length} ${sizes.length === 1 ? 'size' : 'sizes'}` : 'Restock'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Select label="Store" value={branchId} onChange={(e) => setBranch(e.target.value)}>
          {(branches.data?.branches ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.shortName}
            </option>
          ))}
        </Select>
        <div className="flex items-end gap-1.5">
          <button type="button" aria-label="One less each" className="grid h-11 w-11 place-items-center rounded-[8px] border border-obsidian hover:bg-stone" onClick={() => step(-1)}>
            <Minus className="size-4" strokeWidth={2.5} aria-hidden />
          </button>
          <Field
            label="Add to each size"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/\D/g, '').slice(0, 3))}
            onFocus={(e) => e.target.select()}
            className="w-28 [&_input]:text-center [&_input]:text-lg [&_input]:font-bold"
          />
          <button type="button" aria-label="One more each" className="grid h-11 w-11 place-items-center rounded-[8px] border border-obsidian hover:bg-stone" onClick={() => step(1)}>
            <Plus className="size-4" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
        <Field label="Note (optional)" placeholder="Supplier, invoice number…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        <p className="rounded-[8px] bg-chalk px-3 py-2 text-[15px]" aria-live="polite">
          {error ? (
            <span className="text-vermilion">{error}</span>
          ) : !sizes ? (
            'Finding the sizes…'
          ) : sizes.length === 0 ? (
            'None of these products has a size on sale.'
          ) : valid ? (
            `Adds ${n} to each of ${sizes.length} ${sizes.length === 1 ? 'size' : 'sizes'} (${n * sizes.length} units) at ${branchName}.`
          ) : (
            'Enter how many to add to each size (1 to 999).'
          )}
        </p>
      </div>
    </Sheet>
  );
}
