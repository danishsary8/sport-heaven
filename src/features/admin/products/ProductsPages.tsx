import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { apiFetch, isApiError } from '../../../lib/api';
import { formatUsd } from '../../../lib/i18n';
import { Button, EmptyState, ErrorState, Field, QueryView, Select, Skeleton, TextArea, cx, useToast } from '../../../ui';
import { AdminOnly } from '../AdminLayout';
import { patch, post, put, useAdminMutation, useAdminQuery } from '../api';
import type { AdminProduct, AdminProductListRow, AdminVariant, Brand, Category, CsvImportResult } from '../types';
import { ProductsTable } from './ProductsTable';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { AdminPage, Pager, human } from '../ui';

/** "120" / "120.5" → 12050; null when not a price. */
export function toCents(v: string): number | null {
  const t = v.trim().replace(/^\$/, '');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}
const dollars = (c: number | null | undefined) => (c == null ? '' : (c / 100).toFixed(2));

export function ProductsPage() {
  return (
    <AdminOnly>
      <ProductsList />
    </AdminOnly>
  );
}

const STATUS_TABS = [
  ['', 'All'],
  ['active', 'Active'],
  ['draft', 'Draft'],
  ['archived', 'Archived'],
] as const;

function ProductsList() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const categories = useAdminQuery<{ categories: Category[] }>(['categories'], '/v1/admin/categories');
  const query = { q: params.get('q') ?? undefined, status: params.get('status') ?? undefined, category: params.get('category') ?? undefined, page: Number(params.get('page') ?? 1), pageSize: 50 };
  const list = useAdminQuery<{ products: AdminProductListRow[]; total: number; page: number; pageSize: number }>(['products'], '/v1/admin/products', query, { keepPrevious: true });
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    n.delete('page');
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n);
  };

  const exportCsv = async () => {
    try {
      const text = await apiFetch<string>('/v1/admin/products/export.csv', { as: 'text' });
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `sport-heaven-prices-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error(isApiError(e) ? e.message : 'The export failed.');
    }
  };

  return (
    <AdminPage
      title="Products"
      description="Tick products to change many at once. Click one to edit its details, sizes and photos."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void exportCsv()}>
            Export prices (CSV)
          </Button>
          <Link to="/admin/products/new" className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-obsidian px-5 font-semibold text-paper transition-colors hover:bg-[#2A2E31]">
            <Plus className="size-4" aria-hidden />
            New product
          </Link>
        </div>
      }
    >
      <details className="group rounded-[14px] border border-dashed border-[#C9C5BB] p-4 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
          Import from a spreadsheet
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <CsvImport />
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <form
          role="search"
          className="relative min-w-[240px] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            set('q', q.trim());
          }}
        >
          <label htmlFor="product-search" className="sr-only">
            Search products
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-graphite" aria-hidden />
          <input
            id="product-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or web address, then press Enter"
            className="h-11 w-full rounded-full border border-[#C9C5BB] bg-paper pl-10 pr-4 text-[15px] transition-colors focus:border-obsidian"
          />
        </form>
        <div role="radiogroup" aria-label="Status" className="inline-flex rounded-full bg-stone p-1">
          {STATUS_TABS.map(([value, label]) => {
            const on = (params.get('status') ?? '') === value;
            return (
              <label key={value} className={cx('cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-obsidian', on ? 'bg-paper shadow-[0_1px_3px_rgb(14_17_19/0.15)]' : 'text-graphite hover:text-obsidian')}>
                <input type="radio" name="status" className="sr-only" checked={on} onChange={() => set('status', value)} />
                {label}
              </label>
            );
          })}
        </div>
        <label className="sr-only" htmlFor="product-category">
          Category
        </label>
        <select id="product-category" value={params.get('category') ?? ''} onChange={(e) => set('category', e.target.value)} className="h-11 rounded-full border border-[#C9C5BB] bg-paper px-4 text-[15px]">
          <option value="">All categories</option>
          {(categories.data?.categories ?? []).map((c) => (
            <option key={c.id} value={c.slug}>
              {c.nameI18n.en}
            </option>
          ))}
        </select>
      </div>

      <QueryView query={list} skeleton={<Skeleton className="h-80 w-full rounded-[14px]" />} isEmpty={(d) => d.products.length === 0} empty={<EmptyState title="No products match" body="Clear the search or pick another status." />}>
        {(d) => (
          <div className={cx('flex flex-col gap-3 transition-opacity', list.isPlaceholderData && 'opacity-60')}>
            <p className="text-sm text-graphite">
              {d.total} {d.total === 1 ? 'product' : 'products'}
            </p>
            <ProductsTable products={d.products} />
            <Pager page={d.page} pageSize={d.pageSize} total={d.total} onPage={(p) => set('page', String(p))} />
          </div>
        )}
      </QueryView>
    </AdminPage>
  );
}

/** Upload → preview (nothing changes) → apply. The server refuses the whole file if any row is wrong. */
function CsvImport() {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const send = useAdminMutation(({ text, apply }: { text: string; apply: boolean }) => apiFetch<CsvImportResult>('/v1/admin/products/import', { method: 'POST', query: { apply: String(apply) }, text, headers: { 'content-type': 'text/csv' } }), [['products']]);
  const reset = () => {
    setCsv(null);
    setPreview(null);
    if (input.current) input.current.value = '';
  };
  return (
    <div className="rounded-[8px] border border-dashed border-[#C9C5BB] p-3">
      <label className="flex flex-wrap items-center gap-3 text-[15px]">
        <span className="font-semibold">Import prices from a CSV file</span>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="text-sm"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            setCsv(text);
            setError(null);
            send.mutate({ text, apply: false }, { onSuccess: (r) => setPreview(r), onError: (er) => setError(isApiError(er) ? er.message : 'The file could not be read.') })
          }}
        />
      </label>
      <p className="mt-1 text-sm text-graphite">Use the exported file. Only price, compare-at price and on/off for existing sizes change.</p>
      {error && <ErrorState message={error} className="mt-3" />}
      {preview && csv && (
        <section aria-label="Import preview" className="mt-3">
          {preview.errors && preview.errors.length > 0 ? (
            <>
              <p className="font-semibold text-vermilion">Fix these rows, then upload again. Nothing was changed.</p>
              <ul className="mt-1 text-sm">
                {preview.errors.map((er, i) => (
                  <li key={i}>
                    Line {er.line}: {er.message}
                  </li>
                ))}
              </ul>
            </>
          ) : preview.changes.length === 0 ? (
            <p>No price changes in this file.</p>
          ) : (
            <>
              <table className="w-full text-left text-sm">
                <thead className="text-graphite">
                  <tr>
                    <th className="py-1 pr-2 font-medium">SKU</th>
                    <th className="py-1 pr-2 font-medium">Field</th>
                    <th className="py-1 pr-2 font-medium">From</th>
                    <th className="py-1 font-medium">To</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.changes.map((c, i) => (
                    <tr key={i} className="border-t border-stone">
                      <td className="py-1 pr-2 font-mono text-xs">{c.sku}</td>
                      <td className="py-1 pr-2">{human(c.field)}</td>
                      <td className="py-1 pr-2">{String(c.from ?? '')}</td>
                      <td className="py-1 font-semibold">{String(c.to ?? '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="primary"
                  loading={send.isPending}
                  onClick={() => send.mutate({ text: csv, apply: true }, { onSuccess: () => (toast.success('Prices updated'), reset()), onError: (er) => setError(isApiError(er) ? er.message : 'Something went wrong.') })}
                >
                  Apply {preview.changes.length} {preview.changes.length === 1 ? 'change' : 'changes'}
                </Button>
                <Button variant="ghost" onClick={reset}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export function ProductEditPage() {
  const { id = '' } = useParams();
  const product = useAdminQuery<{ product: AdminProduct }>(['product', id], `/v1/admin/products/${id}`);
  return (
    <AdminOnly>
      <QueryView query={product} skeleton={<Skeleton className="h-96 w-full" />}>
        {(d) => <ProductEditor key={d.product.updatedAt} product={d.product} />}
      </QueryView>
    </AdminOnly>
  );
}

function ProductEditor({ product }: { product: AdminProduct }) {
  const toast = useToast();
  const initial = {
    nameEn: product.nameI18n.en,
    nameKm: product.nameI18n.km ?? '',
    descEn: product.descriptionI18n?.en ?? '',
    descKm: product.descriptionI18n?.km ?? '',
    status: product.status,
    isCustomizable: product.isCustomizable,
    highlights: product.highlights.join('\n'),
  };
  const [f, setF] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const save = useAdminMutation((body: unknown) => patch(`/v1/admin/products/${product.id}`, body), [['product', product.id], ['products']]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.nameEn.trim()) return setError('The English name is required.');
    const body: Record<string, unknown> = {};
    if (f.nameEn !== initial.nameEn || f.nameKm !== initial.nameKm) body.name = { en: f.nameEn.trim(), ...(f.nameKm.trim() ? { km: f.nameKm.trim() } : {}) };
    if (f.descEn !== initial.descEn || f.descKm !== initial.descKm) body.description = f.descEn.trim() ? { en: f.descEn.trim(), ...(f.descKm.trim() ? { km: f.descKm.trim() } : {}) } : null;
    if (f.status !== initial.status) body.status = f.status;
    if (f.isCustomizable !== initial.isCustomizable) body.isCustomizable = f.isCustomizable;
    if (f.highlights !== initial.highlights) body.highlights = f.highlights.split('\n').map((l) => l.trim()).filter(Boolean);
    if (Object.keys(body).length === 0) return toast.success('Nothing to save');
    setError(null);
    save.mutate(body, { onSuccess: () => toast.success('Product saved'), onError: (er) => setError(isApiError(er) ? er.message : 'Something went wrong.') });
  };

  const colorName = (id: string) => product.colors.find((c) => c.id === id)?.name ?? '';
  return (
    <AdminPage
      title={product.nameI18n.en}
      actions={
        <div className="flex gap-3 text-[15px] font-semibold">
          <a href={`/p/${product.slug}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">
            View in shop
          </a>
          <Link to="/admin/products" className="underline underline-offset-4">
            All products
          </Link>
        </div>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4 md:grid-cols-2">
        <Field label="Name (English)" value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value })} maxLength={500} />
        <Field label="Name (Khmer)" value={f.nameKm} onChange={(e) => setF({ ...f, nameKm: e.target.value })} maxLength={500} />
        <TextArea label="Description (English)" value={f.descEn} onChange={(e) => setF({ ...f, descEn: e.target.value })} maxLength={500} />
        <TextArea label="Description (Khmer)" value={f.descKm} onChange={(e) => setF({ ...f, descKm: e.target.value })} maxLength={500} />
        <TextArea label="Highlights (one per line)" value={f.highlights} onChange={(e) => setF({ ...f, highlights: e.target.value })} />
        <div className="flex flex-col gap-4">
          <Select label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as AdminProduct['status'] })} hint="Only active products show in the shop.">
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Select>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="size-5 accent-obsidian" checked={f.isCustomizable} onChange={(e) => setF({ ...f, isCustomizable: e.target.checked })} />
            Name and number printing
          </label>
        </div>
        {error && <ErrorState message={error} className="md:col-span-2" />}
        <Button type="submit" variant="primary" loading={save.isPending} className="md:col-span-2 md:justify-self-start">
          Save product
        </Button>
      </form>

      <section aria-labelledby="sizes-h">
        <h2 id="sizes-h" className="mb-2 text-lg font-semibold">
          Sizes and prices
        </h2>
        <ul className="divide-y divide-stone rounded-[8px] border border-stone">
          {[...product.variants]
            .sort((a, b) => a.sizeSort - b.sizeSort)
            .map((v) => (
              <VariantRow key={v.id} productId={product.id} v={v} color={colorName(v.colorId)} />
            ))}
        </ul>
      </section>

      <section aria-labelledby="photos-h">
        <h2 id="photos-h" className="mb-2 text-lg font-semibold">
          Photos
        </h2>
        <ul className="flex flex-wrap gap-3">
          {product.images.map((img) => (
            <li key={img.id} className="w-28 text-xs">
              <img src={`/assets/${img.path}`} alt={img.alt ?? ''} className="aspect-[3/4] w-full rounded bg-stone object-cover" />
              <span className="mt-1 block truncate text-graphite">{colorName(img.colorId ?? '') || 'All colours'}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-graphite">Photos are uploaded with the image script and linked here by a developer (OWNER-TODO).</p>
      </section>
    </AdminPage>
  );
}

function VariantRow({ productId, v, color }: { productId: string; v: AdminVariant; color: string }) {
  const toast = useToast();
  const [price, setPrice] = useState(dollars(v.priceCents));
  const [compare, setCompare] = useState(dollars(v.compareAtCents));
  const [active, setActive] = useState(v.status === 'active');
  const save = useAdminMutation((body: unknown) => put(`/v1/admin/products/${productId}/variants/${v.id}`, body), [['product', productId]]);
  const submit = () => {
    const body: Record<string, unknown> = {};
    const p = toCents(price);
    if (p === null) return toast.error('Enter the price like 95.00');
    if (p !== v.priceCents) body.priceCents = p;
    const c = compare.trim() ? toCents(compare) : null;
    if (compare.trim() && c === null) return toast.error('Enter the compare-at price like 120.00, or leave it empty');
    if (c !== v.compareAtCents) body.compareAtCents = c;
    if (active !== (v.status === 'active')) body.status = active ? 'active' : 'inactive';
    if (Object.keys(body).length === 0) return;
    save.mutate(body, { onSuccess: () => toast.success(`Saved ${v.sizeLabel}`), onError: (e) => toast.error(isApiError(e) ? e.message : 'Something went wrong.') });
  };
  return (
    <li aria-label={`${v.sizeLabel} ${v.sku}`} className="flex flex-wrap items-end gap-3 p-3">
      <span className="min-w-[120px]">
        <span className="block font-semibold">{v.sizeLabel}</span>
        <span className="block text-sm text-graphite">{color}</span>
        <span className="block font-mono text-xs text-graphite">{v.sku}</span>
      </span>
      <Field label={`Price ${v.sizeLabel}`} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="w-28" />
      <Field label="Was (optional)" value={compare} onChange={(e) => setCompare(e.target.value)} inputMode="decimal" className="w-28" />
      <label className="flex h-11 items-center gap-2 text-sm">
        <input type="checkbox" className="size-5 accent-obsidian" checked={active} onChange={(e) => setActive(e.target.checked)} />
        On sale
      </label>
      <Button size="sm" variant="secondary" aria-label={`Save ${v.sizeLabel}`} loading={save.isPending} onClick={submit} className="mb-1">
        Save
      </Button>
      <span className="mb-2 text-sm text-graphite">{formatUsd(v.priceCents)} now</span>
    </li>
  );
}

export function NewProductPage() {
  const navigate = useNavigate();
  const brands = useAdminQuery<{ brands: Brand[] }>(['brands'], '/v1/admin/brands');
  const categories = useAdminQuery<{ categories: Category[] }>(['categories'], '/v1/admin/categories');
  const [f, setF] = useState({ name: '', slug: '', brand: '', category: '', color: '', hex: '', sizes: '', price: '' });
  const [error, setError] = useState<string | null>(null);
  const create = useAdminMutation((body: unknown) => post<{ product: AdminProduct }>('/v1/admin/products', body), [['products']]);
  const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const sizes = f.sizes.split(',').map((s) => s.trim()).filter(Boolean);
    const price = toCents(f.price);
    const slug = f.slug.trim() || slugify(f.name);
    if (!f.name.trim() || !slug || !f.brand || !f.category || !f.color.trim() || sizes.length === 0 || price === null) return setError('Fill in every field. Enter the price like 120 or 120.50.');
    if (f.hex && !/^#[0-9a-fA-F]{6}$/.test(f.hex)) return setError('Write the colour code like #D81E2B, or leave it empty.');
    setError(null);
    create.mutate(
      {
        slug,
        brandSlug: f.brand,
        categorySlug: f.category,
        name: { en: f.name.trim() },
        status: 'draft',
        colors: [{ name: f.color.trim(), ...(f.hex ? { swatchHex: f.hex } : {}) }],
        variants: sizes.map((size) => ({ color: f.color.trim(), size, priceCents: price })),
      },
      { onSuccess: (r) => void navigate(`/admin/products/${r.product.id}`), onError: (er) => setError(isApiError(er) ? er.message : 'Something went wrong.') },
    );
  };
  return (
    <AdminOnly>
      <AdminPage title="New product">
        <p className="text-graphite">New products start as drafts. Add photos and details, then set the status to active.</p>
        <form onSubmit={submit} noValidate className="grid max-w-3xl gap-4 md:grid-cols-2">
          <Field label="Name (English)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: f.slug || '' })} />
          <Field label="Web address" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder={slugify(f.name) || 'copa-pure-fg'} hint="Lowercase letters, numbers and dashes. Leave empty to use the name." />
          <Select label="Brand" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })}>
            <option value="">Choose</option>
            {(brands.data?.brands ?? []).map((b) => (
              <option key={b.id} value={b.slug}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select label="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            <option value="">Choose</option>
            {(categories.data?.categories ?? []).map((c) => (
              <option key={c.id} value={c.slug}>
                {c.nameI18n.en}
              </option>
            ))}
          </Select>
          <Field label="Colour" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} />
          <Field label="Colour code (optional)" value={f.hex} onChange={(e) => setF({ ...f, hex: e.target.value })} placeholder="#D81E2B" />
          <Field label="Sizes (comma separated)" value={f.sizes} onChange={(e) => setF({ ...f, sizes: e.target.value })} placeholder="EU 40, EU 41, EU 42" />
          <Field label="Price (USD)" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} inputMode="decimal" />
          {error && <ErrorState message={error} className="md:col-span-2" />}
          <Button type="submit" variant="primary" loading={create.isPending} className="md:col-span-2 md:justify-self-start">
            Create product
          </Button>
        </form>
      </AdminPage>
    </AdminOnly>
  );
}
