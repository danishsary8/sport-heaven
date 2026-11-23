import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import type { Product } from '../../types/store';
import { getNextCarouselIndex } from '../../utils/commerce';
import { KitProductCard } from './KitProductCard';

interface KitAutoShiftCarouselProps {
  eyebrow: string;
  title: string;
  editorialAccent?: string;
  products: Product[];
  autoShiftMs?: number;
  onViewAll?: () => void;
  viewAllLabel?: string;
  surface?: 'alabaster' | 'white';
}

/**
 * Minimalist Auto-Shift Kit Carousel
 * Smoothly auto-shifts across 3:4 portrait jersey cards with an animated progress rail,
 * pause-on-hover, explicit Play/Pause control, scroll-snap touch ergonomics, and Swiss hairline arrows.
 */
export function KitAutoShiftCarousel({
  eyebrow,
  title,
  editorialAccent,
  products,
  autoShiftMs = 4200,
  onViewAll,
  viewAllLabel = 'View All Kits',
  surface = 'white',
}: KitAutoShiftCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);

  const count = products.length;
  const isPaused = paused || userPaused || count <= 1;

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
      setCycleKey((k) => k + 1);
    },
    [count],
  );

  const step = useCallback(
    (delta: 1 | -1) => {
      const container = trackRef.current;
      if (!container || count <= 1) return;
      // When auto-shifting forward near the horizontal scroll end, cleanly loop back to index 0
      const nearEnd =
        container.scrollLeft + container.clientWidth >= container.scrollWidth - 24;
      if (delta === 1 && nearEnd) {
        scrollToIndex(0);
        return;
      }
      const next = getNextCarouselIndex(activeIdx, delta, count);
      scrollToIndex(next);
    },
    [activeIdx, count, scrollToIndex],
  );

  useEffect(() => {
    if (isPaused) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    const timer = window.setInterval(() => {
      step(1);
    }, autoShiftMs);

    return () => window.clearInterval(timer);
  }, [isPaused, autoShiftMs, step]);

  if (count === 0) return null;

  const formattedCurrent = String(activeIdx + 1).padStart(2, '0');
  const formattedTotal = String(count).padStart(2, '0');

  return (
    <section
      aria-label={title}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`border-b border-[#0E1113]/10 ${
        surface === 'alabaster' ? 'bg-[#FAF9F6]' : 'bg-[#FFFFFF]'
      }`}
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-14 lg:py-16">
        {/* Minimalist Editorial Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#5F625C]">
              {eyebrow}
            </p>
            <h2 className="mt-1.5 font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#0E1113] text-balance">
              {title}{' '}
              {editorialAccent && (
                <span className="font-editorial font-normal italic normal-case text-[#0E1113]/75">
                  {editorialAccent}
                </span>
              )}
            </h2>
          </div>

          {/* Right Minimal Controls: Index + Auto-Shift Progress + Play/Pause + Arrows + View All */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[11px] tabular-nums text-[#5F625C]">
                {formattedCurrent} / {formattedTotal}
              </span>
              <div
                aria-hidden="true"
                className="relative h-[2px] w-16 overflow-hidden bg-[#0E1113]/12"
              >
                {!isPaused ? (
                  <div
                    key={cycleKey}
                    style={{ '--carousel-duration': `${autoShiftMs}ms` } as CSSProperties}
                    className="animate-carousel-progress h-full w-full bg-[#C8232C]"
                  />
                ) : (
                  <div
                    className="h-full bg-[#0E1113]"
                    style={{ width: `${((activeIdx + 1) / count) * 100}%` }}
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => setUserPaused((p) => !p)}
                aria-label={userPaused ? 'Resume auto-shift carousel' : 'Pause auto-shift carousel'}
                title={userPaused ? 'Resume auto-shift' : 'Pause auto-shift'}
                className="inline-flex h-8 w-8 items-center justify-center border border-[#0E1113]/15 bg-transparent text-[#0E1113] hover:border-[#0E1113] hover:bg-[#0E1113] hover:text-white transition-colors cursor-pointer"
              >
                {userPaused ? (
                  <Play className="h-3 w-3" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label={`Previous ${title} slide`}
                className="inline-flex h-9 w-9 items-center justify-center border border-[#0E1113]/15 bg-transparent text-[#0E1113] hover:border-[#0E1113] hover:bg-[#0E1113] hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.7} />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label={`Next ${title} slide`}
                className="inline-flex h-9 w-9 items-center justify-center border border-[#0E1113]/15 bg-transparent text-[#0E1113] hover:border-[#0E1113] hover:bg-[#0E1113] hover:text-white transition-colors cursor-pointer"
              >
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.7} />
              </button>
            </div>

            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className="ml-1 inline-flex h-9 items-center gap-1.5 border-b border-[#0E1113] px-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#0E1113] hover:text-[#C8232C] hover:border-[#C8232C] transition-colors cursor-pointer whitespace-nowrap"
              >
                {viewAllLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Scroll-Snap Auto-Shifting Track */}
        <div
          ref={trackRef}
          className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((product, idx) => (
            <div
              key={product.id}
              className="w-[72vw] sm:w-[44vw] md:w-[30vw] lg:w-[23.5%] shrink-0 snap-start"
            >
              <KitProductCard product={product} priority={idx < 4} />
            </div>
          ))}
        </div>

        {/* Subtle Segment Progress Indicators */}
        <div
          className="mt-6 flex items-center gap-1.5"
          role="tablist"
          aria-label={`${title} carousel position`}
        >
          {products.map((item, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Jump to ${item.shortName}`}
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
