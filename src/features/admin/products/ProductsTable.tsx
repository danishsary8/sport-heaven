import { useQueryClient } from '@tanstack/react-query';
import { Archive, Download, Eye, EyeOff, ImageOff, PackagePlus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { apiFetch, isApiError } from '../../../lib/api';
import { formatUsd } from '../../../lib/i18n';
import { Button, cx, Sheet, useToast } from '../../../ui';
import { patch, put } from '../api';
import type { AdminProductListRow } from '../types';
import { usePriceRounding } from './usePriceRounding';
import { RestockDialog } from './RestockDialog';

type Status = AdminProductListRow['status'];

const STATUS_STYLE: Record<Status, string> = {
  active: 'border-success/30 bg-success/10 text-success',
  draft: 'border-brass/40 bg-brass/15 text-obsidian',
  archived: 'border-stone bg-stone text-graphite',
};

const price = (p: AdminProductListRow) =>
  p.priceMinCents == null ? '–' : p.priceMinCents === p.priceMaxCents ? formatUsd(p.priceMinCents) : `${formatUsd(p.priceMinCents)} – ${formatUsd(p.priceMaxCents ?? p.priceMinCents)}`;

/**
 * The products as a table a manager can work in: photo (hover shows the second pose), price range, stock,
 * a warning when the hover photo is missing, status changed in place, and rows selected for bulk changes.
 */
/** "11.90" or "$11.90" → 1190; anything else → null. */
function toCents(v: string): number | null {
  const t = v.trim().replace(/^\$/, '');
  return /^\d+(\.\d{1,2})?$/.test(t) ? Math.round(Number(t) * 100) : null;
}

export function ProductsTable({ products }: { products: AdminProductListRow[] }) {
  const { round } = usePriceRounding();
  const toast = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const allOnPage = products.length > 0 && products.every((p) => selected.has(p.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['admin', 'products'] }), qc.invalidateQueries({ queryKey: ['admin', 'product'] }), qc.invalidateQueries({ queryKey: ['catalog'] })]);

  const setStatus = async (ids: string[], status: Status) => {
    setBusy(ids.length === 1 ? ids[0]! : 'bulk');
    const results = await Promise.allSettled(ids.map((id) => patch(`/v1/admin/products/${id}`, { status })));
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    const done = ids.length - failed.length;
    await refresh();
    setBusy(null);
    if (done > 0) toast.success(`${done} ${done === 1 ? 'product' : 'products'} set to ${status}`);
    if (failed.length > 0) toast.error(`${failed.length} could not be changed: ${isApiError(failed[0]!.reason) ? failed[0]!.reason.message : 'something went wrong'}`);
    // Keep only the rows that failed ticked, ready to retry.
    const failedIds = new Set(ids.filter((_, i) => results[i]!.status === 'rejected'));
    setSelected((s) => new Set([...s].filter((id) => failedIds.has(id))));
  };

  // Deleting is for good, so it asks first. The server refuses products that have orders (archive those).
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const deleteProducts = async (ids: string[]) => {
    setBusy('bulk');
    const results = await Promise.allSettled(ids.map((id) => apiFetch(`/v1/admin/products/${id}`, { method: 'DELETE' })));
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    const done = ids.length - failed.length;
    await refresh();
    setBusy(null);
    setConfirmDelete(false);
    if (done > 0) toast.success(`${done} ${done === 1 ? 'product' : 'products'} deleted`);
    if (failed.length > 0) toast.error(`${failed.length} could not be deleted: ${isApiError(failed[0]!.reason) ? failed[0]!.reason.message : 'something went wrong'}`);
    const failedIds = new Set(ids.filter((_, i) => results[i]!.status === 'rejected'));
    setSelected((s) => new Set([...s].filter((id) => failedIds.has(id))));
  };

  // The ticked products as a CSV in the import columns: edit it and import it back to update them.
  const exportSelected = async (ids: string[]) => {
    try {
      const text = await apiFetch<string>('/v1/admin/products/export.csv', { as: 'text', query: { format: 'products', ids: ids.join(',') } });
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `sport-heaven-selected-${ids.length}-products-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error(isApiError(e) ? e.message : 'The export failed.');
    }
  };

  // One price for every size of every ticked product (any "was" price is cleared).
  const [bulkPrice, setBulkPrice] = useState('');
  const setPrice = async (ids: string[]) => {
    const typed = toCents(bulkPrice);
    // The price that will really be saved (.90 when that rule is on; the server does the same).
    const cents = typed === null ? null : round(typed);
    if (cents === null) return toast.error('Enter the price like 11.90');
    setBusy('bulk');
    const results = await Promise.allSettled(ids.map((id) => put(`/v1/admin/products/${id}/prices`, { priceCents: cents, compareAtCents: null })));
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    const done = ids.length - failed.length;
    await refresh();
    setBusy(null);
    if (done > 0) toast.success(`${done} ${done === 1 ? 'product' : 'products'} now ${formatUsd(cents)}`);
    if (failed.length > 0) toast.error(`${failed.length} could not be changed: ${isApiError(failed[0]!.reason) ? failed[0]!.reason.message : 'something went wrong'}`);
    const failedIds = new Set(ids.filter((_, i) => results[i]!.status === 'rejected'));
    setSelected((s) => new Set([...s].filter((id) => failedIds.has(id))));
    if (failed.length === 0) setBulkPrice('');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-[14px] border border-stone">
        <table className="w-full min-w-[760px] text-left text-[15px]">
          <thead className="bg-chalk text-sm text-graphite">
            <tr>
              <th scope="col" className="w-10 py-2.5 pl-4">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  className="size-[18px] accent-obsidian"
                  checked={allOnPage}
                  onChange={() => setSelected(allOnPage ? new Set() : new Set(products.map((p) => p.id)))}
                />
              </th>
              <th scope="col" className="py-2.5 pl-2 font-medium">Product</th>
              <th scope="col" className="py-2.5 font-medium">Price</th>
              <th scope="col" className="py-2.5 font-medium">Stock</th>
              <th scope="col" className="py-2.5 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone">
            {products.map((p) => {
              const on = selected.has(p.id);
              const name = p.nameI18n.en;
              return (
                <tr key={p.id} className={cx('transition-colors', on ? 'bg-cobalt/[0.04]' : 'hover:bg-chalk/70', busy === p.id && 'opacity-60')}>
                  <td className="py-3 pl-4 align-middle">
                    <input type="checkbox" aria-label={`Select ${name}`} className="size-[18px] accent-obsidian" checked={on} onChange={() => toggle(p.id)} />
                  </td>
                  <td className="py-3 pl-2">
                    <Link to={`/admin/products/${p.id}`} className="group flex items-center gap-3">
                      <span className="stage relative block size-14 shrink-0 overflow-hidden rounded-[10px]">
                        {p.imageUrl ? (
                          <>
                            <img src={p.imageUrl} alt="" loading="lazy" className={cx('absolute inset-0 size-full object-cover transition-opacity duration-300', p.hoverImageUrl && 'group-hover:opacity-0')} />
                            {p.hoverImageUrl && <img src={p.hoverImageUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
                          </>
                        ) : (
                          <ImageOff aria-hidden className="absolute inset-0 m-auto size-5 text-graphite" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold leading-snug underline-offset-4 group-hover:underline">{name}</span>
                        <span className="mt-0.5 block text-sm text-graphite">
                          {[p.brandName, p.categorySlug].filter(Boolean).join(', ')}
                          {p.variantCount ? `, ${p.variantCount} ${p.variantCount === 1 ? 'size' : 'sizes'}` : ''}
                        </span>
                        {(p.imageCount ?? 0) < 2 && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-vermilion/10 px-2 py-0.5 text-xs font-semibold text-vermilion">Needs a 2nd photo</span>
                        )}
                      </span>
                    </Link>
                  </td>
                  <td className="tabular py-3 pr-3 whitespace-nowrap">{price(p)}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {p.onHand == null ? (
                      '–'
                    ) : p.onHand === 0 ? (
                      <span className="font-semibold text-vermilion">Out of stock</span>
                    ) : (
                      <span className={cx('tabular', p.onHand <= 5 && 'font-semibold text-brass')}>{p.onHand} in stock</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      aria-label={`Status of ${name}`}
                      value={p.status}
                      disabled={busy !== null}
                      onChange={(e) => void setStatus([p.id], e.target.value as Status)}
                      className={cx('h-9 rounded-full border px-3 text-sm font-semibold transition-colors', STATUS_STYLE[p.status])}
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <section
          aria-label={`${selected.size} selected`}
          className="animate-toast-in sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-[14px] bg-obsidian p-2 pl-4 text-paper shadow-[0_18px_40px_-14px_rgb(14_17_19/0.55)]"
        >
          <span className="mr-2 text-sm font-semibold">{selected.size} selected</span>
          <Button size="sm" variant="ghost" className="text-paper hover:bg-paper/10" loading={busy === 'bulk'} onClick={() => void setStatus([...selected], 'active')}>
            <Eye className="size-4" aria-hidden />
            Make active
          </Button>
          <Button size="sm" variant="ghost" className="text-paper hover:bg-paper/10" disabled={busy !== null} onClick={() => void setStatus([...selected], 'draft')}>
            <EyeOff className="size-4" aria-hidden />
            Make draft
          </Button>
          <Button size="sm" variant="ghost" className="text-paper hover:bg-paper/10" disabled={busy !== null} onClick={() => void setStatus([...selected], 'archived')}>
            <Archive className="size-4" aria-hidden />
            Archive
          </Button>
          <Button size="sm" variant="ghost" className="text-paper hover:bg-paper/10" disabled={busy !== null} onClick={() => setRestockOpen(true)}>
            <PackagePlus className="size-4" aria-hidden />
            Restock
          </Button>
          <Button size="sm" variant="ghost" className="text-paper hover:bg-paper/10" disabled={busy !== null} onClick={() => void exportSelected([...selected])}>
            <Download className="size-4" aria-hidden />
            Export
          </Button>
          <form
            className="flex items-center gap-1 border-l border-paper/20 pl-2"
            onSubmit={(e) => {
              e.preventDefault();
              void setPrice([...selected]);
            }}
          >
            <input
              value={bulkPrice}
              onChange={(e) => setBulkPrice(e.target.value)}
              inputMode="decimal"
              placeholder="11.90"
              aria-label="New price for the selected products"
              className="h-9 w-20 rounded-[8px] bg-paper/10 px-2 text-sm text-paper placeholder:text-paper/50 focus:outline-2 focus:outline-paper"
            />
            <Button type="submit" size="sm" variant="ghost" className="text-paper hover:bg-paper/10" disabled={busy !== null || !bulkPrice.trim()}>
              Set price
            </Button>
          </form>
          <Button size="sm" variant="ghost" className="text-[#FF8A80] hover:bg-[#FF8A80]/15" disabled={busy !== null} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" aria-hidden />
            Delete
          </Button>
          <button type="button" onClick={() => setSelected(new Set())} aria-label="Clear selection" className="grid size-9 place-items-center rounded-full text-paper/70 hover:bg-paper/10 hover:text-paper">
            <X className="size-4" aria-hidden />
          </button>
        </section>
      )}
      <RestockDialog
        open={restockOpen}
        productIds={[...selected]}
        onClose={() => setRestockOpen(false)}
        onDone={() => {
          setRestockOpen(false);
          setSelected(new Set());
        }}
      />
      <Sheet
        open={confirmDelete}
        onClose={() => busy === null && setConfirmDelete(false)}
        side="center"
        title={`Delete ${selected.size} ${selected.size === 1 ? 'product' : 'products'}?`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={busy !== null} onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="bg-vermilion hover:bg-[#B3241B]" loading={busy === 'bulk'} onClick={() => void deleteProducts([...selected])}>
              Delete {selected.size} {selected.size === 1 ? 'product' : 'products'}
            </Button>
          </div>
        }
      >
        <p className="text-[15px]">They are removed from the shop and the admin for good, with their sizes, stock and photos. This cannot be undone.</p>
        <p className="mt-3 text-sm text-graphite">Products that have orders are kept, so order history stays complete. Archive those instead to hide them.</p>
      </Sheet>
    </div>
  );
}
