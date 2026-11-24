import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { motion, useReducedMotion, type PanInfo } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { CatalogProduct as Product } from '../../lib/mock-store/catalog';
import { formatUsd, isKitProduct } from '../../utils/commerce';
import { ProductMedia } from './ProductMedia';

/**
 * 3D coverflow carousel in the style of React Bits' "Carousel":
 * drag/swipe with spring physics, angled side cards, and autoplay.
 *
 * Accessibility (WCAG 2.2): drag is never the only control. There are
 * prev/next buttons, arrow keys, clickable dots, a pause button, and
 * autoplay is disabled when the user prefers reduced motion.
 */

const AUTOPLAY_MS = 5600;
const DRAG_THRESHOLD_PX = 60;
const SPRING = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 } as const;

interface HeroCoverflowCarouselProps {
  items: Product[];
  activeIndex: number;
  onChange: (index: number, direction: 1 | -1) => void;
  onOpen: (product: Product) => void;
  /** Pause autoplay while the pointer is over the whole hero. */
  externallyPaused?: boolean;
}

/** Shortest signed distance from `active` to `index` on a ring of `length`. */
function ringOffset(index: number, active: number, length: number) {
  let diff = index - active;
  const half = length / 2;
  if (diff > half) diff -= length;
  if (diff < -half) diff += length;
  return diff;
}

export function HeroCoverflowCarousel({
  items,
  activeIndex,
  onChange,
  onOpen,
  externallyPaused = false,
}: HeroCoverflowCarouselProps) {
  const prefersReducedMotion = useReducedMotion();
  const [userPaused, setUserPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const count = items.length;
  const active = ((activeIndex % count) + count) % count;

  const go = useCallback(
    (dir: 1 | -1) => onChange((active + dir + count) % count, dir),
    [active, count, onChange],
  );

  const autoplayOn = !prefersReducedMotion && !userPaused && count > 1;

  useEffect(() => {
    if (!autoplayOn || externallyPaused || isDragging) return;
    const timer = window.setTimeout(() => go(1), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoplayOn, externallyPaused, isDragging, go, active]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setIsDragging(false);
    const swipe = info.offset.x + info.velocity.x * 0.2;
    if (swipe <= -DRAG_THRESHOLD_PX) go(1);
    else if (swipe >= DRAG_THRESHOLD_PX) go(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    }
  };

  if (count === 0) return null;
  const current = items[active];

  return (
    <div
      className="relative w-full"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured gear"
      onKeyDown={handleKeyDown}
    >
      {/* Stage: perspective container so side cards tilt in 3D */}
      <motion.div
        className="relative aspect-[4/5] w-full touch-pan-y select-none [perspective:1200px]"
        drag={count > 1 ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ cursor: count > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {items.map((item, index) => {
          const offset = ringOffset(index, active, count);
          const distance = Math.abs(offset);
          const isCenter = offset === 0;
          const isVisible = distance <= 1;

          return (
            <motion.div
              key={item.id}
              className="absolute inset-0 [transform-style:preserve-3d]"
              initial={false}
              animate={{
                x: `${offset * 34}%`,
                scale: isCenter ? 1 : 0.82,
                rotateY: offset * -32,
                opacity: isVisible ? (isCenter ? 1 : 0.6) : 0,
                filter: isCenter ? 'brightness(1)' : 'brightness(0.72)',
              }}
              transition={prefersReducedMotion ? { duration: 0 } : SPRING}
              style={{ zIndex: 10 - distance, pointerEvents: isVisible ? 'auto' : 'none' }}
              aria-hidden={!isCenter}
            >
              <button
                type="button"
                tabIndex={isCenter ? 0 : -1}
                onClick={() => {
                  if (isDragging) return;
                  if (isCenter) onOpen(item);
                  else go(offset > 0 ? 1 : -1);
                }}
                aria-label={isCenter ? `Inspect ${item.name}` : `Show ${item.shortName}`}
                className="group relative block h-full w-full cursor-[inherit] overflow-hidden rounded-t-[200px] rounded-b-[28px] border-[7px] border-[#FAF9F5] bg-[#D7E0E8] text-left shadow-[0_22px_50px_rgba(14,17,19,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1B1E1B]/60"
              >
                <ProductMedia
                  product={item}
                  loading={distance <= 1 ? 'eager' : 'lazy'}
                  fit={isKitProduct(item) ? 'cover' : 'contain'}
                  className="pointer-events-none h-full w-full bg-[#D7E0E8]"
                  imgClassName={
                    isKitProduct(item)
                      ? 'scale-[1.03] transition-transform duration-500 group-hover:scale-[1.08]'
                      : 'pb-12 transition-transform duration-500 group-hover:scale-105'
                  }
                />

                {/* Label only on the center card */}
                <div
                  className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#161916]/85 via-[#161916]/35 to-transparent px-5 pb-4 pt-12 transition-opacity duration-300 ${
                    isCenter ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#EAE5DA]/90">
                    {item.brand} · {item.season ?? item.surface ?? '2026/27'}
                  </p>
                  <div className="mt-0.5 flex items-baseline justify-between gap-2">
                    <p className="truncate font-sans text-sm font-bold text-white">{item.shortName}</p>
                    <span className="font-mono text-xs font-semibold tabular-nums text-[#F4F2EC]">
                      {formatUsd(item.price)}
                    </span>
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Screen-reader announcement of the current slide */}
      <p className="sr-only" aria-live={autoplayOn ? 'off' : 'polite'}>
        Slide {active + 1} of {count}: {current.name}
      </p>

      {/* Controls: prev · progress dots · pause · next (all 44px touch targets) */}
      <div className="relative z-20 mt-4 flex items-center justify-center gap-1">
        <ControlButton label="Previous item" onClick={() => go(-1)}>
          <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
        </ControlButton>

        <div className="flex items-center" role="tablist" aria-label="Choose featured item">
          {items.map((item, index) => {
            const isCurrent = index === active;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-label={`Show ${item.shortName}`}
                onClick={() => onChange(index, index >= active ? 1 : -1)}
                className="group flex h-11 items-center px-1 cursor-pointer"
              >
                <span
                  className={`relative block h-1.5 overflow-hidden rounded-full transition-all duration-300 ${
                    isCurrent ? 'w-8 bg-[#FAF9F5]/35' : 'w-2 bg-[#FAF9F5]/45 group-hover:bg-[#FAF9F5]/80'
                  }`}
                >
                  {/* Autoplay progress fill on the active dot */}
                  {isCurrent && (
                    <motion.span
                      key={`${item.id}-${autoplayOn && !externallyPaused}`}
                      className="absolute inset-y-0 left-0 rounded-full bg-[#FAF9F5]"
                      initial={{ width: autoplayOn && !externallyPaused ? '0%' : '100%' }}
                      animate={{ width: '100%' }}
                      transition={{
                        duration: autoplayOn && !externallyPaused ? AUTOPLAY_MS / 1000 : 0,
                        ease: 'linear',
                      }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {!prefersReducedMotion && (
          <ControlButton
            label={userPaused ? 'Play slideshow' : 'Pause slideshow'}
            onClick={() => setUserPaused((p) => !p)}
          >
            {userPaused ? (
              <Play className="h-3.5 w-3.5" strokeWidth={2.2} />
            ) : (
              <Pause className="h-3.5 w-3.5" strokeWidth={2.2} />
            )}
          </ControlButton>
        )}

        <ControlButton label="Next item" onClick={() => go(1)}>
          <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
        </ControlButton>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#FAF9F5] transition-colors duration-200 hover:bg-[#FAF9F5]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAF9F5] cursor-pointer"
    >
      {children}
    </button>
  );
}
