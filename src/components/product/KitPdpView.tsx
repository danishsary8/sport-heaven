import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  RotateCcw,
  Ruler,
  Share2,
  Shirt,
  ShoppingBag,
  Truck,
  X,
  ZoomIn,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { getDefaultKitVariant, getVariantPrice } from '../../lib/product-attributes';
import { KitVariantPicker } from './KitVariantPicker';
import {
  formatTagLabel,
  getRecommendedProducts,
} from '../../lib/mock-store/catalog';
import type {
  KitVariant,
  CustomPrintConfig,
  JerseyFontStyle,
  JerseyPatchId,
  Product,
} from '../../types/store';
import {
  CUSTOM_PRINT_BASE_FEE,
  formatKhr,
  formatUsd,
  getCartItemUnitPrice,
  getKitUnavailableSizes,
  getProductSiblings,
  isKitProduct,
  PATCH_OPTIONS,
  sanitizePlayerName,
  sanitizeSquadNumber,
} from '../../utils/commerce';
import { JerseyPreviewSvg } from './JerseyPreviewSvg';
import { KitAutoShiftCarousel } from './KitAutoShiftCarousel';
import { ProductDetailsTable } from './ProductDetailsTable';
import { ProductMedia } from './ProductMedia';

type KitGallerySlide = 'studio-front' | 'detail-crop' | 'back-press' | 'spin-360';

interface KitPdpViewProps {
  product: Product;
}

/**
 * Zando-Engineered Minimalist Jersey & Kit Product Detail View
 * Applied strictly to football jerseys, national kits, and F1 paddock shirts.
 * Features: vertical thumbnail rail + swipeable 3:4 portrait stage, visual photo-thumbnail
 * edition switcher (Home/Away/Third), cross-dependent sold-out size handling + Notify Me,
 * live custom heat-press drawer, IntersectionObserver sticky buy bar, and minimalist accordions.
 */
export function KitPdpView({ product }: KitPdpViewProps) {
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
  } = useStore();

  const enrichedProduct = useMemo(
    () => getProductById(product.id) ?? catalog[0],
    [catalog, getProductById, product.id],
  );

  const unavailableSizes = useMemo(
    () => getKitUnavailableSizes(product),
    [product],
  );

  const pickInitialSize = () => {
    const preferred = memberProfile.preferredJerseySize;
    if (product.sizes.includes(preferred) && !unavailableSizes.includes(preferred)) {
      return preferred;
    }
    return (
      product.sizes.find((sz) => !unavailableSizes.includes(sz)) ??
      product.sizes[0]
    );
  };

  const [selectedSize, setSelectedSize] = useState<string>(pickInitialSize);
  const [variant, setVariant] = useState<KitVariant>(() => getDefaultKitVariant(product));
  useEffect(() => setVariant(getDefaultKitVariant(product)), [product]);
  const [notifySize, setNotifySize] = useState<string | null>(null);
  const [notifyContact, setNotifyContact] = useState(memberProfile.email);
  const [notifySubmitted, setNotifySubmitted] = useState<string | null>(null);

  const prefersReducedMotion = useReducedMotion();
  const [activeSlide, setActiveSlide] = useState<KitGallerySlide>('studio-front');
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [spinAngle, setSpinAngle] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Minimalist Expandable Accordions
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    fit: true,
    story: false,
    fabric: false,
    stock: false,
  });

  // Live Custom Heat-Press Printing
  const [printEnabled, setPrintEnabled] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [squadNumber, setSquadNumber] = useState(
    product.category === 'f1' ? '16' : '10',
  );
  const [patch, setPatch] = useState<JerseyPatchId>(
    product.isChampionsLeague ? 'ucl' : 'none',
  );
  const [fontStyle, setFontStyle] = useState<JerseyFontStyle>(
    product.category === 'f1' ? 'motorsport-aero' : 'pro-condensed',
  );

  // IntersectionObserver Sticky Add-to-Bag Bar
  const primaryCtaRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    setSelectedSize(pickInitialSize());
    setNotifySize(null);
    setNotifySubmitted(null);
    setActiveSlide('studio-front');
    setPrintEnabled(false);
    setPlayerName('');
    setSquadNumber(product.category === 'f1' ? '16' : '10');
    setPatch(product.isChampionsLeague ? 'ucl' : 'none');
    setFontStyle(product.category === 'f1' ? 'motorsport-aero' : 'pro-condensed');
    recordProductView(product.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  useEffect(() => {
    const el = primaryCtaRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting);
      },
      { threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product.id]);

  const saved = isWishlisted(product.id);
  const siblings = useMemo(
    () => getProductSiblings(catalog, product),
    [catalog, product],
  );

  const slides: Array<{ id: KitGallerySlide; label: string }> = [
    { id: 'studio-front', label: 'Front Studio' },
    { id: 'detail-crop', label: 'Crest & Weave' },
    ...(product.jerseyTheme
      ? [{ id: 'back-press' as const, label: 'Back Print Preview' }]
      : []),
    { id: 'spin-360', label: '360° Studio' },
  ];

  const stepSlide = (delta: 1 | -1) => {
    const idx = slides.findIndex((s) => s.id === activeSlide);
    const next = slides[(idx + delta + slides.length) % slides.length];
    setSlideDir(delta);
    setActiveSlide(next.id);
  };

  const selectSlide = (id: KitGallerySlide) => {
    const curIdx = slides.findIndex((s) => s.id === activeSlide);
    const nextIdx = slides.findIndex((s) => s.id === id);
    setSlideDir(nextIdx >= curIdx ? 1 : -1);
    setActiveSlide(id);
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

  const unitPrice = getCartItemUnitPrice(getVariantPrice(product, variant), customPrintConfig);
  const discountPct =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100,
        )
      : 0;

  const relatedKitRecommendations = useMemo(
    () => getRecommendedProducts(enrichedProduct ?? product, catalog, 8),
    [catalog, enrichedProduct, product],
  );

  const relatedKits = useMemo(
    () => relatedKitRecommendations.map((rec) => rec.product),
    [relatedKitRecommendations],
  );

  const kitMatchTags = useMemo(() => {
    const sourceTags = enrichedProduct?.tags ?? [];
    return sourceTags
      .filter(
        (t) =>
          t !== product.category &&
          !['featured', 'new-arrival', 'on-sale', 'matchday-kit', '2026-27'].includes(t),
      )
      .slice(0, 3)
      .map(formatTagLabel);
  }, [enrichedProduct, product.category]);

  const recentKits = useMemo(
    () =>
      recentlyViewed
        .filter((id) => id !== product.id)
        .map((id) => getProductById(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p && isKitProduct(p)))
        .slice(0, 6),
    [recentlyViewed, product.id, getProductById],
  );

  const handleAddToBag = () => {
    addToCart(product, selectedSize, 1, customPrintConfig, true, variant);
  };

  const handleShare = () => {
    if (navigator.clipboard && window.location) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    setCopiedShare(true);
    window.setTimeout(() => setCopiedShare(false), 1800);
  };

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTogglePrint = (enabled: boolean) => {
    setPrintEnabled(enabled);
    if (enabled && product.jerseyTheme) {
      selectSlide('back-press');
    } else if (!enabled && activeSlide === 'back-press') {
      selectSlide('studio-front');
    }
  };

  return (
    <div className="animate-page-enter bg-[#FFFFFF] pb-20">
      {/* MAIN MINIMALIST SPLIT STAGE (60% Vertical-Rail Gallery / 40% Contiguous Purchase Column) */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 pt-6 lg:pt-10 pb-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 items-start">
          {/* LEFT 7 COLS: VERTICAL THUMBNAIL RAIL + SWIPEABLE 3:4 PORTRAIT GALLERY */}
          <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-3 lg:sticky lg:top-24">
            {/* Vertical Thumbnail Rail */}
            <div
              className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-visible sm:w-[82px] shrink-0"
              role="tablist"
              aria-label="Kit gallery thumbnails"
            >
              {slides.map((slide) => {
                const isActive = activeSlide === slide.id;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectSlide(slide.id)}
                    className={`relative aspect-[3/4] w-[68px] sm:w-full shrink-0 overflow-hidden border transition-all cursor-pointer bg-[#F1EFEA] ${
                      isActive
                        ? 'border-[#0E1113] ring-1 ring-[#0E1113]'
                        : 'border-[#0E1113]/12 opacity-75 hover:opacity-100 hover:border-[#0E1113]/50'
                    }`}
                  >
                    {slide.id === 'back-press' && product.jerseyTheme ? (
                      <div className="flex h-full w-full items-center justify-center bg-[#FAF9F6] p-2">
                        <JerseyPreviewSvg
                          theme={product.jerseyTheme}
                          playerName={sanitizePlayerName(playerName) || 'NAME'}
                          squadNumber={sanitizeSquadNumber(squadNumber) || '10'}
                          patch={patch}
                          fontStyle={fontStyle}
                        />
                      </div>
                    ) : (
                      <ProductMedia
                        product={product}
                        className="h-full w-full bg-[#F1EFEA]"
                        imgClassName={
                          slide.id === 'detail-crop'
                            ? 'scale-[1.45] object-center'
                            : slide.id === 'spin-360'
                              ? 'scale-[0.92]'
                              : ''
                        }
                      />
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-[#0E1113]/72 py-0.5 text-center font-mono text-[8.5px] uppercase tracking-[0.06em] text-white">
                      {slide.id === 'studio-front'
                        ? 'Front'
                        : slide.id === 'detail-crop'
                          ? 'Detail'
                          : slide.id === 'back-press'
                            ? 'Back'
                            : '360°'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Primary 3:4 Portrait Stage */}
            <div
              className="relative flex-1 aspect-[3/4] max-h-[760px] w-full overflow-hidden bg-[#F1EFEA]"
              style={{ viewTransitionName: 'active-product-media' }}
            >
              {/* Top-left subtle slide counter & Back button */}
              <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigateToShop({
                      collectionSlug:
                        product.category === 'f1' ? 'f1-motorsport' : 'jerseys-kits',
                      category: product.category,
                    })
                  }
                  aria-label="Back to kit collection"
                  className="inline-flex h-9 w-9 items-center justify-center bg-[#FFFFFF]/92 border border-[#0E1113]/12 text-[#0E1113] hover:bg-[#0E1113] hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              {/* Top-right Zoom Trigger */}
              {activeSlide !== 'back-press' && (
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  aria-label="Open full-screen kit zoom"
                  className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center bg-[#FFFFFF]/92 border border-[#0E1113]/12 text-[#0E1113] hover:bg-[#0E1113] hover:text-white transition-colors cursor-pointer"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              )}

              {/* Directional Arrow Controls */}
              <button
                type="button"
                onClick={() => stepSlide(-1)}
                aria-label="Previous kit view"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 inline-flex h-10 w-10 items-center justify-center bg-[#0E1113]/85 text-white hover:bg-[#C8232C] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => stepSlide(1)}
                aria-label="Next kit view"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 inline-flex h-10 w-10 items-center justify-center bg-[#0E1113]/85 text-white hover:bg-[#C8232C] transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Animated Overlapping Stage Viewport (Zero Blank-Frame Flicker) */}
              <AnimatePresence initial={false} custom={slideDir}>
                <motion.div
                  key={`${product.id}-${activeSlide}`}
                  custom={slideDir}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: slideDir * 28, scale: 1.015 }
                  }
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: slideDir * -28, scale: 0.985 }
                  }
                  transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 h-full w-full"
                >
                  {activeSlide === 'back-press' && product.jerseyTheme ? (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-[#FAF9F6] p-8 sm:p-14">
                      <div className="w-full max-w-[340px]">
                        <JerseyPreviewSvg
                          theme={product.jerseyTheme}
                          playerName={
                            sanitizePlayerName(playerName) ||
                            product.club?.split(' ').pop()?.toUpperCase() ||
                            'CASTLE'
                          }
                          squadNumber={sanitizeSquadNumber(squadNumber) || '10'}
                          patch={patch}
                          fontStyle={fontStyle}
                        />
                      </div>
                      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#5F625C]">
                        Live Heat-Press Preview · Same-Day Phnom Penh Atelier
                      </p>
                    </div>
                  ) : activeSlide === 'spin-360' ? (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-[#F1EFEA] p-6">
                      <div
                        className="h-[78%] w-full transition-transform duration-150"
                        style={{
                          transform: `perspective(1000px) rotateY(${spinAngle}deg)`,
                        }}
                      >
                        <ProductMedia
                          product={product}
                          loading="eager"
                          className="h-full w-full bg-[#F1EFEA]"
                        />
                      </div>
                      <div className="mt-4 flex w-full max-w-xs items-center gap-3 bg-[#FFFFFF]/90 border border-[#0E1113]/12 px-4 py-2">
                        <span className="font-mono text-[10px] uppercase text-[#5F625C]">
                          360°
                        </span>
                        <input
                          type="range"
                          min={-45}
                          max={45}
                          value={spinAngle}
                          onChange={(e) => setSpinAngle(Number(e.target.value))}
                          aria-label="Rotate kit studio angle"
                          className="flex-1 accent-[#0E1113]"
                        />
                        <span className="font-mono text-[10px] tabular-nums text-[#0E1113]">
                          {spinAngle}°
                        </span>
                      </div>
                    </div>
                  ) : (
                    <ProductMedia
                      product={product}
                      loading="eager"
                      className="h-full w-full bg-[#F1EFEA]"
                      imgClassName={
                        activeSlide === 'detail-crop'
                          ? 'scale-[1.48] object-center transition-transform duration-500'
                          : 'transition-transform duration-500'
                      }
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Mobile Dot Indicators */}
              <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5 sm:hidden">
                {slides.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectSlide(s.id)}
                    aria-label={s.label}
                    className={`h-1.5 transition-all cursor-pointer ${
                      activeSlide === s.id
                        ? 'w-6 bg-[#0E1113]'
                        : 'w-1.5 bg-[#0E1113]/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: CONTIGUOUS MINIMALIST PURCHASE MODULE */}
          <div className="lg:col-span-5 flex flex-col">
            {/* Minimal Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#5F625C]"
            >
              <button
                type="button"
                onClick={() => navigate({ page: 'home' })}
                className="hover:text-[#0E1113] cursor-pointer"
              >
                Home
              </button>
              <span aria-hidden="true">/</span>
              <button
                type="button"
                onClick={() =>
                  navigateToShop({
                    collectionSlug:
                      product.category === 'f1' ? 'f1-motorsport' : 'jerseys-kits',
                    category: product.category,
                  })
                }
                className="hover:text-[#0E1113] cursor-pointer"
              >
                {product.category === 'f1' ? 'F1 Paddock' : 'Jerseys & Kits'}
              </button>
              {product.league && (
                <>
                  <span aria-hidden="true">/</span>
                  <span>{product.league}</span>
                </>
              )}
            </nav>

            {/* Brand & Title */}
            <p className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5F625C]">
              {product.brand}
              {product.season ? ` · ${product.season} SEASON` : ''}
            </p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight leading-[1.02] text-[#0E1113] text-balance">
              {product.name}
            </h1>

            {/* Crisp Monospace Price Line */}
            <div className="mt-3 flex flex-wrap items-baseline gap-2.5">
              <span
                className={`font-mono text-2xl font-semibold tabular-nums ${
                  discountPct > 0 ? 'text-[#C8232C]' : 'text-[#0E1113]'
                }`}
              >
                {formatUsd(unitPrice)}
              </span>
              {discountPct > 0 && product.originalPrice && (
                <>
                  <span className="font-mono text-xs font-semibold text-[#C8232C]">
                    -{discountPct}%
                  </span>
                  <span className="font-mono text-sm line-through tabular-nums text-[#5F625C]">
                    {formatUsd(product.originalPrice)}
                  </span>
                </>
              )}
              <span className="font-mono text-xs tabular-nums text-[#5F625C]">
                ≈ {formatKhr(unitPrice)}
              </span>
            </div>

            {/* VISUAL PHOTO-THUMBNAIL EDITION SWITCHER (Zando signature pattern for Home / Away / Third) */}
            {siblings.length > 1 && (
              <div className="mt-6">
                <p className="text-xs font-medium text-[#0E1113]">
                  {siblings.length} Editions available{' '}
                  <span className="text-[#5F625C]">
                    — {product.kitType ?? product.colorway}
                  </span>
                </p>
                <div className="mt-2.5 grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {siblings.map((sib) => {
                    const isCurrent = sib.id === product.id;
                    return (
                      <button
                        key={sib.id}
                        type="button"
                        onClick={() => navigate({ page: 'product', slug: sib.slug })}
                        aria-current={isCurrent ? 'true' : undefined}
                        className="group flex flex-col items-center text-center cursor-pointer"
                      >
                        <div
                          className={`aspect-[3/4] w-full overflow-hidden border bg-[#F1EFEA] transition-all ${
                            isCurrent
                              ? 'border-[#0E1113] ring-1 ring-[#0E1113]'
                              : 'border-[#0E1113]/15 group-hover:border-[#0E1113]'
                          }`}
                        >
                          <ProductMedia
                            product={sib}
                            className="h-full w-full bg-[#F1EFEA]"
                            imgClassName="group-hover:scale-105"
                          />
                        </div>
                        <span
                          className={`mt-1.5 text-[11px] truncate max-w-full ${
                            isCurrent
                              ? 'font-semibold text-[#0E1113]'
                              : 'text-[#5F625C]'
                          }`}
                        >
                          {sib.kitType ?? sib.shortName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inline Size Guide Banner (Zando clean utility strip) */}
            <div className="mt-6 flex items-center justify-between bg-[#FAF9F6] border border-[#0E1113]/8 px-3.5 py-2.5 text-xs">
              <span className="text-[#5F625C]">
                Find the kit fit for your measurements
              </span>
              <button
                type="button"
                onClick={() => openSizeGuide('jerseys')}
                className="inline-flex items-center gap-1.5 font-medium text-[#0E1113] underline underline-offset-4 hover:text-[#C8232C] cursor-pointer whitespace-nowrap"
              >
                <Ruler className="h-3.5 w-3.5" />
                Size guide
              </button>
            </div>

            {product.category === 'jerseys' && (
              <KitVariantPicker product={product} value={variant} onChange={setVariant} />
            )}

            {/* Clean Rectangular Size Matrix with Cross-Dependent Out-of-Stock Handling */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#0E1113]">
                  Select size{' '}
                  <span className="font-mono font-normal text-[#5F625C]">
                    ({selectedSize})
                  </span>
                </span>
                <span className="font-mono text-[10.5px] text-[#5F625C]">
                  {product.specs.fitProfile}
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-5 gap-2">
                {product.sizes.map((size) => {
                  const soldOut = unavailableSizes.includes(size);
                  const active = selectedSize === size && !soldOut;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        if (soldOut) {
                          setNotifySize(size);
                          return;
                        }
                        setSelectedSize(size);
                        setNotifySize(null);
                      }}
                      aria-pressed={active}
                      className={`h-11 border font-mono text-xs transition-all cursor-pointer ${
                        soldOut
                          ? 'border-[#0E1113]/12 bg-[#FAF9F6] text-[#5F625C]/50 line-through hover:border-[#0E1113]/40'
                          : active
                            ? 'border-[#0E1113] bg-[#0E1113] text-white font-semibold'
                            : 'border-[#0E1113]/20 bg-[#FFFFFF] text-[#0E1113] hover:border-[#0E1113]'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              {/* Sold-Out Restock Alert Drawer (Triggered when clicking a strikethrough size) */}
              {notifySize && (
                <div className="mt-3 border border-[#0E1113]/15 bg-[#FAF9F6] p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[#0E1113]">
                      <Bell className="h-3.5 w-3.5 text-[#C8232C]" />
                      Size {notifySize} is currently sold out
                    </p>
                    <button
                      type="button"
                      onClick={() => setNotifySize(null)}
                      aria-label="Close restock alert"
                      className="text-[#5F625C] hover:text-[#0E1113] cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {notifySubmitted === notifySize ? (
                    <p className="mt-2 text-xs text-[#0E1113]">
                      Alert saved — we’ll notify <strong>{notifyContact}</strong> as soon as
                      Size {notifySize} restocks at Phnom Penh branches.
                    </p>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!notifyContact.trim()) return;
                        setNotifySubmitted(notifySize);
                      }}
                      className="mt-2.5 flex gap-2"
                    >
                      <input
                        type="email"
                        required
                        value={notifyContact}
                        onChange={(e) => setNotifyContact(e.target.value)}
                        placeholder="Email for restock alert"
                        className="h-9 flex-1 border border-[#0E1113]/20 bg-white px-3 text-xs text-[#0E1113] focus:border-[#0E1113] focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="h-9 bg-[#0E1113] px-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-[#C8232C] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Notify Me
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Optional Custom Heat-Press Personalization Box */}
            {product.customizable && (
              <div className="mt-5 border border-[#0E1113]/12 bg-[#FAF9F6] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Shirt className="h-4 w-4 text-[#0E1113]" strokeWidth={1.7} />
                    <div>
                      <p className="text-xs font-semibold text-[#0E1113]">
                        Custom Pro Heat-Press (+{formatUsd(CUSTOM_PRINT_BASE_FEE)})
                      </p>
                      <p className="text-[11px] text-[#5F625C]">
                        Official name, squad number &amp; sleeve patch · Ready in 15 min
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={printEnabled}
                    onClick={() => handleTogglePrint(!printEnabled)}
                    className={`h-7 px-3 border font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors cursor-pointer ${
                      printEnabled
                        ? 'border-[#0E1113] bg-[#0E1113] text-white'
                        : 'border-[#0E1113]/20 bg-white text-[#0E1113] hover:border-[#0E1113]'
                    }`}
                  >
                    {printEnabled ? 'Enabled' : 'Add Print'}
                  </button>
                </div>

                {printEnabled && (
                  <div className="mt-3.5 space-y-3 border-t border-[#0E1113]/10 pt-3.5">
                    <div className="grid grid-cols-3 gap-2">
                      <label className="col-span-2 block">
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5F625C]">
                          Player Name
                        </span>
                        <input
                          type="text"
                          maxLength={14}
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          placeholder="e.g. YAMAL"
                          className="mt-1 h-9 w-full border border-[#0E1113]/20 bg-white px-2.5 font-mono text-xs uppercase text-[#0E1113] focus:border-[#0E1113] focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5F625C]">
                          Number
                        </span>
                        <input
                          type="text"
                          maxLength={2}
                          value={squadNumber}
                          onChange={(e) => setSquadNumber(e.target.value)}
                          placeholder="10"
                          className="mt-1 h-9 w-full border border-[#0E1113]/20 bg-white px-2.5 font-mono text-xs text-[#0E1113] focus:border-[#0E1113] focus:outline-none"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5F625C]">
                          Sleeve Patch
                        </span>
                        <select
                          value={patch}
                          onChange={(e) => setPatch(e.target.value as JerseyPatchId)}
                          className="mt-1 h-9 w-full border border-[#0E1113]/20 bg-white px-2 text-xs text-[#0E1113] focus:border-[#0E1113] focus:outline-none"
                        >
                          {PATCH_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                              {opt.fee > 0 ? ` (+$${opt.fee})` : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5F625C]">
                          Typography
                        </span>
                        <select
                          value={fontStyle}
                          onChange={(e) =>
                            setFontStyle(e.target.value as JerseyFontStyle)
                          }
                          className="mt-1 h-9 w-full border border-[#0E1113]/20 bg-white px-2 text-xs text-[#0E1113] focus:border-[#0E1113] focus:outline-none"
                        >
                          <option value="pro-condensed">Pro Condensed</option>
                          <option value="classic-block">Classic Block</option>
                          <option value="motorsport-aero">Motorsport Aero</option>
                        </select>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PRIMARY ACTION ROW: Full-Width Add to Bag + Wishlist Square + Share */}
            <div ref={primaryCtaRef} className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddToBag}
                className="flex h-12 flex-1 items-center justify-center gap-2.5 bg-[#0E1113] px-6 text-xs font-semibold uppercase tracking-[0.14em] text-[#FFFFFF] hover:bg-[#C8232C] transition-colors cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />
                <span>Add to Bag — {formatUsd(unitPrice)}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                className={`flex h-12 w-12 shrink-0 items-center justify-center border transition-colors cursor-pointer ${
                  saved
                    ? 'border-[#C8232C] bg-[#C8232C] text-white'
                    : 'border-[#0E1113]/20 bg-[#FFFFFF] text-[#0E1113] hover:border-[#0E1113]'
                }`}
              >
                <Heart
                  className="h-4 w-4"
                  fill={saved ? 'currentColor' : 'none'}
                  strokeWidth={1.7}
                />
              </button>
              <button
                type="button"
                onClick={handleShare}
                aria-label="Copy link to share this kit"
                title={copiedShare ? 'Link copied' : 'Share kit link'}
                className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#0E1113]/20 bg-[#FFFFFF] text-[#0E1113] hover:border-[#0E1113] transition-colors cursor-pointer"
              >
                {copiedShare ? (
                  <Check className="h-4 w-4 text-[#0E1113]" />
                ) : (
                  <Share2 className="h-4 w-4" strokeWidth={1.7} />
                )}
              </button>
            </div>

            {/* 2-Column Minimalist Trust Strip */}
            <div className="mt-5 grid grid-cols-2 border-y border-[#0E1113]/10 py-3.5 text-xs text-[#0E1113]">
              <div className="flex items-center justify-center gap-2 border-r border-[#0E1113]/10 px-2">
                <Truck className="h-4 w-4 shrink-0 text-[#5F625C]" strokeWidth={1.6} />
                <span className="truncate">Free Phnom Penh Express ($50+)</span>
              </div>
              <div className="flex items-center justify-center gap-2 px-2">
                <RotateCcw className="h-4 w-4 shrink-0 text-[#5F625C]" strokeWidth={1.6} />
                <span className="truncate">30-Day Easy Exchange</span>
              </div>
            </div>

            {/* MINIMALIST EXPANDABLE ACCORDIONS */}
            <div className="mt-2 divide-y divide-[#0E1113]/10 border-b border-[#0E1113]/10">
              {/* Accordion 1: Fit & Model Info */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('fit')}
                  aria-expanded={openAccordions.fit}
                  className="flex w-full items-center justify-between py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#0E1113] cursor-pointer"
                >
                  <span>Fit &amp; Silhouette Info</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openAccordions.fit ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordions.fit && (
                  <div className="pb-4 text-xs leading-relaxed text-[#5F625C] space-y-1.5">
                    <p>
                      <strong className="text-[#0E1113]">Cut:</strong>{' '}
                      {product.specs.fitProfile}. True to international football sizing;
                      size up one if you prefer a relaxed streetwear drape.
                    </p>
                    <p>
                      <strong className="text-[#0E1113]">Studio Reference:</strong>{' '}
                      178 cm / 70 kg athlete wears size M for authentic matchday fit.
                    </p>
                  </div>
                )}
              </div>

              {/* Accordion 2: Description & Highlights */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('story')}
                  aria-expanded={openAccordions.story}
                  className="flex w-full items-center justify-between py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#0E1113] cursor-pointer"
                >
                  <span>Description &amp; Match Specs</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openAccordions.story ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordions.story && (
                  <div className="pb-4 text-xs leading-relaxed text-[#5F625C] space-y-2.5">
                    <p>{product.summary}</p>
                    <ul className="space-y-1">
                      {product.techHighlights.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1 w-1 shrink-0 bg-[#0E1113]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Accordion 3: Fabric & Care */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('fabric')}
                  aria-expanded={openAccordions.fabric}
                  className="flex w-full items-center justify-between py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#0E1113] cursor-pointer"
                >
                  <span>Fabric &amp; Heat-Press Care</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openAccordions.fabric ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordions.fabric && (
                  <div className="pb-4 text-xs leading-relaxed text-[#5F625C] space-y-1.5">
                    {product.specs.upperMaterial && (
                      <p>
                        <strong className="text-[#0E1113]">Fabric:</strong>{' '}
                        {product.specs.upperMaterial}
                      </p>
                    )}
                    <p>
                      <strong className="text-[#0E1113]">Care:</strong>{' '}
                      {product.specs.careGuide}
                    </p>
                  </div>
                )}
              </div>

              {/* Accordion 4: Phnom Penh Branch Stock */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('stock')}
                  aria-expanded={openAccordions.stock}
                  className="flex w-full items-center justify-between py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#0E1113] cursor-pointer"
                >
                  <span>Phnom Penh Branch Pickup Stock</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openAccordions.stock ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordions.stock && (
                  <div className="pb-4 space-y-2">
                    {branches.map((branch) => {
                      const level = product.branchStock[branch.id];
                      return (
                        <div
                          key={branch.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="flex items-center gap-1.5 text-[#0E1113]">
                            <MapPin className="h-3.5 w-3.5 text-[#5F625C]" />
                            {branch.name}
                          </span>
                          <span
                            className={`font-mono text-[11px] ${
                              level === 'Out of Stock'
                                ? 'text-[#5F625C] line-through'
                                : level === 'Limited Stock'
                                  ? 'text-[#B8933B] font-semibold'
                                  : 'text-[#0E1113]'
                            }`}
                          >
                            {level}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CLEAN STRUCTURED SPECIFICATION & VARIANT INVENTORY TABLE */}
      {enrichedProduct && (
        <ProductDetailsTable product={enrichedProduct} variant="minimal" />
      )}

      {/* AUTO-SHIFT RELATED KITS CAROUSEL (Category + Tag-Ranked from catalog.ts) */}
      {relatedKits.length > 0 && (
        <KitAutoShiftCarousel
          eyebrow={
            kitMatchTags.length > 0
              ? `MATCHED BY CATEGORY & TAGS · ${kitMatchTags.join(' / ')}`
              : 'CURATED BY CATEGORY & TAGS'
          }
          title="You May Also"
          editorialAccent="Like"
          products={relatedKits}
          autoShiftMs={4600}
          surface="alabaster"
          onViewAll={() =>
            navigateToShop({
              collectionSlug: 'jerseys-kits',
              category: 'jerseys',
            })
          }
          viewAllLabel="All 2026/27 Kits"
        />
      )}

      {/* RECENTLY VIEWED KITS RAIL */}
      {recentKits.length > 0 && (
        <KitAutoShiftCarousel
          eyebrow="RECENTLY INSPECTED"
          title="Recently Viewed"
          editorialAccent="Kits"
          products={recentKits}
          autoShiftMs={5200}
          surface="white"
        />
      )}

      {/* INTERSECTION-OBSERVER STICKY BOTTOM BUY BAR */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-[#0E1113]/15 bg-[#FFFFFF]/96 backdrop-blur-md"
          >
            <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
              <div className="flex min-w-0 items-center gap-3">
                <div className="hidden sm:block h-11 w-9 shrink-0 overflow-hidden bg-[#F1EFEA]">
                  <ProductMedia product={product} className="h-full w-full" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs sm:text-sm font-semibold text-[#0E1113]">
                    {product.name}
                  </p>
                  <p className="font-mono text-[11px] text-[#5F625C]">
                    Size {selectedSize} · {formatUsd(unitPrice)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddToBag}
                className="inline-flex h-10 shrink-0 items-center gap-2 bg-[#0E1113] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-[#C8232C] transition-colors cursor-pointer whitespace-nowrap"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Add to Bag</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL-SCREEN LIGHTBOX ZOOM MODAL */}
      <AnimatePresence>
        {zoomOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E1113]/90 p-4 sm:p-10 backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              aria-label="Close zoom lightbox"
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center bg-white text-[#0E1113] hover:bg-[#C8232C] hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div
              onClick={(e) => e.stopPropagation()}
              className="aspect-[3/4] h-[85vh] max-w-full overflow-hidden bg-[#F1EFEA]"
            >
              <ProductMedia
                product={product}
                loading="eager"
                className="h-full w-full bg-[#F1EFEA]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
