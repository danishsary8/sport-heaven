import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleAlert, Images } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { apiFetch, isApiError } from '../../../lib/api';
import { Button, cx } from '../../../ui';
import type { AdminProduct } from '../types';
import { groupPhotoFiles, photosOp, type PhotoGroup } from './productImport';
import { findProducts } from './shopLookup';

type Row = { group: PhotoGroup<File>; product?: AdminProduct; problem?: string };
type Done = { slug: string; ok: true } | { slug: string; ok: false; message: string };

/**
 * Photos for many products at once: files named "<web address>-1.webp" become the product's main photo and
 * "-2" its hover photo. Other photos of the product stay after them. Files for products not in the shop are skipped.
 */
export function BulkPhotos() {
  const qc = useQueryClient();
  const [picked, setPicked] = useState<File[] | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [done, setDone] = useState<Done[] | null>(null);
  const [busy, setBusy] = useState(false);
  const grouped = picked ? groupPhotoFiles(picked) : null;

  useEffect(() => {
    if (!grouped) return;
    let live = true;
    findProducts(grouped.groups.map((g) => g.slug))
      .then((shop) => {
        if (!live) return;
        setRows(
          grouped.groups.map((group) => {
            const product = shop.get(group.slug);
            const hasMain = !!group.main || (product?.images.length ?? 0) > 0;
            return { group, product, problem: product && !hasMain ? `needs a main photo (${group.slug}-1) first` : undefined };
          }),
        );
      })
      .catch((e: unknown) => live && setLookupError(isApiError(e) ? e.message : 'Could not check the shop. Try again.'));
    return () => {
      live = false;
    };
    // `picked` is what the groups are made from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  const ready = rows?.filter((r) => r.product && !r.problem) ?? [];

  const apply = async () => {
    setBusy(true);
    const out: Done[] = [];
    for (const { group, product } of ready) {
      try {
        const upload = async (f: File) => (await apiFetch<{ path: string }>('/v1/admin/media', { method: 'POST', blob: f })).path;
        const current = [...product!.images].sort((a, b) => a.sort - b.sort);
        const main = group.main ? await upload(group.main) : current[0]!.path;
        const hover = group.hover ? await upload(group.hover) : undefined;
        const op = photosOp(product!, hover ? [main, hover] : [main]);
        if (op) await apiFetch(op.path, { method: op.method, body: op.body });
        out.push({ slug: group.slug, ok: true });
      } catch (e) {
        out.push({ slug: group.slug, ok: false, message: isApiError(e) ? e.message : 'Something went wrong' });
      }
      setDone([...out]);
    }
    await Promise.all([qc.invalidateQueries({ queryKey: ['admin', 'products'] }), qc.invalidateQueries({ queryKey: ['admin', 'product'] }), qc.invalidateQueries({ queryKey: ['catalog'] })]);
    setBusy(false);
  };

  const added = done?.filter((d) => d.ok).length ?? 0;
  const failed = done?.filter((d) => !d.ok).length ?? 0;
  const plural = (n: number) => `${n} ${n === 1 ? 'product' : 'products'}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Images className="size-5 text-graphite" aria-hidden />
        <span className="font-semibold">Add photos to many products</span>
        <label className="inline-flex h-9 cursor-pointer items-center rounded-full border border-obsidian px-4 text-sm font-semibold transition-colors hover:bg-stone has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-obsidian">
          Choose photos
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            aria-label="Photos named by product"
            className="sr-only"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = '';
              if (!files.length) return;
              setRows(null);
              setDone(null);
              setLookupError(null);
              setPicked(files);
            }}
          />
        </label>
      </div>
      <p className="text-sm text-graphite">
        Name each file after the product's web address: <span className="font-mono text-xs">ac-milan-2026-27-home-authentic-jersey-1.webp</span> is the main photo, <span className="font-mono text-xs">…-2.webp</span>{' '}
        the hover photo. JPG, PNG or WebP, up to 4 MB each. The web address is in the products export (slug column).
      </p>

      {picked && grouped && (
        <section aria-label="Photos check" className="rounded-[12px] bg-chalk p-4">
          <p className={cx('flex items-center gap-2 font-semibold', grouped.problems.length || lookupError ? 'text-vermilion' : 'text-success')}>
            {grouped.problems.length || lookupError ? <CircleAlert className="size-4" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
            {lookupError ?? (rows ? `${picked.length} ${picked.length === 1 ? 'photo' : 'photos'} for ${plural(rows.length)}; ${plural(ready.length)} ready.` : 'Finding the products…')}
          </p>
          {grouped.problems.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-vermilion">
              {grouped.problems.map((p) => (
                <li key={p}>{p} (skipped)</li>
              ))}
            </ul>
          )}
          {rows && rows.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-graphite">
                  <tr>
                    <th className="py-1 pr-2 font-medium">Web address</th>
                    <th className="py-1 pr-2 font-medium">Product</th>
                    <th className="py-1 pr-2 font-medium">Main</th>
                    <th className="py-1 font-medium">Hover</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const d = done?.find((x) => x.slug === r.group.slug);
                    return (
                      <tr key={r.group.slug} className={cx('border-t border-stone align-top', (!r.product || r.problem) && 'text-graphite')}>
                        <td className="py-1.5 pr-2 font-mono text-xs">{r.group.slug}</td>
                        <td className="py-1.5 pr-2">
                          {r.product ? (
                            <Link to={`/admin/products/${r.product.id}`} className="font-medium underline underline-offset-4">
                              {r.product.nameI18n.en}
                            </Link>
                          ) : (
                            <span className="text-vermilion">Not in the shop</span>
                          )}
                          {r.problem && <span className="block text-xs text-vermilion">{r.problem}</span>}
                          {d && (d.ok ? <span className="block text-xs text-success">Photos added</span> : <span className="block text-xs text-vermilion">{d.message}</span>)}
                        </td>
                        <td className="py-1.5 pr-2">{r.group.main?.name ?? '–'}</td>
                        <td className="py-1.5">{r.group.hover?.name ?? '–'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" disabled={!ready.length || busy || done !== null} loading={busy} onClick={() => void apply()}>
              Add photos to {plural(ready.length)}
            </Button>
            {done && !busy && (
              <span className="text-sm font-semibold">
                {added > 0 ? `Photos added to ${plural(added)}` : 'No photos added'}
                {failed > 0 && <span className="text-vermilion">, {failed} failed (see above)</span>}
              </span>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
