import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleAlert, Download, FileSpreadsheet } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { isApiError } from '../../../lib/api';
import { formatUsd } from '../../../lib/i18n';
import { Button, cx } from '../../../ui';
import { apiFetch } from '../../../lib/api';
import { post, useAdminQuery } from '../api';
import type { AdminProduct, AdminProductListRow, Brand, Category } from '../types';
import { IMPORT_TEMPLATE, checkImport, type ImportRow } from './productImport';

type Result = { line: number; ok: true; id: string; name: string } | { line: number; ok: false; name: string; message: string };

/**
 * New products from a spreadsheet: download the template, fill it in, upload. Every row is checked first;
 * nothing is created while any row has a problem. Products are created as drafts so they can get photos first.
 */
export function ProductImport() {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const brands = useAdminQuery<{ brands: Brand[] }>(['brands'], '/v1/admin/brands');
  const categories = useAdminQuery<{ categories: Category[] }>(['categories'], '/v1/admin/categories');
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [taken, setTaken] = useState<string[]>([]);
  const ready = !!brands.data && !!categories.data;
  const check = file && ready ? checkImport(file.text, brands.data!.brands, categories.data!.categories) : null;
  const ok = !!check && check.rows.length > 0 && check.problems.length === 0;

  const template = () => {
    const url = URL.createObjectURL(new Blob([IMPORT_TEMPLATE], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sport-heaven-new-products.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const create = async (rows: ImportRow[]) => {
    setBusy(true);
    // First make sure none of the products is already in the shop, so the file is created whole or not at all.
    const clashes: string[] = [];
    for (const r of rows) {
      try {
        const found = await apiFetch<{ products: AdminProductListRow[] }>('/v1/admin/products', { query: { q: r.body.slug, pageSize: 10 } });
        if (found.products.some((p) => p.slug === r.body.slug)) clashes.push(`Line ${r.line}: ${r.body.slug} is already in the shop. Change the name or edit that product.`);
      } catch (e) {
        clashes.push(`Line ${r.line}: could not check the shop (${isApiError(e) ? e.message : 'try again'}).`);
      }
    }
    setTaken(clashes);
    if (clashes.length) {
      setBusy(false);
      return;
    }
    const out: Result[] = [];
    // One at a time, so the results read in file order and a slow server is not flooded.
    for (const r of rows) {
      try {
        const res = await post<{ product: AdminProduct }>('/v1/admin/products', r.body);
        out.push({ line: r.line, ok: true, id: res.product.id, name: r.name });
      } catch (e) {
        out.push({ line: r.line, ok: false, name: r.name, message: isApiError(e) ? e.message : 'Something went wrong' });
      }
      setResults([...out]);
    }
    await qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    setBusy(false);
  };

  const created = results?.filter((r) => r.ok).length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <FileSpreadsheet className="size-5 text-graphite" aria-hidden />
        <span className="font-semibold">Add new products</span>
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
              setTaken([]);
              setFile({ name: f.name, text: await f.text() });
              // Lets the same file name be chosen again after fixing it in a spreadsheet app.
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <p className="text-sm text-graphite">One row per product. Sizes are separated by | (EU 40|EU 41). Photos can be added after, on each product.</p>

      {file && (
        <section aria-label="New products check" className="rounded-[12px] bg-chalk p-4">
          {!check ? (
            <p className="text-sm text-graphite">Checking {file.name}…</p>
          ) : (
            <>
              <p className={cx('flex items-center gap-2 font-semibold', check.problems.length ? 'text-vermilion' : 'text-success')}>
                {check.problems.length ? <CircleAlert className="size-4" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
                {check.problems.length
                  ? `${check.problems.length} ${check.problems.length === 1 ? 'problem' : 'problems'} in ${file.name}. Fix them and choose the file again; nothing was created.`
                  : `${check.rows.length} ${check.rows.length === 1 ? 'product' : 'products'} ready in ${file.name}.`}
              </p>
              {check.problems.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {check.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              {taken.length > 0 && (
                <ul role="alert" className="mt-2 list-disc pl-5 text-sm font-medium text-vermilion">
                  {taken.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              {check.rows.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="text-graphite">
                      <tr>
                        <th className="py-1 pr-2 font-medium">Line</th>
                        <th className="py-1 pr-2 font-medium">Name</th>
                        <th className="py-1 pr-2 font-medium">Brand, category</th>
                        <th className="py-1 pr-2 font-medium">Sizes</th>
                        <th className="py-1 font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {check.rows.map((r) => {
                        const res = results?.find((x) => x.line === r.line);
                        return (
                          <tr key={r.line} className={cx('border-t border-stone', r.problems.length > 0 && 'text-vermilion')}>
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
                            <td className="py-1.5 pr-2">{[r.body.brandSlug, r.body.categorySlug].filter(Boolean).join(', ') || '–'}</td>
                            <td className="py-1.5 pr-2">{r.body.variants.map((v) => v.size).join(', ') || '–'}</td>
                            <td className="tabular py-1.5">{r.body.variants[0] ? formatUsd(r.body.variants[0].priceCents) : '–'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm" disabled={!ok || busy || results !== null} loading={busy} onClick={() => void create(check.rows)}>
                  Create {check.rows.length} {check.rows.length === 1 ? 'product' : 'products'} as drafts
                </Button>
                {results && !busy && (
                  <span className="text-sm font-semibold">
                    {created} created
                    {results.length > created && <span className="text-vermilion">, {results.length - created} failed (see the lines above)</span>}
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
