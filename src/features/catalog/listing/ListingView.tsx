import { SlidersHorizontal, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useI18n, type DictKey } from '../../../lib/i18n';
import { Button, EmptyState, ErrorState, QueryView, Sheet, cx } from '../../../ui';
import { isApiError } from '../../../lib/api';
import { useFilters, useProducts, type Facet, type ListingQuery } from '../api';
import { ProductCard, ProductCardSkeleton } from '../ProductCard';
import { FilterPanel } from './FilterPanel';
import { clearFilters, hasFilters, queryFromSearch, setPrice, toggleValue } from './params';

const SORTS = ['popular', 'new', 'price_asc', 'price_desc', 'discount'] as const;

export function GridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
      {Array.from({ length: n }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * A product listing: heading, filters (sidebar on desktop, sheet on phones) and sort kept in the URL,
 * the grid, and "Load more" with the page number in the URL so Back returns to the same place.
 */
export function ListingView({
  title,
  intro,
  base,
  hidden = [],
  path = '/v1/catalog/products',
  emptyAction,
}: {
  title: ReactNode;
  intro?: ReactNode;
  /** Fixed by the route (category, brand, collection); never shown as removable filters. */
  base: ListingQuery;
  hidden?: string[];
  path?: '/v1/catalog/products' | '/v1/search';
  emptyAction?: ReactNode;
}) {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const fromUrl = queryFromSearch(params);
  const query: ListingQuery = { ...fromUrl, ...base };
  const queryKey = JSON.stringify(query);

  const urlPage = Number(params.get('page') ?? 1) || 1;
  const [initial, setInitial] = useState({ key: queryKey, pages: urlPage });
  if (initial.key !== queryKey) setInitial({ key: queryKey, pages: 1 });

  const products = useProducts(query, initial.key === queryKey ? initial.pages : 1, path);
  const { sort: _sort, ...facetQuery } = query;
  void _sort;
  const filters = useFilters(facetQuery);
  const [sheetOpen, setSheetOpen] = useState(false);

  const total = products.data?.pages[0]?.total;
  const items = products.data?.pages.flatMap((p) => p.products) ?? [];
  const facets = filters.data?.facets ?? [];
  const fixed = Object.keys(base);
  const filtered = hasFilters(params, fixed);

  const loadMore = async () => {
    const result = await products.fetchNextPage();
    const loaded = result.data?.pages.reduce((n, p) => n + p.products.length, 0) ?? 0;
    const next = new URLSearchParams(params);
    next.set('page', String(Math.ceil(loaded / 24)));
    setParams(next, { replace: true, preventScrollReset: true });
  };

  return (
    <section className="mx-auto max-w-[1320px] px-4 pb-16 pt-6 lg:px-8 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="font-display text-4xl font-bold leading-none lg:text-5xl">{title}</h1>
          {intro && <div className="mt-2 max-w-prose text-graphite">{intro}</div>}
        </div>
        {total != null && <p className="text-graphite tabular">{total === 1 ? t('listing.countOne') : t('listing.count', { n: total })}</p>}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-stone pb-4">
        <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setSheetOpen(true)}>
          <SlidersHorizontal className="size-4" aria-hidden />
          {t('listing.filter')}
        </Button>
        <ActiveChips facets={facets} params={params} fixed={fixed} onChange={(n) => setParams(n, { preventScrollReset: true })} />
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-graphite">{t('listing.sort')}</span>
          <select
            className="h-9 rounded-[6px] border border-[#C9C5BB] bg-paper px-2 text-sm font-semibold"
            value={params.get('sort') ?? 'popular'}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.delete('page');
              if (e.target.value === 'popular') next.delete('sort');
              else next.set('sort', e.target.value);
              setParams(next, { preventScrollReset: true });
            }}
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`listing.sort.${s}` as DictKey)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside aria-label={t('listing.filters')} className="hidden lg:block">
          <h2 className="sr-only">{t('listing.filters')}</h2>
          <FilterPanel facets={facets} hidden={['category', ...hidden]} />
          {filtered && (
            <Button variant="ghost" size="sm" className="mt-2 -ml-3" onClick={() => setParams(clearFilters(params))}>
              {t('listing.clear')}
            </Button>
          )}
        </aside>

        <div className={cx('min-w-0 transition-opacity', products.isPlaceholderData && 'opacity-60')}>
          <QueryView
            query={products}
            skeleton={<GridSkeleton />}
            isEmpty={(d) => d.pages[0]?.products.length === 0}
            empty={
              <EmptyState
                title={t('listing.empty')}
                body={t('listing.emptyBody')}
                action={
                  filtered ? (
                    <Button variant="primary" onClick={() => setParams(clearFilters(params))}>
                      {t('listing.clear')}
                    </Button>
                  ) : (
                    emptyAction
                  )
                }
              />
            }
          >
            {() => (
              <>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-3 lg:gap-x-5 xl:grid-cols-4">
                  {items.map((p, i) => (
                    <li key={p.id}>
                      <ProductCard product={p} priority={i < 4} />
                    </li>
                  ))}
                </ul>
                <div className="mt-10 flex flex-col items-center gap-3">
                  {total != null && <p className="text-sm text-graphite tabular">{t('listing.shown', { shown: items.length, total })}</p>}
                  {products.isFetchNextPageError && <ErrorState message={isApiError(products.error) ? products.error.message : undefined} onRetry={() => void loadMore()} />}
                  {products.hasNextPage && (
                    <Button variant="secondary" loading={products.isFetchingNextPage} onClick={() => void loadMore()}>
                      {t('listing.loadMore')}
                    </Button>
                  )}
                </div>
              </>
            )}
          </QueryView>
        </div>
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        side="bottom"
        title={t('listing.filters')}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setParams(clearFilters(params), { preventScrollReset: true })} disabled={!filtered}>
              {t('listing.clear')}
            </Button>
            <Button variant="primary" className="flex-[2]" onClick={() => setSheetOpen(false)}>
              {t('listing.showResults', { n: filters.data?.total ?? total ?? 0 })}
            </Button>
          </div>
        }
      >
        <FilterPanel facets={facets} hidden={['category', ...hidden]} />
      </Sheet>
    </section>
  );
}

function ActiveChips({ facets, params, fixed, onChange }: { facets: Facet[]; params: URLSearchParams; fixed: string[]; onChange(next: URLSearchParams): void }) {
  const { t } = useI18n();
  const chips: { key: string; label: string; next: URLSearchParams }[] = [];
  for (const facet of facets) {
    if (fixed.includes(facet.key)) continue;
    if (facet.type === 'range') {
      if (params.get('priceMin') || params.get('priceMax')) {
        const b = facet.range?.buckets.find((x) => String(x.min) === (params.get('priceMin') ?? '0'));
        chips.push({ key: 'price', label: b?.label ?? facet.label, next: setPrice(params, null, null) });
      }
      continue;
    }
    for (const value of params.getAll(facet.key)) {
      const opt = facet.options?.find((o) => o.value === value);
      chips.push({ key: `${facet.key}:${value}`, label: opt?.label ?? value, next: toggleValue(params, facet.key, value, true) });
    }
  }
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <li key={c.key}>
          <button
            type="button"
            onClick={() => onChange(c.next)}
            aria-label={t('listing.removeFilter', { label: c.label })}
            className="inline-flex h-9 items-center gap-1 rounded-full bg-stone px-3 text-sm font-medium hover:bg-[#DDD9CF]"
          >
            {c.label}
            <X className="size-3.5" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
