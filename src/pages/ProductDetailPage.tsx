import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  MessageCircle,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Ruler,
  Shirt,
  ShoppingBag,
  Star,
  Truck,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  COMMUNITY_REVIEWS,
} from '../data/catalog';
import type { CatalogProduct } from '../lib/mock-store/catalog';
import { useStore } from '../context/StoreContext';
import { useProductSeo } from '../hooks/useProductSeo';
import { useTransitionSkeleton } from '../hooks/useTransitionSkeleton';
import type {
  CustomPrintConfig,
  JerseyFontStyle,
  JerseyPatchId,
} from '../types/store';
import {
  CUSTOM_PRINT_BASE_FEE,
  formatKhr,
  formatUsd,
  getCartItemUnitPrice,
  getProductSiblings,
  isKitProduct,
  PATCH_OPTIONS,
  sanitizePlayerName,
  sanitizeSquadNumber,
} from '../utils/commerce';
import {
  JerseyPreviewSvg,
  KitPdpView,
  ProductCard,
  ProductDetailSkeleton,
  ProductDetailsTable,
  ProductMedia,
  YouMayAlsoLikeCarousel,
} from '../components/product';

interface ProductDetailPageProps {
  slug: string;
}

type GalleryView = 'studio' | 'detail' | 'spin-360' | 'back-preview';

export function ProductDetailPage({ slug }: ProductDetailPageProps) {
  const { catalog, getProductBySlug } = useStore();
  const product = getProductBySlug(slug) ?? catalog[0];
  const isDetailLoading = useTransitionSkeleton(`pdp:${product.id}`, 260);
  const prefersReducedMotion = Boolean(useReducedMotion());

  // Dynamically synchronize <title>, description, OpenGraph, Twitter Cards & Product JSON-LD
  useProductSeo(product);

  const isKit = isKitProduct(product);

  if (isDetailLoading) {
    return <ProductDetailSkeleton variant={isKit ? 'kit' : 'technical'} />;
  }

  return (
    <motion.div
      key={product.id}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Apply the minimalist Kit Atelier PDP strictly to Jerseys & Kits */}
      {isKit ? (
        <KitPdpView product={product} />
      ) : (
        <StandardProductDetailView product={product} />
      )}
    </motion.div>
  );
}

function StandardProductDetailView({
  product,
}: {
  product: CatalogProduct;
}) {
  const {
    catalog,
    branches,
    getProductById,
    navigate,
    navigateToShop,
    addToCart,
    toggleWishlist,
    isWishlisted,
    openSizeGuide,
    recentlyViewed,
    recordProductView,
    memberProfile,
    productQuestions,
    addProductQuestion,
  } = useStore();

  const getInitialSize = () => {
    if (
      product.category === 'boots' &&
      product.sizes.includes(memberProfile.preferredBootSize)
    ) {
      return memberProfile.preferredBootSize;
    }
    if (
      (product.category === 'jerseys' || product.category === 'f1') &&
      product.sizes.includes(memberProfile.preferredJerseySize)
    ) {
      return memberProfile.preferredJerseySize;
    }
    return product.sizes[Math.min(2, product.sizes.length - 1)] ?? product.sizes[0];
  };

  const prefersReducedMotion = useReducedMotion();
  const [selectedSize, setSelectedSize] = useState(getInitialSize);
  const [quantity, setQuantity] = useState(1);
  const [activeView, setActiveView] = useState<GalleryView>('studio');
  const [viewDir, setViewDir] = useState<1 | -1>(1);
  const [spinAngle, setSpinAngle] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [feedbackTab, setFeedbackTab] = useState<'reviews' | 'qa'>('reviews');
  const [qaAuthor, setQaAuthor] = useState(memberProfile.fullName);
  const [qaQuestion, setQaQuestion] = useState('');

  // Live Custom Jersey Printing State
  const [printEnabled, setPrintEnabled] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [squadNumber, setSquadNumber] = useState('10');
  const [patch, setPatch] = useState<JerseyPatchId>(
    product.isChampionsLeague ? 'ucl' : 'none',
  );
  const [fontStyle, setFontStyle] = useState<JerseyFontStyle>(
    product.category === 'f1' ? 'motorsport-aero' : 'pro-condensed',
  );

  useEffect(() => {
    setSelectedSize(getInitialSize());
    setQuantity(1);
    setActiveView('studio');
    setPrintEnabled(false);
    setPlayerName('');
    setSquadNumber(product.category === 'f1' ? '16' : '10');
    setPatch(product.isChampionsLeague ? 'ucl' : 'none');
    setFontStyle(product.category === 'f1' ? 'motorsport-aero' : 'pro-condensed');
    recordProductView(product.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const saved = isWishlisted(product.id);
  const siblings = useMemo(
    () => getProductSiblings(catalog, product),
    [catalog, product],
  );

  const views: GalleryView[] = product.jerseyTheme
    ? ['studio', 'detail', 'spin-360', 'back-preview']
    : ['studio', 'detail', 'spin-360'];

  const selectView = (next: GalleryView) => {
    const curIdx = views.indexOf(activeView);
    const nextIdx = views.indexOf(next);
    setViewDir(nextIdx >= curIdx ? 1 : -1);
    setActiveView(next);
  };

  const stepView = (delta: 1 | -1) => {
    const idx = views.indexOf(activeView);
    const next = views[(idx + delta + views.length) % views.length];
    setViewDir(delta);
    setActiveView(next);
  };

  const customPrintConfig: CustomPrintConfig | undefined =
    product.customizable && printEnabled
      ? {
          enabled: true,
          playerName: sanitizePlayerName(playerName),
          squadNumber: sanitizeSquadNumber(squadNumber),
          patch,
          fontStyle,
        }
      : undefined;

  const unitPrice = getCartItemUnitPrice(product.price, customPrintConfig);
  const discountPct =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100,
        )
      : 0;

  const recentlyViewedProducts = recentlyViewed
    .filter((id) => id !== product.id)
    .map((id) => getProductById(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 4);

  const itemReviews = COMMUNITY_REVIEWS.filter(
    (r) => r.productId === product.id,
  );
  const displayReviews =
    itemReviews.length > 0 ? itemReviews : COMMUNITY_REVIEWS.slice(0, 2);

  const handleTogglePrint = (enabled: boolean) => {
    setPrintEnabled(enabled);
    if (enabled && product.jerseyTheme) {
      setActiveView('back-preview');
    } else if (!enabled && activeView === 'back-preview') {
      setActiveView('studio');
    }
  };

  return (
    <div className="animate-page-enter mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-[#56616A]"
      >
        <button
          type="button"
          onClick={() => navigate({ page: 'home' })}
          className="hover:text-[#18222D] cursor-pointer"
        >
          Home
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <button
          type="button"
          onClick={() => navigateToShop({ category: product.category })}
          className="hover:text-[#18222D] cursor-pointer"
        >
          {CATEGORY_LABELS[product.category]}
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-[#18222D] truncate">{product.name}</span>
      </nav>

      {/* Zando-Inspired Left Vertical Rail + Studio Stage + Sticky Right Buy Panel */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* LEFT GALLERY COLUMN (Vertical Thumbnail Rail + Main Morph Stage) */}
        <div className="lg:col-span-7 lg:sticky lg:top-24">
          <div className="flex flex-col-reverse sm:flex-row gap-3.5">
            {/* Vertical Thumbnail Rail */}
            <div className="flex sm:flex-col gap-2.5 sm:w-24 shrink-0">
              <button
                type="button"
                onClick={() => selectView('studio')}
                className={`group overflow-hidden rounded-lg border bg-[#E5EBF0] p-1 text-left transition-all cursor-pointer flex-1 sm:flex-none ${
                  activeView === 'studio'
                    ? 'border-[#18222D] ring-1 ring-[#18222D]'
                    : 'border-[#18222D]/12 opacity-75 hover:opacity-100'
                }`}
              >
                <ProductMedia product={product} className="aspect-[4/3] w-full rounded" />
                <span className="block px-1 pt-1 text-[10px] font-semibold text-[#18222D] truncate">
                  Studio
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectView('detail')}
                className={`group overflow-hidden rounded-lg border bg-[#E5EBF0] p-1 text-left transition-all cursor-pointer flex-1 sm:flex-none ${
                  activeView === 'detail'
                    ? 'border-[#18222D] ring-1 ring-[#18222D]'
                    : 'border-[#18222D]/12 opacity-75 hover:opacity-100'
                }`}
              >
                <ProductMedia
                  product={product}
                  className="aspect-[4/3] w-full rounded"
                  imgClassName="scale-[1.45]"
                />
                <span className="block px-1 pt-1 text-[10px] font-semibold text-[#18222D] truncate">
                  Detail Zoom
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectView('spin-360')}
                className={`flex flex-col overflow-hidden rounded-lg border bg-[#E5EBF0] p-1 text-left transition-all cursor-pointer flex-1 sm:flex-none ${
                  activeView === 'spin-360'
                    ? 'border-[#18222D] ring-1 ring-[#18222D]'
                    : 'border-[#18222D]/12 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded bg-[#0E1113] text-[#FDFCF9]">
                  <Play className="h-4 w-4 text-[#B8933B]" />
                  <span className="mt-0.5 font-mono text-[9px] font-bold">360°</span>
                </div>
                <span className="block px-1 pt-1 text-[10px] font-semibold text-[#18222D] truncate">
                  360° / Tech
                </span>
              </button>

              {product.jerseyTheme && (
                <button
                  type="button"
                  onClick={() => selectView('back-preview')}
                  className={`flex flex-col overflow-hidden rounded-lg border bg-[#E5EBF0] p-1 text-left transition-all cursor-pointer flex-1 sm:flex-none ${
                    activeView === 'back-preview'
                      ? 'border-[#18222D] ring-1 ring-[#18222D]'
                      : 'border-[#18222D]/12 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex aspect-[4/3] w-full items-center justify-center rounded bg-[#DFE5EB] p-1">
                    <div className="h-full w-14">
                      <JerseyPreviewSvg
                        theme={product.jerseyTheme}
                        playerName={playerName || 'NAME'}
                        squadNumber={squadNumber || '10'}
                        patch={patch}
                        fontStyle={fontStyle}
                        showPrint={true}
                      />
                    </div>
                  </div>
                  <span className="block px-1 pt-1 text-[10px] font-semibold text-[#18222D] truncate">
                    Back Print
                  </span>
                </button>
              )}
            </div>

            {/* Main Shared-Element View Transition Stage */}
            <div
              className="relative flex-1 aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#E5EBF0] border border-[#18222D]/8"
              style={{ viewTransitionName: 'active-product-media' }}
            >
              <AnimatePresence initial={false} custom={viewDir}>
                <motion.div
                  key={`${product.id}-${activeView}`}
                  custom={viewDir}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: viewDir * 28, scale: 1.015 }
                  }
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: viewDir * -28, scale: 0.985 }
                  }
                  transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 h-full w-full"
                >
                  {activeView === 'spin-360' ? (
                    <div className="flex h-full w-full flex-col items-center justify-between bg-[#EAE7DF] p-5 sm:p-6">
                      <div className="flex w-full items-center justify-between font-mono text-[10px] tracking-[0.18em] text-[#0E1113]/65 uppercase">
                        <span>INTERACTIVE 360° ATELIER RIG</span>
                        <span>ANGLE: {spinAngle}°</span>
                      </div>
                      <div
                        className="flex flex-1 items-center justify-center transition-transform duration-150"
                        style={{
                          transform: `perspective(900px) rotateY(${spinAngle}deg) scale(${1 + Math.abs(Math.sin((spinAngle * Math.PI) / 180)) * 0.08})`,
                        }}
                      >
                        <ProductMedia
                          product={product}
                          loading="eager"
                          className="h-48 w-64 sm:h-64 sm:w-80"
                        />
                      </div>
                      <div className="w-full max-w-sm">
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          step={5}
                          value={spinAngle}
                          onChange={(e) => setSpinAngle(Number(e.target.value))}
                          aria-label="Rotate 360 degree product view"
                          className="w-full accent-[#0E1113]"
                        />
                        <div className="mt-1 flex justify-between font-mono text-[10px] text-[#0E1113]/55">
                          <span>-180°</span>
                          <span>DRAG TO INSPECT SILHOUETTE</span>
                          <span>+180°</span>
                        </div>
                      </div>
                    </div>
                  ) : activeView === 'back-preview' && product.jerseyTheme ? (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#EAEFF4] to-[#DCE3EA] p-6">
                      <div className="h-[88%] max-w-[320px] w-full">
                        <JerseyPreviewSvg
                          theme={product.jerseyTheme}
                          playerName={playerName || 'YOUR NAME'}
                          squadNumber={squadNumber || '10'}
                          patch={patch}
                          fontStyle={fontStyle}
                          showPrint={printEnabled}
                        />
                      </div>
                      <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#56616A]">
                        Live Sport Castle Back Print Preview
                      </span>
                    </div>
                  ) : (
                    <ProductMedia
                      product={product}
                      loading="eager"
                      className="h-full w-full"
                      imgClassName={
                        activeView === 'detail'
                          ? 'scale-[1.35] object-center transition-transform duration-500'
                          : 'transition-transform duration-500'
                      }
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Left / Right Gallery Arrows (Zando PDP Slider Style) */}
              <button
                type="button"
                onClick={() => stepView(-1)}
                aria-label="Previous product view"
                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#0B0D10]/75 text-white hover:bg-[#0B0D10] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => stepView(1)}
                aria-label="Next product view"
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#0B0D10]/75 text-white hover:bg-[#0B0D10] transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {activeView !== 'back-preview' && (
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  aria-label="Zoom studio photo"
                  className="absolute bottom-4 right-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-white/92 px-3 text-xs font-semibold text-[#18222D] shadow-sm hover:bg-white cursor-pointer"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                  <span>Zoom</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PURCHASE MODULE */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#56616A]">
              <span>{product.brand}</span>
              {product.league && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{product.league}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{product.colorway}</span>
              {product.surface && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[#032EA1]">{product.surface}</span>
                </>
              )}
              {product.weightGrams && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{product.weightGrams}g</span>
                </>
              )}
            </div>

            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold leading-tight text-[#18222D]">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2.5">
                <span
                  className={`font-mono text-2xl font-bold tabular-nums ${
                    discountPct > 0 ? 'text-[#D81E2B]' : 'text-[#18222D]'
                  }`}
                >
                  {formatUsd(unitPrice)}
                </span>
                {product.originalPrice && (
                  <>
                    <span className="font-mono text-xs font-bold text-[#D81E2B]">
                      -{discountPct}%
                    </span>
                    <span className="font-mono text-sm tabular-nums text-[#56616A] line-through">
                      {formatUsd(product.originalPrice)}
                    </span>
                  </>
                )}
                <span className="font-mono text-xs tabular-nums text-[#56616A]">
                  ≈ {formatKhr(unitPrice)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-[#18222D]">
                <Star className="h-3.5 w-3.5 fill-[#C69C2B] text-[#C69C2B]" />
                <span className="font-mono font-semibold">{product.rating.toFixed(1)}</span>
                <span className="text-[#56616A]">({product.reviewCount})</span>
              </div>
            </div>

            <p className="mt-3.5 text-sm leading-relaxed text-[#56616A]">
              {product.summary}
            </p>
          </div>

          {/* Zando-Inspired Visual Thumbnail Edition / Colorway Switcher */}
          {siblings.length > 1 && (
            <div className="border-t border-[#18222D]/10 pt-5">
              <p className="text-xs font-bold text-[#18222D]">
                {siblings.length}{' '}
                {product.club ? `${product.club} Editions` : `${product.brand} Models`}{' '}
                available
              </p>
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {siblings.map((sib) => {
                  const isCurrent = sib.id === product.id;
                  return (
                    <button
                      key={sib.id}
                      type="button"
                      onClick={() =>
                        navigate({ page: 'product', slug: sib.slug }, sib.slug)
                      }
                      className={`group overflow-hidden rounded-lg border bg-white p-1 text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-[#18222D] ring-1 ring-[#18222D]'
                          : 'border-[#18222D]/15 hover:border-[#18222D]'
                      }`}
                    >
                      <ProductMedia
                        product={sib}
                        className="aspect-[4/3] w-full rounded bg-[#E5EBF0]"
                      />
                      <span className="mt-1 block truncate px-1 pb-0.5 text-[10.5px] font-semibold text-[#18222D]">
                        {sib.kitType ?? sib.shortName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Guide Banner + Size Matrix */}
          <div className="border-t border-[#18222D]/10 pt-5">
            <div className="mb-3 flex items-center justify-between rounded-md bg-[#E8EDF2]/70 px-3.5 py-2.5 text-xs">
              <span className="text-[#18222D]">
                Find the size that fits your measurements
              </span>
              <button
                type="button"
                onClick={() =>
                  openSizeGuide(product.category === 'boots' ? 'boots' : 'jerseys')
                }
                className="inline-flex items-center gap-1 font-semibold text-[#18222D] underline underline-offset-2 hover:text-[#032EA1] cursor-pointer whitespace-nowrap"
              >
                <Ruler className="h-3.5 w-3.5" />
                <span>Size guide</span>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#18222D]">
                Size: <span className="font-mono text-[#032EA1]">{selectedSize}</span>
              </span>
              {(selectedSize === memberProfile.preferredBootSize ||
                selectedSize === memberProfile.preferredJerseySize) && (
                <span className="text-[11px] font-medium text-[#032EA1]">
                  Matches your Club fit profile
                </span>
              )}
            </div>

            <div className="mt-2.5 grid grid-cols-4 sm:grid-cols-5 gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`h-10 rounded-md border font-mono text-xs font-semibold transition-colors cursor-pointer ${
                    selectedSize === size
                      ? 'border-[#18222D] bg-[#18222D] text-white'
                      : 'border-[#18222D]/15 bg-white text-[#18222D] hover:border-[#18222D]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* LIVE CUSTOM JERSEY PRINTING STUDIO */}
          {product.customizable && (
            <div className="rounded-xl border border-[#18222D]/12 bg-white p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Shirt className="mt-0.5 h-4 w-4 shrink-0 text-[#032EA1]" />
                  <div>
                    <h2 className="text-sm font-bold text-[#18222D]">
                      Live Custom Jersey Printing Studio
                    </h2>
                    <p className="text-xs text-[#56616A]">
                      Same-day Phnom Penh pro heat-press (+{formatUsd(CUSTOM_PRINT_BASE_FEE)})
                    </p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printEnabled}
                    onChange={(e) => handleTogglePrint(e.target.checked)}
                    aria-label="Add Same-Day Custom Printing (+$8.00)"
                    className="h-4 w-4 accent-[#18222D]"
                  />
                  <span className="text-xs font-semibold text-[#18222D]">
                    {printEnabled ? 'Enabled' : 'Add +$8'}
                  </span>
                </label>
              </div>

              {printEnabled && (
                <div className="animate-swatch-morph space-y-4 border-t border-[#18222D]/10 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="pdp-player-name"
                        className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#56616A]"
                      >
                        Player / Driver Name (Max 14)
                      </label>
                      <input
                        id="pdp-player-name"
                        type="text"
                        maxLength={14}
                        value={playerName}
                        onChange={(e) => setPlayerName(sanitizePlayerName(e.target.value))}
                        placeholder={
                          product.category === 'f1' ? 'e.g. LECLERC' : 'e.g. VATHANAKA'
                        }
                        className="mt-1.5 h-10 w-full rounded-md border border-[#18222D]/20 bg-[#F5F7F8] px-3 font-mono text-xs font-semibold uppercase text-[#18222D] focus:border-[#18222D] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pdp-squad-number"
                        className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#56616A]"
                      >
                        Number (1–99)
                      </label>
                      <input
                        id="pdp-squad-number"
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={squadNumber}
                        onChange={(e) => setSquadNumber(sanitizeSquadNumber(e.target.value))}
                        placeholder="10"
                        className="mt-1.5 h-10 w-full rounded-md border border-[#18222D]/20 bg-[#F5F7F8] px-3 font-mono text-xs font-semibold text-[#18222D] focus:border-[#18222D] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="pdp-sleeve-patch"
                      className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#56616A]"
                    >
                      Official Sleeve Patch
                    </label>
                    <select
                      id="pdp-sleeve-patch"
                      value={patch}
                      onChange={(e) => setPatch(e.target.value as JerseyPatchId)}
                      className="mt-1.5 h-10 w-full rounded-md border border-[#18222D]/20 bg-[#F5F7F8] px-3 text-xs font-medium text-[#18222D] focus:border-[#18222D] focus:bg-white focus:outline-none"
                    >
                      {PATCH_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label} {opt.fee > 0 ? `(+${formatUsd(opt.fee)})` : '(Included)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#56616A]">
                    <span>Need 5+ printed kits for your Phnom Penh team?</span>
                    <button
                      type="button"
                      onClick={() =>
                        navigate({ page: 'custom-studio', productSlug: product.slug })
                      }
                      className="font-semibold text-[#032EA1] hover:underline cursor-pointer"
                    >
                      Open Team Batch Studio →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity + Primary Add to Bag CTA */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 items-center rounded-md border border-[#18222D]/20 bg-white">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="inline-flex h-full w-10 items-center justify-center text-[#18222D] hover:bg-[#F5F7F8] cursor-pointer"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-9 text-center font-mono text-sm font-semibold tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(25, q + 1))}
                aria-label="Increase quantity"
                className="inline-flex h-full w-10 items-center justify-center text-[#18222D] hover:bg-[#F5F7F8] cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                addToCart(product, selectedSize, quantity, customPrintConfig, true)
              }
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-[#18222D] px-6 text-sm font-semibold text-white hover:bg-[#0B0D10] transition-colors cursor-pointer active:scale-[0.99]"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Add to Bag — {formatUsd(unitPrice * quantity)}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label={saved ? 'Remove from saved gear' : 'Save to wishlist'}
              className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md border transition-colors cursor-pointer ${
                saved
                  ? 'border-[#D81E2B] bg-[#D81E2B] text-white'
                  : 'border-[#18222D]/20 bg-white text-[#18222D] hover:border-[#18222D]'
              }`}
            >
              <Heart className="h-5 w-5" fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Zando-Inspired Trust Bar (Express Shipping & 14-Day Fit Exchange) */}
          <div className="grid grid-cols-2 gap-3 border-y border-[#18222D]/10 py-3.5 text-xs text-[#18222D]">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 shrink-0 text-[#032EA1]" />
              <span>Same-Day Phnom Penh Express</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 shrink-0 text-[#032EA1]" />
              <span>14-Day Unworn Size Exchange</span>
            </div>
          </div>

          {/* Real-time Phnom Penh Branch Stock Checker */}
          <div className="rounded-xl border border-[#18222D]/10 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#18222D]" />
                <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[#18222D]">
                  Phnom Penh Branch Stock Checker
                </h2>
              </div>
              <span className="text-[11px] text-[#56616A]">Open 8:30 AM – 8:30 PM</span>
            </div>

            <div className="divide-y divide-[#18222D]/8">
              {branches.map((branch) => {
                const status = product.branchStock[branch.id];
                return (
                  <div
                    key={branch.id}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#18222D]">{branch.name}</p>
                      <p className="text-[11px] text-[#56616A]">{branch.address}</p>
                    </div>
                    <span
                      className={`font-semibold whitespace-nowrap ${
                        status === 'In Stock'
                          ? 'text-[#032EA1]'
                          : status === 'Limited Stock'
                            ? 'text-[#9A740C]'
                            : 'text-[#56616A]'
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Clean Structured Specification & Variant Inventory Table */}
      <div className="mt-14 -mx-4 sm:-mx-6 lg:-mx-10">
        <ProductDetailsTable product={product} variant="technical" />
      </div>

      {/* Verified Player Reviews & Interactive Q&A */}
      <section className="mt-12 border-t border-[#0E1113]/15 pt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFeedbackTab('reviews')}
              className={`px-4 py-2.5 font-mono text-xs font-bold uppercase cursor-pointer ${
                feedbackTab === 'reviews'
                  ? 'bg-[#0E1113] text-[#FDFCF9]'
                  : 'border border-[#0E1113]/15 bg-[#FDFCF9] text-[#0E1113]/75'
              }`}
            >
              Verified Player Reviews ({displayReviews.length})
            </button>
            <button
              type="button"
              onClick={() => setFeedbackTab('qa')}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 font-mono text-xs font-bold uppercase cursor-pointer ${
                feedbackTab === 'qa'
                  ? 'bg-[#0E1113] text-[#FDFCF9]'
                  : 'border border-[#0E1113]/15 bg-[#FDFCF9] text-[#0E1113]/75'
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Specialist Q&amp;A (
              {productQuestions.filter((q) => q.productId === product.id).length || 1})
            </button>
          </div>
        </div>

        {feedbackTab === 'reviews' ? (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayReviews.map((review) => (
              <article
                key={review.id}
                className="border border-[#0E1113]/15 bg-[#FDFCF9] p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5 text-[#B8933B]">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="font-mono text-[11px] text-[#0E1113]/55">
                    {review.date} · Verified Buyer
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#0E1113]">
                  &ldquo;{review.comment}&rdquo;
                </p>
                <p className="mt-3 text-xs font-semibold text-[#0E1113]">
                  {review.author}{' '}
                  <span className="font-normal text-[#0E1113]/60">
                    · {review.role} ({review.pitchLocation})
                  </span>
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-7">
              {(productQuestions.filter((q) => q.productId === product.id).length > 0
                ? productQuestions.filter((q) => q.productId === product.id)
                : productQuestions.slice(0, 2)
              ).map((qa) => (
                <div
                  key={qa.id}
                  className="border border-[#0E1113]/15 bg-[#FDFCF9] p-5"
                >
                  <p className="font-mono text-[10px] text-[#0E1113]/55 uppercase">
                    Q · {qa.author} · {qa.date}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#0E1113]">{qa.question}</p>
                  {qa.answer && (
                    <p className="mt-3 border-l-2 border-[#B8933B] pl-3 text-xs leading-relaxed text-[#0E1113]/75">
                      <strong className="font-mono text-[10px] uppercase text-[#0E1113]">
                        Sport Castle Specialist:
                      </strong>{' '}
                      {qa.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!qaQuestion.trim()) return;
                addProductQuestion(product.id, qaAuthor, qaQuestion);
                setQaQuestion('');
              }}
              className="space-y-3 border border-[#0E1113]/15 bg-[#FDFCF9] p-5 lg:col-span-5"
            >
              <p className="font-mono text-[11px] font-bold uppercase text-[#0E1113]">
                Ask About Fit, Studs or Heat-Press
              </p>
              <input
                type="text"
                value={qaAuthor}
                onChange={(e) => setQaAuthor(e.target.value)}
                placeholder="Your name"
                className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 py-2 text-xs outline-none focus:border-[#0E1113]"
              />
              <textarea
                rows={3}
                required
                value={qaQuestion}
                onChange={(e) => setQaQuestion(e.target.value)}
                placeholder="e.g. How does this fit compared to Nike Mercurial EU 42 on Sen Sok turf?"
                className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 py-2 text-xs outline-none focus:border-[#0E1113]"
              />
              <button
                type="submit"
                className="w-full bg-[#0E1113] py-2.5 font-mono text-[11px] font-bold text-[#FDFCF9] uppercase hover:bg-[#C8232C] cursor-pointer"
              >
                Post Question
              </button>
            </form>
          </div>
        )}
      </section>

      {/* Recently Viewed Rail */}
      {recentlyViewedProducts.length > 0 && (
        <section className="mt-14 border-t border-[#18222D]/10 pt-10">
          <h2 className="font-display text-2xl font-bold text-[#18222D] mb-6">
            Recently Viewed
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentlyViewedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      {/* Dynamic 'You May Also Like' Carousel (Category + Tag-Ranked from catalog.ts) */}
      <YouMayAlsoLikeCarousel currentProduct={product} variant="technical" />

      {/* Zoom Lightbox */}
      {zoomOpen && (
        <div
          className="animate-overlay-fade fixed inset-0 z-50 flex items-center justify-center bg-[#0B0D10]/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed product photograph"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="Close zoom preview"
            className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#18222D] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="animate-modal-morph max-h-[85vh] max-w-4xl w-full overflow-hidden rounded-xl bg-[#E5EBF0]"
            onClick={(e) => e.stopPropagation()}
          >
            <ProductMedia product={product} className="aspect-[4/3] w-full" />
          </div>
        </div>
      )}

      {/* Sticky Bottom Conversion Add-to-Bag Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#0E1113]/15 bg-[#FDFCF9]/95 px-4 py-3 backdrop-blur-md shadow-lg">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <div className="hidden min-w-0 items-center gap-3 sm:flex">
            <img
              src={product.image}
              alt={product.name}
              className="h-10 w-10 border border-[#0E1113]/10 bg-[#EAE7DF] object-contain p-0.5"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold text-[#0E1113] uppercase">
                {product.name}
              </p>
              <p className="font-mono text-[11px] text-[#0E1113]/60">
                Size {selectedSize} · {formatUsd(unitPrice)} (≈ {formatKhr(unitPrice)})
              </p>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            <span className="font-mono text-sm font-bold text-[#0E1113] sm:hidden">
              {selectedSize} · {formatUsd(unitPrice * quantity)}
            </span>
            <button
              type="button"
              onClick={() =>
                addToCart(product, selectedSize, quantity, customPrintConfig, true)
              }
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 bg-[#0E1113] px-5 font-mono text-xs font-bold tracking-[0.14em] text-[#FDFCF9] uppercase transition hover:bg-[#C8232C] sm:flex-none cursor-pointer"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Add to Bag — {formatUsd(unitPrice * quantity)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
