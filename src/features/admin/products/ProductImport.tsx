import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleAlert, Download, FileSpreadsheet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { apiFetch, isApiError } from '../../../lib/api';
import { formatUsd } from '../../../lib/i18n';
import { Button, cx } from '../../../ui';
import { post, useAdminQuery } from '../api';
import type { AdminProduct, Brand, Category } from '../types';
import { findProducts } from './shopLookup';
import { usePriceRounding } from './usePriceRounding';
import { IMPORT_TEMPLATE, checkImport, isPhotoLink, planImport, type ImportPlan, type ImportRow } from './productImport';

type Result = { line: number; ok: true; id: string; kind: 'new' | 'update' } | { line: number; ok: false; message: string };

const KIND_LABEL: Record<ImportPlan['kind'], string> = { new: 'New', update: 'Update', same: 'No change' };
const KIND_STYLE: Record<ImportPlan['kind'], string> = { new: 'bg-success/10 text-success', update: 'bg-[#E8EEFB] text-[#1C3F94]', same: 'bg-stone text-graphite' };

/**
 * Products from a spreadsheet: rows for products already in the shop (matched by the slug column, or by the
 * name's web address) update them; other rows add new products. Every row is checked and labelled first —
 * New, Update (with what changes) or No change — and nothing is sent while any row has a problem.
 */
export function ProductImport() {
  const { round } = usePriceRounding();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const brands = useAdminQuery<{ brands: Brand[] }>(['brands'], '/v1/admin/brands');
  const categories = useAdminQuery<{ categories: Category[] }>(['categories'], '/v1/admin/categories');
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [plans, setPlans] = useState<ImportPlan[] | null>(null);
  const [found, setFound] = useState<Map<string, AdminProduct>>(new Map());
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = !!brands.data && !!categories.data;
  const check = file && ready ? checkImport(file.text, brands.data!.brands, categories.data!.categories, round) : null;
  const valid = !!check && check.rows.length > 0 && check.problems.length === 0;

  // Once the file is valid, compare it with the shop so every row can be labelled before anything is sent.
  useEffect(() => {
    if (!valid || !check) return;
    let live = true;
    findProducts(check.rows.map((r) => r.matchSlug))
      .then((shop) => {
        if (!live) return;
        setFound(shop);
        setPlans(planImport(check.rows, shop));
      })
      .catch((e: unknown) => live && setLookupError(isApiError(e) ? e.message : 'Could not check the shop. Try again.'));
    return () => {
      live = false;
    };
    // The file text is what the check is made from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.text, valid]);

  const template = () => {
    const url = URL.createObjectURL(new Blob([IMPORT_TEMPLATE], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sport-heaven-new-products.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const apply = async (rows: ImportRow[], plan: ImportPlan[]) => {
    setBusy(true);
    const out: Result[] = [];
    // One row at a time, in file order, so a slow server is not flooded and results read top to bottom.
    for (const r of rows) {
      const p = plan.find((x) => x.line === r.line)!;
      if (p.kind === 'same') continue;
      try {
        // Photo links are downloaded by the server first; the stored copies are what the product uses.
        const photos: string[] = [];
        for (const ph of r.photos) photos.push(isPhotoLink(ph) ? (await post<{ path: string }>('/v1/admin/media/from-url', { url: ph })).path : ph);
        const row = { ...r, photos };
        if (p.kind === 'new') {
          const body = { ...r.body, ...(photos.length ? { images: photos.map((path) => ({ path })) } : {}) };
          const res = await post<{ product: AdminProduct }>('/v1/admin/products', body);
          out.push({ line: r.line, ok: true, id: res.product.id, kind: 'new' });
        } else {
          const ops = r.photos.some(isPhotoLink) ? planImport([row], found)[0]!.ops : p.ops;
          for (const op of ops) await apiFetch(op.path, { method: op.method, body: op.body });
          out.push({ line: r.line, ok: true, id: p.productId!, kind: 'update' });
        }
      } catch (e) {
        out.push({ line: r.line, ok: false, message: isApiError(e) ? e.message : 'Something went wrong' });
      }
      setResults([...out]);
    }
    setResults([...out]);
    await Promise.all([qc.invalidateQueries({ queryKey: ['admin', 'products'] }), qc.invalidateQueries({ queryKey: ['admin', 'product'] }), qc.invalidateQueries({ queryKey: ['catalog'] })]);
    setBusy(false);
  };

  const count = (k: ImportPlan['kind']) => plans?.filter((p) => p.kind === k).length ?? 0;
  const news = count('new');
  const updates = count('update');
  const applyLabel = [news && `${news} new ${news === 1 ? 'product' : 'products'}`, updates && `${updates} ${updates === 1 ? 'update' : 'updates'}`].filter(Boolean).join(', ');
  const created = results?.filter((r) => r.ok && r.kind === 'new').length ?? 0;
  const updated = results?.filter((r) => r.ok && r.kind === 'update').length ?? 0;
  const failed = results?.filter((r) => !r.ok).length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <FileSpreadsheet className="size-5 text-graphite" aria-hidden />
        <span className="font-semibold">Add or update products</span>
        <Button size="sm" variant="ghost" onClick={template}>
          <Download className="size-4" aria-hidden />
          Download template
        </Button>
        <label className="inline-flex h-9 cursor-pointer items-center rounded-full border border-obsidian px-4 text-sm font-semibold transition-colors hover:bg-stone has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-obsidian">
          Choose file
          <input
            ref={input}
            type="file"
            accept=".csv,text/csv"
            aria-label="New products spreadsheet"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setResults(null);
              setPlans(null);
              setLookupError(null);
              setFile({ name: f.name, text: await f.text() });
              // Lets the same file name be chosen again after fixing it in a spreadsheet app.
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <p className="text-sm text-graphite">
        One row per product. Sizes are separated by | (EU 40|EU 41). A row whose slug (or name) is already in the shop updates that product: its price for every size, its main and hover photos, name,
        description and status. Empty cells leave things as they are. Tip: export products, edit the file, import it back.
      </p>

      {file && (
        <section aria-label="New products check" className="rounded-[12px] bg-chalk p-4">
          {!check ? (
            <p className="text-sm text-graphite">Checking {file.name}…</p>
          ) : (
            <>
              <p className={cx('flex items-center gap-2 font-semibold', check.problems.length || lookupError ? 'text-vermilion' : 'text-success')}>
                {check.problems.length || lookupError ? <CircleAlert className="size-4" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
                {check.problems.length
                  ? `${check.problems.length} ${check.problems.length === 1 ? 'problem' : 'problems'} in ${file.name}. Fix them and choose the file again; nothing was changed.`
                  : lookupError
                    ? lookupError
                    : plans
                      ? `${check.rows.length} ${check.rows.length === 1 ? 'row' : 'rows'} checked in ${file.name}: ${news} new, ${updates} to update, ${count('same')} unchanged.`
                      : `Comparing ${file.name} with the shop…`}
              </p>
              {check.problems.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {check.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              {check.rows.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="text-graphite">
                      <tr>
                        <th className="py-1 pr-2 font-medium">Line</th>
                        <th className="py-1 pr-2 font-medium">Name</th>
                        <th className="py-1 pr-2 font-medium">Status</th>
                        <th className="py-1 pr-2 font-medium">What happens</th>
                        <th className="py-1 font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {check.rows.map((r) => {
                        const plan = plans?.find((p) => p.line === r.line);
                        const res = results?.find((x) => x.line === r.line);
                        return (
                          <tr key={r.line} className={cx('border-t border-stone align-top', r.problems.length > 0 && 'text-vermilion')}>
                            <td className="tabular py-1.5 pr-2">{r.line}</td>
                            <td className="py-1.5 pr-2 font-medium">
                              {res?.ok ? (
                                <Link to={`/admin/products/${res.id}`} className="underline underline-offset-4">
                                  {r.name}
                                </Link>
                              ) : (
                                r.name || '–'
                              )}
                              {res && !res.ok && <span className="block text-xs text-vermilion">{res.message}</span>}
                            </td>
                            <td className="py-1.5 pr-2">
                              {plan && <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', KIND_STYLE[plan.kind])}>{KIND_LABEL[plan.kind]}</span>}
                              {res?.ok && <span className="ml-1 text-xs text-success">{res.kind === 'new' ? 'created' : 'done'}</span>}
                            </td>
                            <td className="py-1.5 pr-2 text-graphite">{plan ? (plan.kind === 'new' ? `Add as ${r.body.status} · ${plan.changes.join(', ')}` : plan.changes.join(', ') || '–') : '–'}</td>
                            <td className="tabular py-1.5">{r.body.variants[0] ? formatUsd(r.priceCents) : '–'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm" disabled={!valid || !plans || !applyLabel || busy || results !== null} loading={busy} onClick={() => void apply(check.rows, plans!)}>
                  {applyLabel ? `Import ${applyLabel}` : 'Import'}
                </Button>
                {plans && !applyLabel && <span className="text-sm text-graphite">Everything in the file already matches the shop.</span>}
                {results && !busy && (
                  <span className="text-sm font-semibold">
                    {[created && `${created} created`, updated && `${updated} updated`].filter(Boolean).join(', ') || 'Nothing changed'}
                    {failed > 0 && <span className="text-vermilion">, {failed} failed (see the lines above)</span>}
                  </span>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
