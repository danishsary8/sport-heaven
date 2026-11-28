import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { apiFetch, isApiError } from '../../../lib/api';
import { formatUsd } from '../../../lib/i18n';
import { Button, EmptyState, ErrorState, Field, QueryView, Select, Skeleton, TextArea, cx, useToast } from '../../../ui';
import { AdminOnly } from '../AdminLayout';
import { patch, post, put, useAdminMutation, useAdminQuery } from '../api';
import type { AdminProduct, AdminProductListRow, AdminVariant, Brand, Category, CsvImportResult } from '../types';
import { toNinety } from './price';
import { ProductsTable } from './ProductsTable';
import { ProductImport } from './ProductImport';
import { PhotoManager, tilesOf, type PhotoTile } from './PhotoManager';
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

/** Sub-type filters the admin list understands (one at a time, within a category). */
const SUBTYPE_KEYS = ['league', 'continent', 'season', 'kitType', 'surface', 'garmentType'] as const;
interface SubtypeGroup {
  key: (typeof SUBTYPE_KEYS)[number];
  title: string;
  options: { value: string; label: string; count: number }[];
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
  // The one sub-type filter in the URL, if any (league, continent, season, kit, surface or garment type).
  const subtype = SUBTYPE_KEYS.map((k) => [k, params.get(k)] as const).find(([, v]) => v);
  const filters = {
    q: params.get('q') ?? undefined,
    status: params.get('status') ?? undefined,
    category: params.get('category') ?? undefined,
    ...(subtype ? { [subtype[0]]: subtype[1]! } : {}),
  };
  const query = { ...filters, page: Number(params.get('page') ?? 1), pageSize: 50 };
  const subtypes = useAdminQuery<{ groups: SubtypeGroup[] }>(['product-subtypes', filters.category ?? ''], '/v1/admin/products/subtypes', { category: filters.category }, { enabled: !!filters.category });
  const list = useAdminQuery<{ products: AdminProductListRow[]; total: number; page: number; pageSize: number }>(['products'], '/v1/admin/products', query, { keepPrevious: true });
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    n.delete('page');
    // A sub-type belongs to its category, and only one is used at a time.
    if (k === 'category' || k === 'subtype') for (const key of SUBTYPE_KEYS) n.delete(key);
    if (k === 'subtype') {
      const at = v.indexOf('=');
      if (at > 0) n.set(v.slice(0, at), v.slice(at + 1));
    } else if (v) n.set(k, v);
    else n.delete(k);
    setParams(n);
  };

  // Live search: the list follows the box a moment after typing stops (Enter still searches at once).
  useEffect(() => {
    if (q.trim() === (params.get('q') ?? '')) return;
    const id = window.setTimeout(() => set('q', q.trim()), 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Exports follow the search, status, category and type filters. "products" uses the new-product import columns.
  const exportCsv = async (format: 'prices' | 'products') => {
    try {
      const text = await apiFetch<string>('/v1/admin/products/export.csv', { as: 'text', query: { ...filters, format } });
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `sport-heaven-${format}-${new Date().toISOString().slice(0, 10)}.csv`;
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
          <Button variant="secondary" onClick={() => void exportCsv('products')} title="Every product in the list below, in the same columns as the import">
            Export products (CSV)
          </Button>
          <Button variant="secondary" onClick={() => void exportCsv('prices')} title="One row per size of the products in the list below, for updating prices">
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
          <span>
            Import from a spreadsheet
            <span className="block text-sm font-normal text-graphite">Add or update many products, photos or prices at once</span>
          </span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-4 flex flex-col gap-5 divide-y divide-dashed divide-[#C9C5BB]">
          <ProductImport />
          <div className="pt-5">
            <CsvImport />
          </div>
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
            placeholder="Search by name or web address"
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
        {filters.category && (subtypes.data?.groups?.length ?? 0) > 0 && (
          <>
            <label className="sr-only" htmlFor="product-subtype">
              Type
            </label>
            <select
              id="product-subtype"
              value={subtype ? `${subtype[0]}=${subtype[1]}` : ''}
              onChange={(e) => set('subtype', e.target.value)}
              className={cx('h-11 max-w-[15rem] rounded-full border bg-paper px-4 text-[15px]', subtype ? 'border-obsidian font-semibold' : 'border-[#C9C5BB]')}
            >
              <option value="">All types</option>
              {subtypes.data!.groups.map((g) => (
                <optgroup key={g.key} label={g.title}>
                  {g.options.map((o) => (
                    <option key={o.value} value={`${g.key}=${o.value}`}>
                      {o.label} ({o.count})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </>
        )}
      </div>

      <QueryView query={list} skeleton={<Skeleton className="h-80 w-full rounded-[14px]" />} isEmpty={(d) => d.products.length === 0} empty={<EmptyState title="No products match" body="Clear the search or pick another status." />}>
        {(d) => (
          <div className={cx('flex flex-col gap-3 transition-opacity', list.isPlaceholderData && 'opacity-60')}>
            <p className="text-sm text-graphite">
              {d.total} {d.total === 1 ? 'product' : 'products'}
            </p>
            <ProductsTable key={JSON.stringify(query)} products={d.products} />
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
        <span className="font-semibold">Update prices from a CSV file</span>
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
        {(d) => <ProductEditor key={d.product.id} product={d.product} />}
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
  const [photos, setPhotos] = useState(() => tilesOf(product));
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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-6">
      <form onSubmit={submit} noValidate className="grid gap-4 rounded-[16px] border border-stone p-5 md:grid-cols-2">
        <h2 className="font-display text-[28px] font-bold leading-none md:col-span-2">Details</h2>
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

      <PhotoManager product={product} tiles={photos} onChange={setPhotos} />
      <section aria-labelledby="sizes-h" className="rounded-[16px] border border-stone p-5">
        <h2 id="sizes-h" className="mb-3 font-display text-[28px] font-bold leading-none">
          Sizes and prices
        </h2>
        <AllSizesPrice productId={product.id} sizes={product.variants.length} />
        <ul className="divide-y divide-stone rounded-[8px] border border-stone">
          {[...product.variants]
            .sort((a, b) => a.sizeSort - b.sizeSort)
            .map((v) => (
              // Keyed on the price too, so a row shows the new price after "Apply to all sizes".
              <VariantRow key={`${v.id}:${v.priceCents}:${v.compareAtCents}`} productId={product.id} v={v} color={colorName(v.colorId)} />
            ))}
        </ul>
      </section>

      </div>
      <ShopPreview name={f.nameEn || product.nameI18n.en} status={f.status} photos={photos} fromCents={Math.min(...product.variants.map((v) => v.priceCents))} />
      </div>
    </AdminPage>
  );
}

/** The product as the shop card shows it, live: point at the photo to see the hover pose. */
function ShopPreview({ name, status, photos, fromCents }: { name: string; status: AdminProduct['status']; photos: PhotoTile[]; fromCents: number }) {
  const [main, hover] = photos;
  return (
    <section aria-label="Shop preview" className="h-fit rounded-[16px] bg-chalk p-5 xl:sticky xl:top-6">
      <p className="mb-3 flex items-center justify-between text-sm font-semibold text-graphite">
        Shop preview
        <span className={cx('rounded-full px-2.5 py-0.5 text-xs', status === 'active' ? 'bg-success/10 text-success' : 'bg-stone text-graphite')}>{status === 'active' ? 'Visible in the shop' : 'Hidden from the shop'}</span>
      </p>
      <div className="group stage relative aspect-[3/4] overflow-hidden rounded-[12px]">
        {main?.url ? <img src={main.url} alt="" className={cx('absolute inset-0 size-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.035]', hover?.url && 'group-hover:opacity-0')} /> : null}
        {hover?.url && <img src={hover.url} alt="" className="absolute inset-0 size-full scale-[1.02] object-cover opacity-0 transition-[opacity,transform] duration-500 group-hover:scale-100 group-hover:opacity-100" />}
        {!main && <span className="absolute inset-0 grid place-items-center text-sm text-graphite">No photo yet</span>}
      </div>
      <p className="mt-3 line-clamp-2 text-[15px] font-medium leading-snug">{name}</p>
      {Number.isFinite(fromCents) && <p className="tabular mt-1 font-semibold">{formatUsd(fromCents)}</p>}
      <p className="mt-3 text-xs text-graphite">{hover ? 'Point at the photo to see the second pose.' : 'Add a second photo for the hover pose.'}</p>
    </section>
  );
}

/** One price (and optional "was" price) for every size at once. Sizes can still be changed one by one below. */
function AllSizesPrice({ productId, sizes }: { productId: string; sizes: number }) {
  const toast = useToast();
  const [price, setPrice] = useState('');
  const [compare, setCompare] = useState('');
  const save = useAdminMutation((body: unknown) => put(`/v1/admin/products/${productId}/prices`, body), [['product', productId], ['products']]);
  const submit = () => {
    const typed = toCents(price);
    if (typed === null) return toast.error('Enter the price like 95.00');
    // Prices end in .90: the price that will really be saved.
    const p = toNinety(typed);
    const c = compare.trim() ? toCents(compare) : null;
    if (compare.trim() && c === null) return toast.error('Enter the "was" price like 120.00, or leave it empty');
    if (c !== null && c <= p) return toast.error('The "was" price must be higher than the price');
    save.mutate(
      { priceCents: p, compareAtCents: c },
      {
        onSuccess: () => {
          toast.success(`Price set for all ${sizes} ${sizes === 1 ? 'size' : 'sizes'}`);
          setPrice('');
          setCompare('');
        },
        onError: (e) => toast.error(isApiError(e) ? e.message : 'Something went wrong.'),
      },
    );
  };
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[8px] bg-chalk p-3">
      <span className="min-w-[120px] pb-2 text-sm font-semibold">Same price for all sizes</span>
      <Field label="Price for all sizes" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="w-28" />
      <Field label="Was, for all sizes (optional)" value={compare} onChange={(e) => setCompare(e.target.value)} inputMode="decimal" className="w-36" />
      <Button size="sm" variant="primary" loading={save.isPending} onClick={submit} className="mb-1">
        Apply to all sizes
      </Button>
    </div>
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
    const typed = toCents(price);
    if (typed === null) return toast.error('Enter the price like 95.00');
    // Prices end in .90: the price that will really be saved.
    const p = toNinety(typed);
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
    const typedPrice = toCents(f.price);
    const price = typedPrice === null ? null : toNinety(typedPrice);
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
