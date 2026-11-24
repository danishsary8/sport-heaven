import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { COLLECTION_BY_SLUG } from '../data/editorial';
import { useStore } from '../context/StoreContext';
import type { SortOption } from '../types/store';
import {
  CATEGORY_COLLECTION_SLUG,
  applyShopQuery,
  categoryFromCollectionSlug,
  changeCategory,
  clearAllFilters,
  countActiveFilters,
  emptyShopQuery,
  getActiveChips,
  isCategoryCollection,
  parseShopParams,
  presetToShopQuery,
  serializeShopParams,
  SORT_OPTIONS,
  type ShopCategory,
  type ShopQuery,
} from '../lib/shop-filters';
import { KitProductCard, ProductCard } from '../components/product';
import { parseHashToRoute } from '../utils/router';
import { FilterPanel } from '../components/shop/FilterPanel';
import { FilterSheet } from '../components/shop/FilterSheet';

interface ShopPageProps {
  collectionSlug?: string;
}

const PAGE_SIZE = 24;

const CATEGORY_TABS: Array<{ id: ShopCategory; label: string }> = [
  { id: 'jerseys', label: 'Jerseys' },
  { id: 'boots', label: 'Boots' },
  { id: 'f1', label: 'F1' },
  { id: 'balls', label: 'Balls' },
  { id: 'essentials', label: 'Gear' },
  { id: 'all', label: 'All products' },
];

const CATEGORY_TITLES: Record<ShopCategory, string> = {
  all: 'All products',
  jerseys: 'Jerseys & kits',
  boots: 'Football boots',
  f1: 'F1 team wear',
  balls: 'Match balls',
  essentials: 'Goalkeeper & gear',
};

const RESULT_NOUN: Record<ShopCategory, [string, string]> = {
  all: ['product', 'products'],
  jerseys: ['kit', 'kits'],
  boots: ['pair', 'pairs'],
  f1: ['item', 'items'],
  balls: ['ball', 'balls'],
  essentials: ['item', 'items'],
};

export function ShopPage({ collectionSlug = 'all' }: ShopPageProps) {
  const { catalog, route, navigate, updateShopRoute } = useStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Phone Back button closes the filter sheet (see effect below).
  const sheetOpenRef = useRef(false);
  const openedAtHash = useRef('');
  const ignoreNextPop = useRef(false);
  /** URL with the filters picked while the sheet is open. */
  const sheetUrlRef = useRef('');
  const updateRouteRef = useRef(updateShopRoute);
  updateRouteRef.current = updateShopRoute;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const routeParams = route.page === 'shop' ? route.params ?? '' : '';
  const routeSort: SortOption = route.page === 'shop' ? route.sort ?? 'featured' : 'featured';
  const collectionMeta = COLLECTION_BY_SLUG.get(collectionSlug);
  const isEditorial = Boolean(collectionMeta) && !isCategoryCollection(collectionSlug);

  // The URL is the single source of truth for filters.
  const query: ShopQuery = useMemo(() => {
    const aliasCategory = categoryFromCollectionSlug(collectionSlug);
    const base = collectionMeta
      ? presetToShopQuery(collectionMeta.preset)
      : emptyShopQuery(aliasCategory ?? 'all');
    return { ...parseShopParams(routeParams, base), sort: routeSort };
  }, [collectionSlug, collectionMeta, routeParams, routeSort]);

  const results = useMemo(() => applyShopQuery(catalog, query), [catalog, query]);
  const chips = useMemo(() => getActiveChips(catalog, query), [catalog, query]);
  const activeCount = countActiveFilters(query);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: catalog.length };
    for (const p of catalog) counts[p.category] = (counts[p.category] ?? 0) + 1;
    return counts;
  }, [catalog]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [query]);

  const openSheet = () => {
    openedAtHash.current = window.location.hash;
    sheetUrlRef.current = window.location.hash;
    window.history.pushState({ filterSheet: true }, '', window.location.hash);
    sheetOpenRef.current = true;
    setSheetOpen(true);
  };

  /** Closed with X, backdrop, Esc or "Show results": tidy up the history entry we added. */
  const closeSheet = useCallback(() => {
    if (!sheetOpenRef.current) return;
    sheetOpenRef.current = false;
    setSheetOpen(false);
    if (window.history.state?.filterSheet) {
      if (window.location.hash === openedAtHash.current) {
        ignoreNextPop.current = true;
        window.history.back(); // nothing changed: drop the duplicate entry
      } else {
        window.history.replaceState(null, '', window.location.hash); // keep the new filters as a normal step
      }
    }
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const onPop = () => {
      if (ignoreNextPop.current) {
        ignoreNextPop.current = false;
        return;
      }
      if (!sheetOpenRef.current) return;
      // Back pressed while the sheet is open: close it and keep the chosen filters.
      const chosen = sheetUrlRef.current;
      sheetOpenRef.current = false;
      setSheetOpen(false);
      if (chosen && chosen !== window.location.hash) {
        window.history.pushState(null, '', chosen);
        const parsed = parseHashToRoute(chosen);
        if (parsed.page === 'shop') {
          updateRouteRef.current({ collectionSlug: parsed.collectionSlug ?? 'all', params: parsed.params, sort: parsed.sort });
        }
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // Attach once per open: re-attaching on every render would drop the listener mid-event,
    // because the store's own popstate handler re-renders this page before ours runs.
  }, [sheetOpen]);

  const applyQuery = useCallback(
    (next: ShopQuery) => {
      updateShopRoute(
        {
          collectionSlug: CATEGORY_COLLECTION_SLUG[next.category],
          params: serializeShopParams(next),
          sort: next.sort,
        },
        // While the sheet is open, filter changes update its one history entry.
        { replace: sheetOpenRef.current },
      );
      if (sheetOpenRef.current) sheetUrlRef.current = window.location.hash;
    },
    [updateShopRoute],
  );

  const showEditorialHeader = isEditorial && !routeParams;
  const title = showEditorialHeader && collectionMeta ? collectionMeta.title : CATEGORY_TITLES[query.category];
  const [singular, plural] = RESULT_NOUN[query.category];
  const resultLabel = `${results.length} ${results.length === 1 ? singular : plural}`;
  const useKitCards = query.category === 'jerseys' || query.category === 'f1';
  const visibleResults = results.slice(0, visibleCount);

  const sortControl = (
    <label className="flex items-center gap-2 text-sm text-[#5E625B]">
      <span className="hidden sm:inline">Sort by</span>
      <span className="sr-only sm:hidden">Sort by</span>
      <select
        value={query.sort}
        onChange={(e) => applyQuery({ ...query, sort: e.target.value as SortOption })}
        className="h-11 rounded-full border border-[#1B1E1B]/15 bg-white pl-4 pr-9 text-sm font-medium text-[#1B1E1B] focus:border-[#A37B5C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C]/40 cursor-pointer"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="animate-page-enter mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-6 lg:px-10">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-[#5E625B]">
        <button type="button" onClick={() => navigate({ page: 'home' })} className="min-h-11 hover:text-[#1B1E1B] cursor-pointer">
          Home
        </button>
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
        <span aria-current="page" className="text-[#1B1E1B]">{title}</span>
      </nav>

      <header className="mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="max-w-2xl">
          <h1 className="font-display text-5xl font-semibold leading-[0.95] tracking-tight text-[#1B1E1B] sm:text-6xl">
            {title}
          </h1>
          {showEditorialHeader && collectionMeta?.editorialIntro && (
            <p className="mt-3 max-w-[65ch] text-[15px] leading-relaxed text-[#5E625B]">{collectionMeta.editorialIntro}</p>
          )}
        </div>
        <p className="text-sm tabular-nums text-[#5E625B]" aria-live="polite">
          {resultLabel}
        </p>
      </header>

      <nav aria-label="Product categories" className="mt-6 border-b border-[#1B1E1B]/12">
        <ul className="-mb-px flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORY_TABS.map((tab) => {
            const active = query.category === tab.id;
            return (
              <li key={tab.id} className="shrink-0">
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => applyQuery({ ...changeCategory(query, tab.id), sort: query.sort })}
                  className={`flex min-h-12 items-center gap-1.5 border-b-2 text-[15px] font-medium transition-colors cursor-pointer ${
                    active
                      ? 'border-[#A37B5C] text-[#1B1E1B]'
                      : 'border-transparent text-[#5E625B] hover:text-[#1B1E1B]'
                  }`}
                >
                  {tab.label}
                  <span className="text-xs tabular-nums text-[#5E625B]">{categoryCounts[tab.id] ?? 0}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile: sticky filter + sort bar */}
      <div className="sticky top-[var(--header-h,4rem)] z-20 -mx-4 mt-4 flex items-center justify-between gap-3 border-b border-[#1B1E1B]/10 bg-[#FAF9F5]/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={openSheet}
          aria-haspopup="dialog"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-[#1B1E1B]/15 bg-white px-4 text-sm font-semibold text-[#1B1E1B] cursor-pointer"
        >
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          Filter
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#A37B5C] px-1.5 text-[11px] text-white tabular-nums">
              {activeCount}
            </span>
          )}
        </button>
        {sortControl}
      </div>

      <div className="mt-4 lg:mt-8 lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-10">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h,4rem)+1.5rem)] max-h-[calc(100dvh-var(--header-h,4rem)-3rem)] overflow-y-auto pr-2 [scrollbar-width:thin]">
            <div className="flex items-center justify-between pb-2">
              <h2 className="font-display text-2xl font-semibold text-[#1B1E1B]">Filters</h2>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() => applyQuery(clearAllFilters(query))}
                  className="min-h-11 text-sm font-medium text-[#1B1E1B] underline decoration-[#A37B5C] decoration-2 underline-offset-4 hover:text-[#A37B5C] cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
            <FilterPanel products={catalog} query={query} onChange={applyQuery} />
          </div>
        </aside>

        <section aria-label="Results">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <li key={chip.id}>
                  <button
                    type="button"
                    onClick={() => applyQuery(chip.remove(query))}
                    aria-label={`Remove filter: ${chip.label}`}
                    className="inline-flex h-11 items-center gap-1.5 rounded-full bg-[#899283]/20 pl-4 pr-3 text-sm font-medium text-[#1B1E1B] hover:bg-[#899283]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C] cursor-pointer sm:h-9"
                  >
                    {chip.label}
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              {chips.length > 1 && (
                <li>
                  <button
                    type="button"
                    onClick={() => applyQuery(clearAllFilters(query))}
                    className="min-h-11 px-2 text-sm font-medium text-[#1B1E1B] underline decoration-[#A37B5C] decoration-2 underline-offset-4 cursor-pointer sm:min-h-9"
                  >
                    Clear all
                  </button>
                </li>
              )}
            </ul>
            <div className="hidden lg:block">{sortControl}</div>
          </div>

          {results.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-[#1B1E1B]/20 px-6 py-16 text-center">
              <h2 className="font-display text-3xl font-semibold text-[#1B1E1B]">No matches for these filters</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#5E625B]">
                Remove a filter above, or clear them all to see every {plural}.
              </p>
              <button
                type="button"
                onClick={() => applyQuery(clearAllFilters(query))}
                className="mt-6 h-12 rounded-full bg-[#1B1E1B] px-6 text-sm font-semibold text-white hover:bg-[#2c302c] cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <ul
                className={`mt-5 grid gap-x-4 gap-y-8 sm:gap-x-5 ${
                  useKitCards ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                }`}
              >
                {visibleResults.map((product, index) => (
                  <li key={product.id}>
                    {useKitCards ? (
                      <KitProductCard product={product} priority={index < 4} />
                    ) : (
                      <ProductCard product={product} />
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-12 flex flex-col items-center gap-3">
                <p className="text-sm tabular-nums text-[#5E625B]">
                  Showing {visibleResults.length} of {results.length}
                </p>
                {visibleResults.length < results.length && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                    className="h-12 rounded-full border border-[#1B1E1B] px-8 text-sm font-semibold text-[#1B1E1B] hover:bg-[#1B1E1B] hover:text-white cursor-pointer"
                  >
                    Show {Math.min(PAGE_SIZE, results.length - visibleResults.length)} more
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <FilterSheet
        open={sheetOpen}
        title="Filters"
        resultCount={results.length}
        activeCount={activeCount}
        onClose={closeSheet}
        onClearAll={() => applyQuery(clearAllFilters(query))}
      >
        <FilterPanel products={catalog} query={query} onChange={applyQuery} />
      </FilterSheet>
    </div>
  );
}
