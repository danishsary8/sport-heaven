import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { PRODUCTS } from '../../data/catalog';
import { BLOG_ARTICLES, COLLECTION_CATALOG } from '../../data/editorial';
import { useStore } from '../../context/StoreContext';
import { formatUsd, fuzzySearchSite } from '../../utils/commerce';
import { ProductMedia } from '../product/ProductMedia';

const POPULAR_SEARCHES = [
  'Predator 25',
  'Barcelona 2026/27',
  'Real Madrid 2026/27',
  'Mercurial Vapor 16 AG',
  'Cambodia Varaman',
  'Puma Ultra Carbon',
  'Mizuno Morelia',
  'Arsenal 2026/27',
  'Ferrari F1',
  'Turf TF Cleats',
];

const SHOP_CATEGORIES = [
  { label: 'Football Boots & Cleats', slug: 'football-boots', count: PRODUCTS.filter((p) => p.category === 'boots').length },
  { label: '2026/27 Jerseys & Kits', slug: 'jerseys-kits', count: PRODUCTS.filter((p) => p.category === 'jerseys').length },
  { label: 'UEFA Champions League', slug: 'ucl-2026-27', count: PRODUCTS.filter((p) => p.isChampionsLeague).length },
  { label: 'F1 Paddock Motorsport', slug: 'f1-motorsport', count: PRODUCTS.filter((p) => p.category === 'f1').length },
  { label: 'Match Balls & GK Hardware', slug: 'gk-essentials', count: PRODUCTS.filter((p) => p.category === 'balls' || p.category === 'essentials').length },
];

export function SearchModal() {
  const { catalog, isSearchOpen, setSearchOpen, navigate, navigateToShop } = useStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSearchOpen) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isSearchOpen, setSearchOpen]);

  if (!isSearchOpen) return null;

  const trimmed = query.trim();
  const fuzzy = trimmed
    ? fuzzySearchSite(catalog, BLOG_ARTICLES, COLLECTION_CATALOG, trimmed)
    : null;
  const matches = fuzzy ? fuzzy.products.slice(0, 8) : [];

  const goToFullSearchPage = (searchTerm: string) => {
    setSearchOpen(false);
    navigate({ page: 'search', query: searchTerm.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#FDFCF9] animate-page-reveal"
      role="dialog"
      aria-modal="true"
      aria-label="Search Sport Castle catalog"
    >
      {/* Top Bar */}
      <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 sm:px-6 pt-6 pb-4 border-b border-[#0E1113]/10">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5A5D57]">
          SC · ARCHIVE SEARCH
        </span>
        <button
          type="button"
          onClick={() => {
            setSearchOpen(false);
            navigate({ page: 'home' });
          }}
          className="font-display text-2xl font-extrabold uppercase tracking-[0.06em] text-[#0E1113] cursor-pointer"
        >
          SPORT CASTLE
        </button>
        <button
          type="button"
          onClick={() => setSearchOpen(false)}
          aria-label="Close search"
          className="inline-flex h-10 w-10 items-center justify-center border border-[#0E1113]/15 text-[#0E1113] hover:bg-[#0E1113] hover:text-[#FDFCF9] transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Editorial Search Stage */}
      <div className="mx-auto max-w-[920px] px-4 sm:px-6 pt-8 pb-16">
        <h2 className="font-editorial italic text-3xl sm:text-4xl text-[#0E1113]">
          What are you looking for?
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            goToFullSearchPage(query);
          }}
          className="mt-5 flex items-center gap-3 border-b-2 border-[#0E1113] pb-3"
        >
          <Search className="h-5 w-5 shrink-0 text-[#5A5D57]" strokeWidth={1.7} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try Predator 25, Barcalona (spell-check), Lunar Gato, Ferrari F1..."
            className="w-full bg-transparent text-base sm:text-lg text-[#0E1113] placeholder:text-[#5A5D57]/65 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="font-mono text-xs uppercase text-[#5A5D57] hover:text-[#0E1113] cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 bg-[#0E1113] px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[#FDFCF9] hover:bg-[#C8232C] transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        {!trimmed ? (
          <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2">
            <div>
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5A5D57]">
                01 · Popular Search Terms
              </h3>
              <ol className="mt-4 space-y-2.5">
                {POPULAR_SEARCHES.map((term, idx) => (
                  <li key={term}>
                    <button
                      type="button"
                      onClick={() => goToFullSearchPage(term)}
                      className="group flex w-full items-center gap-4 py-1 text-left text-sm text-[#0E1113] hover:text-[#C8232C] transition-colors cursor-pointer"
                    >
                      <span className="w-6 font-mono text-xs text-[#5A5D57] tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-medium group-hover:translate-x-1 transition-transform">
                        {term}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            <div className="md:border-l md:border-[#0E1113]/12 md:pl-10">
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5A5D57]">
                02 · Browse Collections
              </h3>
              <ol className="mt-4 space-y-2.5">
                {SHOP_CATEGORIES.map((cat, idx) => (
                  <li key={cat.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        navigateToShop({ collectionSlug: cat.slug });
                      }}
                      className="group flex w-full items-center justify-between py-1 text-left text-sm text-[#0E1113] hover:text-[#C8232C] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-4">
                        <span className="w-6 font-mono text-xs text-[#5A5D57] tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="font-medium group-hover:translate-x-1 transition-transform">
                          {cat.label}
                        </span>
                      </span>
                      <span className="font-mono text-xs text-[#5A5D57]">
                        {cat.count} items
                      </span>
                    </button>
                  </li>
                ))}
              </ol>

              <div className="mt-8 border-t border-[#0E1113]/12 pt-5">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5A5D57]">
                  Quick Atelier Tools
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { label: 'Matchday Lookbooks', route: { page: 'lookbooks' as const } },
                    { label: 'Pitch Boot Finder', route: { page: 'boot-finder' as const } },
                    { label: 'Custom Studio', route: { page: 'custom-studio' as const } },
                    { label: 'Gift Cards', route: { page: 'gift-card' as const } },
                  ].map((tool) => (
                    <button
                      key={tool.label}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        navigate(tool.route);
                      }}
                      className="border border-[#0E1113]/20 bg-[#F4F2EC] px-3 py-1.5 text-xs font-medium text-[#0E1113] hover:border-[#0E1113] hover:bg-[#0E1113] hover:text-[#FDFCF9] transition-colors cursor-pointer"
                    >
                      {tool.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#0E1113]/12">
              <p className="font-mono text-xs text-[#5A5D57]">
                {fuzzy?.usedCorrection ? (
                  <>
                    Spell-check matched{' '}
                    <strong className="text-[#0E1113]">“{fuzzy.usedCorrection}”</strong> ({fuzzy.products.length} products)
                  </>
                ) : (
                  <>
                    Showing <strong className="text-[#0E1113]">{fuzzy?.products.length ?? 0}</strong>{' '}
                    results for “{trimmed}”
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => goToFullSearchPage(trimmed)}
                className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[#C8232C] hover:underline cursor-pointer"
              >
                Open Full Search Page (/search)
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {matches.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-editorial italic text-2xl text-[#0E1113]">
                  No exact match for “{trimmed}”
                </p>
                <p className="mt-2 text-xs text-[#5A5D57]">
                  Press Enter to open the full search page with popular alternatives.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {matches.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      navigate({ page: 'product', slug: product.slug }, product.slug);
                    }}
                    className="group flex items-center gap-3.5 border border-[#0E1113]/12 bg-[#FDFCF9] p-2.5 text-left hover:border-[#0E1113] transition-colors cursor-pointer"
                  >
                    <ProductMedia
                      product={product}
                      className="h-16 w-20 shrink-0 bg-[#EAE7DF]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5A5D57]">
                        {product.brand} {product.surface ? `· ${product.surface}` : ''}
                      </p>
                      <p className="truncate text-sm font-semibold text-[#0E1113] group-hover:text-[#C8232C]">
                        {product.name}
                      </p>
                      <p className="mt-0.5 font-mono text-xs font-semibold text-[#0E1113]">
                        {formatUsd(product.price)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
