import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Layers, Search, Sparkles } from 'lucide-react';
import { CATEGORY_LABELS, PRODUCTS } from '../data/catalog';
import { BLOG_ARTICLES, COLLECTION_CATALOG } from '../data/editorial';
import type { ProductCategory } from '../types/store';
import { useStore } from '../context/StoreContext';
import { fuzzySearchSite } from '../utils/commerce';
import { ProductCard } from '../components/product';

interface SearchResultsPageProps {
  query: string;
}

export function SearchResultsPage({ query }: SearchResultsPageProps) {
  const { navigate, navigateToShop } = useStore();
  const [inputValue, setInputValue] = useState(query);
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>('all');
  const [maxPrice, setMaxPrice] = useState(300);

  const searchResult = useMemo(
    () => fuzzySearchSite(PRODUCTS, BLOG_ARTICLES, COLLECTION_CATALOG, query),
    [query],
  );

  const filteredProducts = useMemo(
    () =>
      searchResult.products.filter((p) => {
        if (activeCategory !== 'all' && p.category !== activeCategory) return false;
        if (p.price > maxPrice) return false;
        return true;
      }),
    [searchResult.products, activeCategory, maxPrice],
  );

  const popularFallback = useMemo(
    () => PRODUCTS.filter((p) => p.isFeatured).slice(0, 8),
    [],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ page: 'search', query: inputValue.trim() });
  };

  return (
    <div className="bg-[#F4F2EC] animate-page-reveal">
      {/* Search Header */}
      <section className="border-b border-[#0E1113]/12 bg-[#FDFCF9]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5A5D57]">
            ARCHIVE SEARCH · SPELL-CHECK TOLERANT
          </p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl font-extrabold uppercase text-[#0E1113]">
            {query ? (
              <>
                Search: <span className="font-editorial italic font-normal normal-case">“{query}”</span>
              </>
            ) : (
              'Search Sport Castle'
            )}
          </h1>

          <form
            onSubmit={handleSubmit}
            className="mt-5 flex max-w-2xl items-center border-2 border-[#0E1113] bg-[#FDFCF9]"
          >
            <Search className="ml-4 h-4 w-4 text-[#5A5D57]" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search boots, 2026/27 clubs, F1 teams, surfaces..."
              className="h-12 flex-1 bg-transparent px-3 text-sm text-[#0E1113] focus:outline-none"
            />
            <button
              type="submit"
              className="h-12 bg-[#0E1113] px-6 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#FDFCF9] hover:bg-[#C8232C] transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Spell-Check Did You Mean Banner */}
          {searchResult.didYouMean && (
            <div className="mt-4 inline-flex items-center gap-2 border border-[#B8933B] bg-[#B8933B]/10 px-4 py-2 text-xs text-[#0E1113]">
              <Sparkles className="h-3.5 w-3.5 text-[#B8933B]" />
              <span>
                No exact match for <strong>“{query}”</strong> — showing spell-corrected results for{' '}
                <button
                  type="button"
                  onClick={() => {
                    setInputValue(searchResult.didYouMean!);
                    navigate({ page: 'search', query: searchResult.didYouMean! });
                  }}
                  className="font-semibold underline text-[#C8232C] cursor-pointer"
                >
                  {searchResult.didYouMean}
                </button>
                .
              </span>
            </div>
          )}

          {/* Active Filter Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#0E1113]/10 pt-5">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'boots', 'jerseys', 'f1', 'balls', 'essentials'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] border cursor-pointer transition-colors ${
                    activeCategory === cat
                      ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                      : 'border-[#0E1113]/15 bg-[#F4F2EC] text-[#0E1113] hover:border-[#0E1113]'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-3 font-mono text-xs text-[#5A5D57]">
              <span>MAX ${maxPrice}</span>
              <input
                type="range"
                min={30}
                max={300}
                step={10}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-28 accent-[#0E1113]"
              />
            </label>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-10 space-y-12">
        {/* Matching Collections */}
        {searchResult.collections.length > 0 && (
          <section>
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#5A5D57] mb-4">
              <Layers className="h-3.5 w-3.5" />
              <span>Matching Collections ({searchResult.collections.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {searchResult.collections.slice(0, 3).map((col) => (
                <button
                  key={col.slug}
                  type="button"
                  onClick={() => navigateToShop({ collectionSlug: col.slug })}
                  className="flex items-center justify-between border border-[#0E1113]/15 bg-[#FDFCF9] p-4 text-left hover:border-[#0E1113] transition-colors cursor-pointer"
                >
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C8232C]">
                      {col.eyebrow}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#0E1113]">{col.title}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#5A5D57]" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Matching Products or Zero-Results Popular Fallback */}
        {filteredProducts.length > 0 ? (
          <section>
            <h2 className="font-display text-2xl font-extrabold uppercase text-[#0E1113] mb-5">
              Matching Products ({filteredProducts.length})
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : (
          <section className="border border-[#0E1113]/15 bg-[#FDFCF9] p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#C8232C]">
              ZERO RESULTS FOUND
            </p>
            <h2 className="mt-2 font-editorial italic text-3xl text-[#0E1113]">
              We couldn’t find any exact matches for “{query}”.
            </h2>
            <p className="mt-2 text-sm text-[#5A5D57]">
              Try searching for a surface (FG, AG, TF, IC), club (Barcelona, Real Madrid,
              Cambodia), or explore our Phnom Penh bestsellers below.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Predator 25', 'Barcelona 2026/27', 'Tiempo TF', 'Cambodia', 'Ferrari F1'].map(
                (term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setInputValue(term);
                      setActiveCategory('all');
                      setMaxPrice(300);
                      navigate({ page: 'search', query: term });
                    }}
                    className="border border-[#0E1113]/20 bg-[#F4F2EC] px-3 py-1.5 font-mono text-xs text-[#0E1113] hover:bg-[#0E1113] hover:text-[#FDFCF9] cursor-pointer"
                  >
                    {term}
                  </button>
                ),
              )}
            </div>

            <div className="mt-8 border-t border-[#0E1113]/12 pt-8">
              <h3 className="font-display text-2xl font-extrabold uppercase text-[#0E1113] mb-5">
                Popular Matchday Bestsellers
              </h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {popularFallback.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Matching Editorial Articles */}
        {searchResult.articles.length > 0 && (
          <section>
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#5A5D57] mb-4">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Matching Journal Guides ({searchResult.articles.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {searchResult.articles.map((article) => (
                <button
                  key={article.slug}
                  type="button"
                  onClick={() => navigate({ page: 'blog-post', slug: article.slug })}
                  className="flex gap-4 border border-[#0E1113]/15 bg-[#FDFCF9] p-4 text-left hover:border-[#0E1113] transition-colors cursor-pointer"
                >
                  <img
                    src={article.heroImage}
                    alt={article.title}
                    className="h-20 w-24 shrink-0 object-cover bg-[#EAE7DF]"
                  />
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C8232C]">
                      {article.category} · {article.readMinutes} MIN READ
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#0E1113] line-clamp-2">
                      {article.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
