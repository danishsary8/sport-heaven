import { useState } from 'react';
import { ArrowRight, BookOpen, MapPin, Shirt, ShoppingBag, Sparkles, Star } from 'lucide-react';
import {
  BRANCHES,
  COMMUNITY_REVIEWS,
  PRODUCTS,
  STUDIO_IMAGES,
} from '../data/catalog';
import { BLOG_ARTICLES, BRAND_PROFILES, CAMPAIGN_LANDINGS } from '../data/editorial';
import { MATCHDAY_LOOKBOOKS } from '../data/lookbooks';
import { useStore } from '../context/StoreContext';
import { calculateLookbookBundlePricing, formatUsd, isKitProduct } from '../utils/commerce';
import { runWithViewTransition } from '../hooks/useViewTransition';
import {
  JerseyPreviewSvg,
  KitAutoShiftCarousel,
  KitProductCard,
  ProductCard,
  StudioHero,
} from '../components/product';

type CollectionTab = 'trending' | 'ucl' | 'boots' | 'jerseys' | 'f1' | 'balls';

export function HomePage() {
  const { navigate, navigateToShop, addBundleToCart } = useStore();
  const [activeTab, setActiveTab] = useState<CollectionTab>('trending');
  const [previewKitIdx, setPreviewKitIdx] = useState(0);

  const previewKits = [
    {
      product: PRODUCTS.find((p) => p.id === 'jersey-barca-2627-home') ?? PRODUCTS[0],
      sampleName: 'YAMAL',
      sampleNum: '10',
      patch: 'ucl' as const,
    },
    {
      product: PRODUCTS.find((p) => p.id === 'jersey-madrid-2627-home') ?? PRODUCTS[0],
      sampleName: 'BELLINGHAM',
      sampleNum: '5',
      patch: 'ucl' as const,
    },
    {
      product: PRODUCTS.find((p) => p.id === 'jersey-cambodia-home') ?? PRODUCTS[0],
      sampleName: 'VATHANAKA',
      sampleNum: '11',
      patch: 'cpl' as const,
    },
    {
      product: PRODUCTS.find((p) => p.id === 'f1-ferrari-team-jersey') ?? PRODUCTS[0],
      sampleName: 'LECLERC',
      sampleNum: '16',
      patch: 'f1-paddock' as const,
    },
  ];
  const currentPreview = previewKits[previewKitIdx];

  const tabProducts = (() => {
    switch (activeTab) {
      case 'ucl':
        return PRODUCTS.filter((p) => p.isChampionsLeague).slice(0, 8);
      case 'boots':
        return PRODUCTS.filter((p) => p.category === 'boots').slice(0, 8);
      case 'jerseys':
        return PRODUCTS.filter((p) => p.category === 'jerseys').slice(0, 8);
      case 'f1':
        return PRODUCTS.filter((p) => p.category === 'f1');
      case 'balls':
        return PRODUCTS.filter(
          (p) => p.category === 'balls' || p.category === 'essentials',
        ).slice(0, 8);
      case 'trending':
      default:
        return PRODUCTS.filter((p) => p.isFeatured).slice(0, 8);
    }
  })();

  const handleTabSwitch = (nextTab: CollectionTab) => {
    runWithViewTransition(() => setActiveTab(nextTab));
  };

  const pickByIds = (ids: string[]) =>
    ids
      .map((id) => PRODUCTS.find((p) => p.id === id))
      .filter((p): p is (typeof PRODUCTS)[number] => Boolean(p));

  // Row 1: 4 Best-Selling Kits (KitProductCard 3:4); Row 2: 4 Best-Selling Boots & Balls (ProductCard 4:3)
  const bestSellers = pickByIds([
    'jersey-barca-2627-home',
    'jersey-madrid-2627-home',
    'jersey-france-2627-home',
    'jersey-cambodia-home',
    'boot-adidas-f50-messi-fg',
    'boot-predator-25-elite-ft',
    'boot-mercurial-superfly-10',
    'ball-adidas-ucl-2627-pro',
  ]);

  // Row 1: 4 New-Arrival Kits & F1 Jackets (KitProductCard 3:4); Row 2: 4 New-Arrival National/Retro Kits (KitProductCard 3:4)
  const newArrivals = pickByIds([
    'jersey-japan-2627-home',
    'jersey-brazil-2627-home',
    'f1-ferrari-paddock-jacket',
    'f1-mclaren-paddock-jacket',
    'jersey-spain-2627-home',
    'jersey-germany-2627-home',
    'jersey-barca-1999-retro',
    'jersey-brazil-2002-retro',
  ]);

  const surfaceCards = [
    {
      code: 'FG',
      title: 'Firm Natural Grass',
      subtitle: 'Olympic Stadium & full-size grass pitches',
      detail: 'F50 Messi · Predator 25 · Mercurial · Ultra 5 Carbon',
      action: () => navigateToShop({ category: 'boots', surface: 'FG' }),
    },
    {
      code: 'AG',
      title: 'Artificial Grass 3G / 4G',
      subtitle: 'Hollow conical studs for modern synthetic pitches',
      detail: 'Mercurial Vapor 16 AG · Phantom GX 2 AG · Alpha MIJ',
      action: () => navigateToShop({ category: 'boots', surface: 'AG' }),
    },
    {
      code: 'TF / MG',
      title: 'Studded Turf & Multi-Ground',
      subtitle: 'Low-profile studded cleats for 5v5 & 7v7 leagues',
      detail: 'Tiempo Legend 10 Cleat · Puma King Ultimate · Future 7',
      action: () => navigateToShop({ category: 'boots', surface: 'TF' }),
    },
    {
      code: 'F1',
      title: 'F1 Jerseys & Jackets',
      subtitle: '2026 team jerseys (2 colorways) & paddock jackets',
      detail: 'Ferrari · Red Bull · Mercedes-AMG · McLaren',
      action: () => navigateToShop({ category: 'f1' }),
    },
  ];

  return (
    <div className="animate-page-enter">
      {/* 1. STUDIO HERO STAGE */}
      <StudioHero />

      {/* 2. MINIMALIST OFFICIAL PARTNER BRAND BAR */}
      <section
        aria-label="Shop by official brand"
        className="border-b border-[#0E1113]/10 bg-[#FDFCF9]"
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-5">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            {BRAND_PROFILES.map((brand) => (
              <button
                key={brand.slug}
                type="button"
                onClick={() => navigate({ page: 'brand', slug: brand.slug })}
                className="group relative py-1 text-left transition-colors cursor-pointer"
              >
                <span className="font-wordmark text-[13px] uppercase tracking-[0.16em] text-[#0E1113]/75 group-hover:text-[#0E1113] transition-colors">
                  {brand.name}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-[1px] origin-left scale-x-0 bg-[#0E1113] transition-transform duration-200 group-hover:scale-x-100"
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2B. DEDICATED BEST SELLERS SHOWCASE */}
      <section
        aria-label="Best Sellers"
        className="border-b border-[#0E1113]/10 bg-[#FFFFFF] py-14 sm:py-16"
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-9">
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#5A5D57]">
                Most Wanted · Phnom Penh
              </p>
              <h2 className="mt-1.5 font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#0E1113]">
                Best{' '}
                <span className="font-editorial font-normal italic normal-case text-[#0E1113]/75">
                  Sellers
                </span>
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                navigateToShop({
                  collectionSlug: 'best-sellers',
                  category: 'all',
                  bestSellersOnly: true,
                })
              }
              className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E1113] hover:text-[#C8232C] transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <span>View All Best Sellers</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {bestSellers.map((product, idx) =>
              isKitProduct(product) ? (
                <KitProductCard key={product.id} product={product} priority={idx < 4} />
              ) : (
                <ProductCard key={product.id} product={product} />
              ),
            )}
          </div>
        </div>
      </section>

      {/* 2C. DEDICATED NEW ARRIVALS SHOWCASE */}
      <section
        aria-label="New Arrivals"
        className="border-b border-[#0E1113]/10 bg-[#F4F2EC] py-14 sm:py-16"
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-9">
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#5A5D57]">
                Just Landed · 2026/27 Season
              </p>
              <h2 className="mt-1.5 font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#0E1113]">
                New{' '}
                <span className="font-editorial font-normal italic normal-case text-[#0E1113]/75">
                  Arrivals
                </span>
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                navigateToShop({
                  collectionSlug: 'new-arrivals',
                  category: 'all',
                  newArrivalsOnly: true,
                })
              }
              className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E1113] hover:text-[#C8232C] transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <span>Shop All New Arrivals</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {newArrivals.map((product) =>
              isKitProduct(product) ? (
                <KitProductCard key={product.id} product={product} />
              ) : (
                <ProductCard key={product.id} product={product} />
              ),
            )}
          </div>
        </div>
      </section>

      {/* 2D. MINIMALIST AUTO-SHIFT KIT CAROUSEL — 2026/27 EUROPEAN & UCL DROP */}
      <KitAutoShiftCarousel
        eyebrow="MINIMALIST KIT ATELIER · 2026/27 EUROPEAN DROP"
        title="UEFA Champions League"
        editorialAccent="& Top 5 Kits"
        products={PRODUCTS.filter(
          (p) => p.category === 'jerseys' && p.isChampionsLeague,
        ).slice(0, 10)}
        autoShiftMs={4200}
        surface="white"
        onViewAll={() =>
          navigateToShop({ collectionSlug: 'ucl-2026-27', category: 'jerseys', uclOnly: true })
        }
        viewAllLabel="Explore All UCL Kits"
      />

      {/* 2E. MINIMALIST AUTO-SHIFT KIT CAROUSEL — NATIONAL TEAMS & 2026 F1 PADDOCK */}
      <KitAutoShiftCarousel
        eyebrow="INTERNATIONAL & MOTORSPORT · EUROPE · SOUTH AMERICA · ASIA/ASEAN"
        title="National Teams"
        editorialAccent="& 2026 F1 Paddock"
        products={PRODUCTS.filter(
          (p) =>
            p.league === 'International' ||
            p.category === 'f1',
        ).slice(0, 12)}
        autoShiftMs={4800}
        surface="alabaster"
        onViewAll={() =>
          navigateToShop({
            collectionSlug: 'national-teams',
            category: 'jerseys',
            league: 'International',
          })
        }
        viewAllLabel="Shop National Team Kits"
      />

      {/* 3. PLAYING SURFACE & F1 QUICK-SELECTOR STRIP */}
      <section
        aria-label="Shop by Playing Surface and Collection"
        className="border-b border-[#0E1113]/10 bg-[#FDFCF9]"
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#5A5D57]">
                Soccer Boots &amp; Pitch Surfaces
              </p>
              <h2 className="mt-1.5 font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#0E1113]">
                Studded Cleats for Every{' '}
                <span className="font-editorial font-normal italic normal-case text-[#0E1113]/75">
                  Pitch &amp; Paddock
                </span>
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate({ page: 'boot-finder' })}
              className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E1113] hover:text-[#C8232C] transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <span>Launch Pitch Boot Finder</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {surfaceCards.map((card) => (
              <button
                key={card.code}
                type="button"
                onClick={card.action}
                className="group flex flex-col justify-between border border-[#0E1113]/10 bg-[#F4F2EC]/70 p-6 text-left transition-colors duration-200 hover:border-[#0E1113]/45 hover:bg-[#FDFCF9] cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold tracking-[0.16em] text-[#0E1113]">
                      {card.code}
                    </span>
                    <ArrowRight className="h-4 w-4 text-[#0E1113]/40 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#0E1113]" />
                  </div>
                  <h3 className="mt-3.5 font-display text-xl font-extrabold uppercase text-[#0E1113]">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#5A5D57]">
                    {card.subtitle}
                  </p>
                </div>
                <p className="mt-5 border-t border-[#0E1113]/8 pt-3 font-mono text-[10.5px] text-[#5A5D57]">
                  {card.detail}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FEATURED & TRENDING CATALOG GRID */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-16">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-7">
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#5A5D57]">
              Curated Inventory · {PRODUCTS.length} Authentic Items
            </p>
            <h2 className="mt-1.5 font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#0E1113]">
              Soccer Boots, Kits{' '}
              <span className="font-editorial font-normal italic normal-case text-[#0E1113]/75">
                &amp; F1 Teamwear
              </span>
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Featured collections"
            className="flex items-center gap-5 overflow-x-auto border-b border-[#0E1113]/12"
          >
            {(
              [
                ['trending', 'Trending'],
                ['boots', '15 Soccer Boots'],
                ['ucl', '2026/27 UCL'],
                ['jerseys', 'Football Kits'],
                ['f1', 'F1 Teamwear'],
                ['balls', 'Balls & GK'],
              ] as Array<[CollectionTab, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => handleTabSwitch(key)}
                className={`relative pb-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === key
                    ? 'text-[#0E1113]'
                    : 'text-[#5A5D57] hover:text-[#0E1113]'
                }`}
              >
                {label}
                {activeTab === key && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-[#0E1113]"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-Category Direct Jump Bar */}
        <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#0E1113]/8 pb-4 text-xs">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5A5D57]">
            Browse:
          </span>
          {(
            [
              {
                label: 'Europe Nations',
                action: () =>
                  navigateToShop({
                    collectionSlug: 'national-teams',
                    category: 'jerseys',
                    league: 'International',
                    nationalRegion: 'Europe',
                  }),
              },
              {
                label: 'South America Nations',
                action: () =>
                  navigateToShop({
                    collectionSlug: 'national-teams',
                    category: 'jerseys',
                    league: 'International',
                    nationalRegion: 'South America',
                  }),
              },
              {
                label: 'Asia / ASEAN Nations',
                action: () =>
                  navigateToShop({
                    collectionSlug: 'national-teams',
                    category: 'jerseys',
                    league: 'International',
                    nationalRegion: 'Asia / ASEAN',
                  }),
              },
              {
                label: 'Retro Archive',
                action: () =>
                  navigateToShop({
                    collectionSlug: 'retro-jerseys',
                    category: 'jerseys',
                    retroOnly: true,
                  }),
              },
              {
                label: 'Limited Edition',
                action: () =>
                  navigateToShop({
                    collectionSlug: 'limited-edition',
                    category: 'all',
                    limitedEditionOnly: true,
                  }),
              },
              {
                label: 'F1 Paddock Jackets',
                action: () =>
                  navigateToShop({
                    collectionSlug: 'f1-jackets',
                    category: 'f1',
                    f1GarmentType: 'jacket',
                  }),
              },
              {
                label: 'UEFA Champions League',
                action: () => navigateToShop({ category: 'jerseys', uclOnly: true }),
              },
              {
                label: 'La Liga',
                action: () => navigateToShop({ category: 'jerseys', league: 'La Liga' }),
              },
              {
                label: 'Premier League',
                action: () => navigateToShop({ category: 'jerseys', league: 'Premier League' }),
              },
            ]
          ).map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className="font-medium text-[#0E1113]/80 hover:text-[#0E1113] underline-offset-4 hover:underline transition-colors cursor-pointer whitespace-nowrap"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          key={activeTab}
          className="animate-swatch-morph grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {tabProducts.map((product) =>
            isKitProduct(product) &&
            (activeTab === 'ucl' || activeTab === 'jerseys' || activeTab === 'f1') ? (
              <KitProductCard key={product.id} product={product} />
            ) : (
              <ProductCard key={product.id} product={product} />
            ),
          )}
        </div>

        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={() => navigateToShop({ category: 'all' })}
            className="inline-flex h-12 items-center gap-3 border border-[#0E1113] bg-[#FDFCF9] px-7 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#0E1113] hover:bg-[#0E1113] hover:text-[#FDFCF9] transition-colors cursor-pointer"
          >
            <span>Explore Full {PRODUCTS.length}-Product Catalog</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* 5. SHOP THE MATCHDAY LOOK */}
      <section className="border-y border-[#0E1113]/10 bg-[#FFFFFF] py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-9">
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#5A5D57]">
                Curated Matchday Packs · Save 10%
              </p>
              <h2 className="mt-1.5 font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#0E1113]">
                Complete Matchday{' '}
                <span className="font-editorial font-normal italic normal-case text-[#0E1113]/75">
                  Lookbooks
                </span>
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate({ page: 'lookbooks' })}
              className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E1113] hover:text-[#C8232C] transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <span>Inspect All Lookbooks</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {MATCHDAY_LOOKBOOKS.map((bundle) => {
              const pricing = calculateLookbookBundlePricing(
                bundle.productIds,
                bundle.discountPercent,
                PRODUCTS,
              );
              return (
                <article
                  key={bundle.id}
                  className="group flex flex-col overflow-hidden border border-[#0E1113]/10 bg-[#FDFCF9] transition-colors duration-200 hover:border-[#0E1113]/45"
                >
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'lookbooks' })}
                    className="relative aspect-[4/3] w-full overflow-hidden bg-[#EFECE6] text-left cursor-pointer"
                  >
                    <img
                      src={bundle.heroImage}
                      alt={bundle.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 bg-[#0E1113] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#E5C56A]">
                      -{bundle.discountPercent}% Pack
                    </span>
                  </button>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#5A5D57]">
                      {bundle.tag}
                    </p>
                    <h3 className="mt-1 font-display text-base font-bold text-[#0E1113]">
                      {bundle.title}
                    </h3>
                    <p className="mt-1 flex-1 text-xs leading-relaxed text-[#5A5D57]">
                      {bundle.subtitle}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-[#0E1113]/8 pt-3">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-sm font-semibold tabular-nums text-[#0E1113]">
                          {formatUsd(pricing.bundleTotal)}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-[#5A5D57] line-through">
                          {formatUsd(pricing.originalTotal)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => addBundleToCart(pricing.items, bundle.title)}
                        className="inline-flex h-8 items-center gap-1.5 bg-[#0E1113] px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#FDFCF9] hover:bg-[#C8232C] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <ShoppingBag className="h-3 w-3" />
                        <span>Add Pack</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. SAME-DAY CUSTOM PRINTING STUDIO SHOWCASE */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-16">
        <div className="overflow-hidden border border-[#0E1113]/15 bg-[#0E1113] text-[#FDFCF9]">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 p-8 sm:p-12 lg:p-14">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[#E5C56A]">
                Sonthormuk &amp; Sen Sok Heat-Press Studio
              </p>
              <h2 className="mt-3 font-display text-3xl sm:text-5xl font-extrabold uppercase leading-[1.02] tracking-tight text-balance">
                Custom Name, Number{' '}
                <span className="font-editorial font-normal italic normal-case text-[#EAE7DF]">
                  &amp; Sleeve Patches
                </span>
              </h2>
              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-white/70">
                Personalize your Cambodia Varaman kit, European authentic shirt, or 2026 F1 team jersey in real time. Official thermal polyurethane vinyl pressed in 15–20 minutes — plus automatic 10% squad savings on 5+ team jerseys.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {previewKits.map((entry, idx) => (
                  <button
                    key={entry.product.id}
                    type="button"
                    onClick={() => setPreviewKitIdx(idx)}
                    className={`border px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors cursor-pointer ${
                      previewKitIdx === idx
                        ? 'border-[#FDFCF9] bg-[#FDFCF9] text-[#0E1113]'
                        : 'border-white/20 bg-transparent text-white/75 hover:border-white/50 hover:text-white'
                    }`}
                  >
                    {entry.product.shortName} #{entry.sampleNum}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      page: 'custom-studio',
                      productSlug: currentPreview.product.slug,
                    })
                  }
                  className="inline-flex h-12 items-center gap-2.5 bg-[#FDFCF9] px-6 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#0E1113] hover:bg-[#EAE7DF] transition-colors cursor-pointer"
                >
                  <Shirt className="h-4 w-4" />
                  <span>Open Custom Studio</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      {
                        page: 'product',
                        slug: currentPreview.product.slug,
                      },
                      currentPreview.product.slug,
                    )
                  }
                  className="inline-flex h-12 items-center gap-2 px-3 font-mono text-xs font-medium uppercase tracking-[0.1em] text-white/75 hover:text-white cursor-pointer"
                >
                  <span>Inspect {currentPreview.product.shortName}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[#15191D] p-8 sm:p-10 border-t lg:border-t-0 lg:border-l border-white/10">
              <div key={currentPreview.product.id} className="animate-swatch-morph w-64 sm:w-72">
                <JerseyPreviewSvg
                  theme={currentPreview.product.jerseyTheme!}
                  playerName={currentPreview.sampleName}
                  squadNumber={currentPreview.sampleNum}
                  patch={currentPreview.patch}
                  fontStyle={
                    currentPreview.product.category === 'f1'
                      ? 'motorsport-aero'
                      : 'pro-condensed'
                  }
                />
              </div>
              <p className="mt-3 font-mono text-[11px] text-white/55">
                +$8.00 Custom Print · Ready Same Day in Phnom Penh
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6B. SEASONAL CAMPAIGN & PITCH JOURNAL EDITORIAL STRIP */}
      <section className="border-t border-[#0E1113]/15 bg-[#F4F2EC] py-14">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Active Campaign Banner */}
            <div className="flex flex-col justify-between border border-[#0E1113]/15 bg-[#0E1113] p-7 text-[#FDFCF9] lg:col-span-5">
              <div>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.22em] text-[#B8933B] uppercase">
                  <Sparkles className="h-3.5 w-3.5" />
                  ACTIVE SEASONAL DROP
                </span>
                <h2 className="mt-3 font-display text-4xl leading-[0.92] font-extrabold uppercase">
                  {CAMPAIGN_LANDINGS[0].title}{' '}
                  <span className="font-editorial font-normal italic text-[#EAE7DF] normal-case">
                    {CAMPAIGN_LANDINGS[0].italicAccent}
                  </span>
                </h2>
                <p className="mt-3 text-xs leading-relaxed text-[#FDFCF9]/70">
                  {CAMPAIGN_LANDINGS[0].subtitle}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    navigate({ page: 'campaign', slug: CAMPAIGN_LANDINGS[0].slug })
                  }
                  className="inline-flex items-center gap-2 bg-[#C8232C] px-5 py-3 font-mono text-[11px] font-bold tracking-[0.14em] text-[#FDFCF9] uppercase hover:bg-[#FDFCF9] hover:text-[#0E1113] cursor-pointer"
                >
                  Shop Campaign Drop <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'gift-card' })}
                  className="border border-[#FDFCF9]/25 px-4 py-3 font-mono text-[11px] font-semibold tracking-[0.14em] text-[#FDFCF9] uppercase hover:border-[#FDFCF9] cursor-pointer"
                >
                  Gift Cards
                </button>
              </div>
            </div>

            {/* Pitch Journal Editorial Cards */}
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-7 lg:col-span-7">
              <div className="flex items-center justify-between border-b border-[#0E1113]/12 pb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#C8232C]" />
                  <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#0E1113] uppercase">
                    THE PITCH JOURNAL · PHNOM PENH GUIDES
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'blog' })}
                  className="font-mono text-[11px] font-bold text-[#0E1113] uppercase hover:text-[#C8232C] cursor-pointer"
                >
                  All Guides →
                </button>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {BLOG_ARTICLES.slice(0, 2).map((article) => (
                  <article
                    key={article.slug}
                    onClick={() =>
                      navigate({ page: 'blog-post', slug: article.slug })
                    }
                    className="group cursor-pointer border border-[#0E1113]/12 bg-[#F4F2EC] p-4 transition hover:border-[#0E1113]"
                  >
                    <p className="font-mono text-[10px] font-bold text-[#C8232C] uppercase">
                      {article.category} · {article.readMinutes} MIN
                    </p>
                    <h3 className="mt-1.5 font-display text-xl leading-[1.05] font-extrabold text-[#0E1113] uppercase group-hover:text-[#C8232C]">
                      {article.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs text-[#0E1113]/65">
                      {article.excerpt}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PHNOM PENH PITCH COMMUNITY & 3 BRANCHES */}
      <section className="border-t border-[#0E1113]/10 bg-[#FDFCF9] py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <div className="relative overflow-hidden border border-[#0E1113]/15 bg-[#0E1113] mb-12">
            <img
              src={STUDIO_IMAGES.pitchEditorial}
              alt="Floodlit artificial turf football pitch in Phnom Penh at dusk"
              referrerPolicy="no-referrer"
              className="h-[280px] sm:h-[360px] w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E1113]/92 via-[#0E1113]/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-xl text-white">
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[#E5C56A]">
                  Phnom Penh Football Community
                </p>
                <h2 className="mt-2 font-display text-2xl sm:text-4xl font-extrabold uppercase leading-tight">
                  Three Branches Built Around Matchday
                </h2>
                <p className="mt-2 text-sm text-white/75">
                  Try your exact boot fit on our turf test strip, print squad kits while you wait, or dispatch same-day delivery across all 12 Phnom Penh Khans.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate({ page: 'branches' })}
                className="inline-flex h-11 shrink-0 items-center gap-2 bg-[#FDFCF9] px-5 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#0E1113] hover:bg-[#EAE7DF] transition-colors cursor-pointer self-start md:self-auto"
              >
                <MapPin className="h-4 w-4" />
                <span>View All 3 Branches</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {COMMUNITY_REVIEWS.map((review) => (
              <article
                key={review.id}
                className="flex flex-col border border-[#0E1113]/10 bg-[#F4F2EC]/65 p-5"
              >
                <div className="flex items-center gap-0.5 text-[#B8933B]" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: review.rating }).map((_, idx) => (
                    <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[#0E1113]">
                  &ldquo;{review.comment}&rdquo;
                </p>
                <div className="mt-4 border-t border-[#0E1113]/8 pt-3">
                  <p className="text-xs font-semibold text-[#0E1113]">{review.author}</p>
                  <p className="text-[11px] text-[#5A5D57]">
                    {review.role} · {review.pitchLocation}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#0E1113]/10 pt-8">
            {BRANCHES.map((branch) => (
              <div
                key={branch.id}
                className="flex flex-col justify-between border border-[#0E1113]/10 bg-[#FDFCF9] p-5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-bold uppercase text-[#0E1113]">
                      {branch.name}
                    </h3>
                    <span className="font-mono text-[10.5px] text-[#5A5D57] font-medium">
                      08:30 – 20:30
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#5A5D57]">
                    {branch.address}, {branch.district}
                  </p>
                  <p className="mt-2 text-xs font-medium text-[#0E1113]">
                    {branch.highlight}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#0E1113]/8 pt-3 text-xs">
                  <span className="font-mono text-[#5A5D57]">{branch.phone}</span>
                  <button
                    type="button"
                    onClick={() => navigateToShop({ branch: branch.id })}
                    className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0E1113] hover:text-[#C8232C] transition-colors cursor-pointer"
                  >
                    Shop Branch →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
