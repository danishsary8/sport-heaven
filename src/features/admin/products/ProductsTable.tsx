import { useQueryClient } from '@tanstack/react-query';
import { Archive, Eye, EyeOff, ImageOff, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { isApiError } from '../../../lib/api';
import { formatUsd } from '../../../lib/i18n';
import { Button, cx, useToast } from '../../../ui';
import { patch } from '../api';
import type { AdminProductListRow } from '../types';

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
export function ProductsTable({ products }: { products: AdminProductListRow[] }) {
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

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['admin', 'products'] }), qc.invalidateQueries({ queryKey: ['admin', 'product'] })]);

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
          <button type="button" onClick={() => setSelected(new Set())} aria-label="Clear selection" className="grid size-9 place-items-center rounded-full text-paper/70 hover:bg-paper/10 hover:text-paper">
            <X className="size-4" aria-hidden />
          </button>
        </section>
      )}
    </div>
  );
}
