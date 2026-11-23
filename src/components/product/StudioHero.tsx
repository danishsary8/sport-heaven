import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  ChevronRight,
  Gem,
  Heart,
  ShieldCheck,
  Shirt,
  ShoppingCart,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { assignMorphSource } from '../../hooks/useViewTransition';
import { formatUsd, getNextCarouselIndex, isKitProduct } from '../../utils/commerce';
import { ProductMedia } from './ProductMedia';

const HERO_AUTO_SHIFT_MS = 5600;

const PRIORITY_SPOTLIGHT_IDS = [
  'jersey-madrid-2627-home',
  'jersey-barca-2627-home',
  'boot-predator-25-elite-ft',
  'jersey-liverpool-2627-home',
  'boot-puma-ultra-5-carbon',
  'jersey-psg-2627-third-ucl',
  'boot-mizuno-alpha-japan',
];

const COMMUNITY_THUMB_IDS = [
  'jersey-cambodia-home',
  'jersey-barca-2627-home',
  'boot-predator-25-elite-ft',
];

export function StudioHero() {
  const { catalog, navigate, navigateToShop, addToCart } = useStore();
  const stageRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [hoverPaused, setHoverPaused] = useState(false);

  const items = useMemo(() => {
    const byId = new Map(catalog.map((p) => [p.id, p]));
    const prioritized = PRIORITY_SPOTLIGHT_IDS.map((id) => byId.get(id)).filter(
      (p): p is NonNullable<typeof p> => Boolean(p),
    );
    if (prioritized.length >= 3) return prioritized;
    const spotlights = catalog.filter((p) => p.isHeroSpotlight);
    return spotlights.length > 0 ? spotlights : catalog.slice(0, 6);
  }, [catalog]);

  const communityThumbs = useMemo(() => {
    const byId = new Map(catalog.map((p) => [p.id, p]));
    return COMMUNITY_THUMB_IDS.map((id) => byId.get(id)).filter(
      (p): p is NonNullable<typeof p> => Boolean(p),
    );
  }, [catalog]);

  const active = items[activeIndex % items.length] ?? catalog[0];
  const featuredLook =
    items[(activeIndex + 1) % items.length] ?? catalog[1] ?? active;

  const step = (dir: 1 | -1) => {
    setDirection(dir);
    setActiveIndex((prev) => getNextCarouselIndex(prev, dir, items.length));
  };

  useEffect(() => {
    if (hoverPaused || items.length <= 1) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const timer = window.setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => getNextCarouselIndex(prev, 1, items.length));
    }, HERO_AUTO_SHIFT_MS);

    return () => window.clearInterval(timer);
  }, [hoverPaused, items.length]);

  const openProduct = (target: typeof active) => {
    assignMorphSource(stageRef.current);
    navigate({ page: 'product', slug: target.slug }, target.slug);
  };

  const handleFeaturedQuickAdd = () => {
    const defaultSize =
      featuredLook.sizes[Math.min(2, featuredLook.sizes.length - 1)] ??
      featuredLook.sizes[0];
    addToCart(featuredLook, defaultSize, 1, undefined, true);
  };

  const featuredSubtitle = isKitProduct(featuredLook)
    ? `${featuredLook.league ?? featuredLook.brand} Essential`
    : `${featuredLook.brand} ${featuredLook.surface ?? 'Match'} Spec`;

  return (
    <section
      aria-label="Flagship Editorial Hero"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      className="relative overflow-x-clip bg-[#FAF9F5] border-b border-[#0E1113]/10"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 pt-7 pb-10 sm:pt-10 sm:pb-14">
        {/* TOP SPLIT MONUMENTAL HEADLINE ROW (Flanks the centered overlapping showcase on desktop) */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-12 items-end gap-4 sm:gap-6 pb-4 sm:pb-6 lg:pb-5">
          {/* Left Headline Pair: Define Your / GAME */}
          <div className="lg:col-span-4 flex flex-col items-start">
            <span className="font-sans italic font-bold text-[22px] sm:text-[32px] lg:text-[40px] leading-[1.02] tracking-[-0.025em] text-[#171917] whitespace-nowrap">
              Define Your
            </span>
            <h1 className="mt-0.5 font-display font-extrabold uppercase text-[56px] sm:text-[82px] lg:text-[104px] leading-[0.82] tracking-[-0.02em] text-[#6D7768]">
              GAME
            </h1>
          </div>

          {/* Center Architectural Breathing Gap for Overlapping Hero Subject */}
          <div className="hidden lg:block lg:col-span-4" aria-hidden="true" />

          {/* Right Headline Pair: Own Your ★ / PITCH */}
          <div className="lg:col-span-4 flex flex-col items-end">
            <div className="w-full max-w-[210px] sm:max-w-[300px] lg:max-w-[340px]">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <span className="font-sans italic font-bold text-[22px] sm:text-[32px] lg:text-[40px] leading-[1.02] tracking-[-0.025em] text-[#171917] whitespace-nowrap">
                  Own Your
                </span>
                {/* Crisp 8-Point Warm Bronze Star Emblem */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 40 40"
                  className="h-7 w-7 sm:h-9 sm:w-9 lg:h-11 lg:w-11 shrink-0 text-[#A37B5C]"
                  fill="currentColor"
                >
                  <path d="M20 0L23.1 13.4L34.1 5.9L26.6 16.9L40 20L26.6 23.1L34.1 34.1L23.1 26.6L20 40L16.9 26.6L5.9 34.1L13.4 23.1L0 20L13.4 16.9L5.9 5.9L16.9 13.4L20 0Z" />
                </svg>
              </div>
              <span
                aria-hidden="true"
                className="mt-0.5 block font-display font-extrabold uppercase text-[56px] sm:text-[82px] lg:text-[106px] leading-[0.82] tracking-[-0.015em] text-[#A37B5C]"
              >
                PITCH
              </span>
            </div>
          </div>
        </div>

        {/* MAIN ROUNDED SAGE-OLIVE EDITORIAL HERO STAGE */}
        <div className="relative rounded-[28px] sm:rounded-[38px] bg-[#899283] px-5 py-7 sm:px-9 sm:py-10 lg:px-12 lg:py-11 shadow-[0_24px_60px_rgba(24,30,22,0.08)]">
          {/* Organic Soft-Cream Translucent Capsule Shapes Behind Center Showcase */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px] sm:rounded-[38px]"
          >
            <div className="absolute left-1/2 top-[18%] h-24 w-[320px] sm:w-[440px] -translate-x-1/2 -rotate-[22deg] rounded-full bg-[#ECE7DC]/22" />
            <div className="absolute left-1/2 top-[44%] h-24 w-[350px] sm:w-[490px] -translate-x-1/2 -rotate-[16deg] rounded-full bg-[#ECE7DC]/20" />
            <div className="absolute left-1/2 top-[70%] h-24 w-[320px] sm:w-[440px] -translate-x-1/2 -rotate-[10deg] rounded-full bg-[#ECE7DC]/18" />
          </div>

          <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-6">
            {/* LEFT COLUMN: Editorial Kicker, Statement, Primary Pill CTA & Social Proof */}
            <div className="order-2 lg:order-1 lg:col-span-4 flex flex-col items-start justify-between lg:min-h-[430px] gap-6">
              <div>
                {/* Clean Unboxed Kicker with Minimal 4-Point Star */}
                <p className="inline-flex items-center gap-2 text-xs sm:text-[13px] font-medium tracking-[0.02em] text-[#F7F5EE]">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="h-3.5 w-3.5 text-[#F7F5EE]"
                    fill="currentColor"
                  >
                    <path d="M8 0L9.8 6.2L16 8L9.8 9.8L8 16L6.2 9.8L0 8L6.2 6.2L8 0Z" />
                  </svg>
                  <span>New 2026/27 Collection</span>
                </p>

                <h2 className="mt-3 font-sans text-[28px] sm:text-[34px] lg:text-[38px] font-bold leading-[1.12] tracking-[-0.025em] text-[#FFFFFF] text-balance">
                  Where Speed
                  <br />
                  Meets Matchday
                </h2>

                <p className="mt-3.5 max-w-[270px] text-sm sm:text-[15px] leading-[1.6] text-[#F4F2EC]/90">
                  Elevate your matchday kit with authentic boots and 2026/27 jerseys curated for Phnom Penh pitches.
                </p>

                {/* Dark Charcoal Pill CTA with Circular Right Arrow */}
                <button
                  type="button"
                  onClick={() => navigateToShop({ collectionSlug: 'all' })}
                  className="group mt-6 inline-flex h-12 items-center gap-4 rounded-full bg-[#1B1E1B] pl-6 pr-2 text-sm font-semibold text-[#FAF9F5] transition-all duration-200 hover:bg-[#0E1113] hover:shadow-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Explore Now</span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/40 transition-transform duration-200 group-hover:translate-x-0.5">
                    <ArrowRight className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                  </span>
                </button>
              </div>

              {/* Bottom-Left Community Social Proof Card */}
              <button
                type="button"
                onClick={() => navigate({ page: 'lookbooks' })}
                className="group relative flex w-full max-w-[285px] items-center gap-3.5 rounded-[22px] bg-[#E5DFD3] px-4 py-3 text-left transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="flex -space-x-2.5 shrink-0">
                  {communityThumbs.map((thumb) => (
                    <div
                      key={thumb.id}
                      className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#E5DFD3] bg-[#DCE2E7]"
                    >
                      <ProductMedia
                        product={thumb}
                        className="h-full w-full bg-[#DCE2E7]"
                      />
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1 pr-3">
                  <p className="text-[12.5px] font-bold leading-snug text-[#1C1F1C]">
                    Loved by 20K+
                  </p>
                  <p className="text-[11.5px] font-medium leading-snug text-[#464B44]">
                    Cambodia Players
                  </p>
                </div>
                <Heart
                  aria-hidden="true"
                  className="absolute bottom-2.5 right-3 h-3.5 w-3.5 fill-[#A37B5C] text-[#A37B5C]"
                />
              </button>
            </div>

            {/* CENTER COLUMN: Tall Overlapping Sculptural Showcase Pedestal (Breaks Above Top Sage Edge) */}
            <div className="order-1 lg:order-2 lg:col-span-4 relative flex flex-col items-center">
              <div
                ref={stageRef}
                className="relative w-full max-w-[320px] sm:max-w-[355px] lg:max-w-[385px] lg:-mt-44 lg:-mb-11"
              >
                {/* Delicate Orbital Halo Ring Accent Around Top Arch (Mirrors Sample Beanie Orbit) */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 380 120"
                  className="pointer-events-none absolute -left-2 -right-2 sm:-left-6 sm:-right-6 top-6 z-30 w-[calc(100%+1rem)] sm:w-[calc(100%+3rem)] text-[#1D201D]/30"
                  fill="none"
                >
                  <ellipse
                    cx="190"
                    cy="60"
                    rx="172"
                    ry="34"
                    transform="rotate(9 190 60)"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>

                {/* Tall Rounded Arch Editorial Frame */}
                <div className="relative overflow-hidden rounded-t-[200px] rounded-b-[28px] border-[7px] border-[#FAF9F5] bg-[#D7E0E8] shadow-[0_22px_50px_rgba(14,17,19,0.22)] aspect-[4/5]">
                  <AnimatePresence initial={false}>
                    <motion.button
                      key={active.id}
                      type="button"
                      onClick={() => openProduct(active)}
                      aria-label={`Inspect ${active.name}`}
                      initial={{ opacity: 0, x: direction * 20, scale: 0.99 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: direction * -16, scale: 0.99 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="group absolute inset-0 block h-full w-full cursor-pointer text-left"
                    >
                      <ProductMedia
                        product={active}
                        loading="eager"
                        fit={isKitProduct(active) ? 'cover' : 'contain'}
                        className="h-full w-full bg-[#D7E0E8]"
                        imgClassName={
                          isKitProduct(active)
                            ? 'scale-[1.03] transition-transform duration-500 group-hover:scale-[1.08]'
                            : 'pb-12 transition-transform duration-500 group-hover:scale-105'
                        }
                      />

                      {/* Subtle Bottom Gradient Scrim With Active Item Label */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#161916]/80 via-[#161916]/30 to-transparent px-5 pb-4 pt-12">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#EAE5DA]/90">
                          {active.brand} · {active.season ?? active.surface ?? '2026/27'}
                        </p>
                        <div className="mt-0.5 flex items-baseline justify-between gap-2">
                          <p className="truncate font-sans text-sm font-bold text-white">
                            {active.shortName}
                          </p>
                          <span className="font-mono text-xs font-semibold tabular-nums text-[#F4F2EC]">
                            {formatUsd(active.price)}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  </AnimatePresence>
                </div>

                {/* Minimal Slide Dot Selector Beneath Centerpiece */}
                <div
                  className="mt-3 flex items-center justify-center gap-1.5"
                  role="tablist"
                  aria-label="Hero featured looks"
                >
                  {items.map((item, idx) => {
                    const isCurrent = idx === activeIndex % items.length;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={isCurrent}
                        aria-label={`Show ${item.shortName}`}
                        onClick={() => {
                          setDirection(idx >= activeIndex ? 1 : -1);
                          setActiveIndex(idx);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          isCurrent
                            ? 'w-7 bg-[#FAF9F5]'
                            : 'w-2 bg-[#FAF9F5]/45 hover:bg-[#FAF9F5]/80'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: 3-Icon Value Pillars + Floating "Featured Look" Card + Circular Next Button */}
            <div className="order-3 lg:col-span-4 flex flex-col items-center lg:items-end justify-between lg:min-h-[430px] gap-6">
              {/* Top 3-Icon Value Proposition Row */}
              <div className="grid w-full max-w-[300px] grid-cols-3 gap-3 pt-1">
                <div className="flex flex-col items-center text-center">
                  <Shirt className="h-5 w-5 text-[#FAF9F5]" strokeWidth={1.8} />
                  <span className="mt-2 text-[11px] font-medium leading-tight text-[#FAF9F5]/95">
                    Authentic
                    <br />
                    Quality
                  </span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <ShieldCheck className="h-5 w-5 text-[#FAF9F5]" strokeWidth={1.8} />
                  <span className="mt-2 text-[11px] font-medium leading-tight text-[#FAF9F5]/95">
                    15-Min Pro
                    <br />
                    Heat-Press
                  </span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <Gem className="h-5 w-5 text-[#FAF9F5]" strokeWidth={1.8} />
                  <span className="mt-2 text-[11px] font-medium leading-tight text-[#FAF9F5]/95">
                    Limited
                    <br />
                    26/27 Drop
                  </span>
                </div>
              </div>

              {/* Floating "Featured Look" White Product Card with Right Circular Next Arrow */}
              <div className="relative w-full max-w-[275px] pr-2 lg:pr-0">
                <p className="mb-2.5 text-center text-[13px] font-medium tracking-[0.02em] text-[#FAF9F5]">
                  Featured Look
                </p>

                <div className="relative rounded-[26px] bg-[#FAF9F5] p-3 shadow-[0_18px_36px_rgba(14,17,19,0.16)]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={featuredLook.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <button
                        type="button"
                        onClick={() => openProduct(featuredLook)}
                        aria-label={`View ${featuredLook.name}`}
                        className="group block w-full overflow-hidden rounded-[18px] bg-[#DCE2E7] aspect-[4/3] cursor-pointer"
                      >
                        <ProductMedia
                          product={featuredLook}
                          loading="eager"
                          fit={isKitProduct(featuredLook) ? 'cover' : 'contain'}
                          className="h-full w-full bg-[#DCE2E7]"
                          imgClassName={
                            isKitProduct(featuredLook)
                              ? 'transition-transform duration-300 group-hover:scale-105'
                              : 'p-2 transition-transform duration-300 group-hover:scale-105'
                          }
                        />
                      </button>

                      <div className="mt-3 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => openProduct(featuredLook)}
                          className="block w-full truncate font-sans text-[15px] font-bold text-[#1A1D1A] hover:text-[#6D7768] transition-colors cursor-pointer"
                        >
                          {featuredLook.shortName}
                        </button>
                        <p className="mt-0.5 truncate text-[12px] text-[#666B63]">
                          {featuredSubtitle}
                        </p>

                        {/* Sage-Olive Rounded Pill Price / Add-to-Bag Button */}
                        <button
                          type="button"
                          onClick={handleFeaturedQuickAdd}
                          aria-label={`Add ${featuredLook.shortName} to bag for ${formatUsd(featuredLook.price)}`}
                          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#6E7768] px-5 font-mono text-[13px] font-semibold tabular-nums text-[#FAF9F5] transition-colors duration-200 hover:bg-[#1B1E1B] cursor-pointer whitespace-nowrap"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2} />
                          <span>{formatUsd(featuredLook.price)}</span>
                        </button>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Circular White Next Carousel Button Perched on Right Edge */}
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label="Next featured look"
                    title="Next featured look"
                    className="absolute -right-4 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#0E1113]/10 bg-[#FFFFFF] text-[#1A1D1A] shadow-[0_6px_16px_rgba(14,17,19,0.16)] transition-all duration-200 hover:scale-105 hover:bg-[#1B1E1B] hover:text-white cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
