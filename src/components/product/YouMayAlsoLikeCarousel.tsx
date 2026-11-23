import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  CATEGORY_LABELS,
  CATEGORY_METADATA,
  MOCK_STORE_CATALOG,
  formatTagLabel,
  getRecommendedProducts,
  type CatalogProduct,
} from '../../lib/mock-store/catalog';
import { useStore } from '../../context/StoreContext';
import { getNextCarouselIndex } from '../../utils/commerce';
import { ProductCard } from './ProductCard';
import { KitProductCard } from './KitProductCard';

interface YouMayAlsoLikeCarouselProps {
  currentProduct: CatalogProduct;
  limit?: number;
  variant?: 'technical' | 'minimal';
  onViewAll?: () => void;
}

const DISPLAY_EXCLUDED_TAGS = new Set([
  'featured',
  'new-arrival',
  'on-sale',
  'matchday-kit',
  'match-hardware',
  '2026-27',
]);

/**
 * Dynamic "You May Also Like" horizontal scroll-snap carousel.
 * Computes related items live from `catalog.ts` using category + tag similarity,
 * with smooth Prev/Next controls, index counter, progress indicators, and
 * automatic reset when navigating between PDPs.
 */
export function YouMayAlsoLikeCarousel({
  currentProduct,
  limit = 8,
  variant = 'technical',
  onViewAll,
}: YouMayAlsoLikeCarouselProps) {
  const { catalog, navigateToShop } = useStore();
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const sourceCatalog = catalog.length > 0 ? catalog : MOCK_STORE_CATALOG;

  const recommendations = useMemo(
    () => getRecommendedProducts(currentProduct, sourceCatalog, limit),
    [currentProduct, sourceCatalog, limit],
  );

  // Build concise, readable matching context from the current product's primary tags
  const highlightTags = useMemo(() => {
    return currentProduct.tags
      .filter(
        (tag) =>
          tag !== currentProduct.category && !DISPLAY_EXCLUDED_TAGS.has(tag),
      )
      .slice(0, 3)
      .map(formatTagLabel);
  }, [currentProduct]);

  const count = recommendations.length;

  // Reset carousel scroll and active index whenever the user navigates to a different product
  useEffect(() => {
    setActiveIdx(0);
    if (trackRef.current) {
      trackRef.current.scrollTo({ left: 0, behavior: 'auto' });
    }
  }, [currentProduct.id]);

  const scrollToIndex = useCallback(
    (nextIdx: number) => {
      const container = trackRef.current;
      if (!container || count === 0) return;
      const safeIdx = getNextCarouselIndex(nextIdx, 0, count);
      const child = container.children[safeIdx] as HTMLElement | undefined;
      if (child) {
        const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
        const targetLeft = Math.min(child.offsetLeft, maxScroll);
        container.scrollTo({
          left: targetLeft,
          behavior: 'smooth',
        });
      }
      setActiveIdx(safeIdx);
    },
    [count],
  );

  const step = useCallback(
    (delta: 1 | -1) => {
      const container = trackRef.current;
      if (!container || count <= 1) return;
      const nearEnd =
        container.scrollLeft + container.clientWidth >= container.scrollWidth - 24;
      if (delta === 1 && nearEnd && activeIdx > 0) {
        scrollToIndex(0);
        return;
      }
      const next = getNextCarouselIndex(activeIdx, delta, count);
      scrollToIndex(next);
    },
    [activeIdx, count, scrollToIndex],
  );

  if (count === 0) return null;

  const categoryMeta = CATEGORY_METADATA[currentProduct.category];
  const handleViewAll =
    onViewAll ??
    (() =>
      navigateToShop({
        collectionSlug: categoryMeta.slug,
        category: currentProduct.category,
      }));

  const formattedCurrent = String(activeIdx + 1).padStart(2, '0');
  const formattedTotal = String(count).padStart(2, '0');

  return (
    <section
      aria-label="You May Also Like"
      data-testid="you-may-also-like-carousel"
      className={
        variant === 'minimal'
          ? 'border-b border-[#0E1113]/10 bg-[#FAF9F6]'
          : 'mt-14 border-t border-[#18222D]/12 pt-10'
      }
    >
      <div
        className={
          variant === 'minimal'
            ? 'mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-14 lg:py-16'
            : ''
        }
      >
        {/* Header Row */}
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#5F625C]">
              Matched · {CATEGORY_LABELS[currentProduct.category]}
              {highlightTags.length > 0 ? ` · ${highlightTags.join(' / ')}` : ''}
            </p>
            <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#0E1113]">
              You May Also{' '}
              <span className="font-editorial font-normal italic normal-case text-[#0E1113]/75">
                Like
              </span>
            </h2>
          </div>

          {/* Controls: Index + Prev/Next Arrows + View All */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="font-mono text-[11px] tabular-nums text-[#5F625C]"
              aria-live="polite"
            >
              {formattedCurrent} / {formattedTotal}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous You May Also Like slide"
                className="inline-flex h-9 w-9 items-center justify-center border border-[#0E1113]/18 bg-white text-[#0E1113] hover:border-[#0E1113] hover:bg-[#0E1113] hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.7} />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next You May Also Like slide"
                className="inline-flex h-9 w-9 items-center justify-center border border-[#0E1113]/18 bg-white text-[#0E1113] hover:border-[#0E1113] hover:bg-[#0E1113] hover:text-white transition-colors cursor-pointer"
              >
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.7} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleViewAll}
              className="ml-1 inline-flex h-9 items-center gap-1.5 border-b border-[#0E1113] px-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#0E1113] hover:border-[#C8232C] hover:text-[#C8232C] transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>All {categoryMeta.shortName}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal Scroll-Snap Carousel Track */}
        <div
          ref={trackRef}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              step(1);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              step(-1);
            }
          }}
          aria-label="Recommended products carousel"
          className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus:outline-none"
        >
          {recommendations.map((rec, idx) => (
            <div
              key={rec.product.id}
              data-recommendation-id={rec.product.id}
              data-recommendation-category={rec.product.category}
              data-matched-tags={rec.matchedTags.join(',')}
              className="w-[78vw] sm:w-[46vw] md:w-[31vw] lg:w-[23.6%] shrink-0 snap-start"
            >
              {variant === 'minimal' ? (
                <KitProductCard product={rec.product} priority={idx < 4} />
              ) : (
                <ProductCard product={rec.product} />
              )}
            </div>
          ))}
        </div>

        {/* Interactive Progress Segment Bar */}
        <div
          className="mt-6 flex items-center gap-1.5"
          role="tablist"
          aria-label="You May Also Like carousel position"
        >
          {recommendations.map((rec, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={rec.product.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Jump to ${rec.product.shortName}`}
                onClick={() => scrollToIndex(idx)}
                className={`h-[2px] flex-1 transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-[#0E1113]'
                    : 'bg-[#0E1113]/14 hover:bg-[#0E1113]/40'
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
