import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Eye, Heart, Shirt, ShoppingBag } from 'lucide-react';
import type { Product } from '../../types/store';
import { PRODUCTS } from '../../data/catalog';
import { useStore } from '../../context/StoreContext';
import { assignMorphSource } from '../../hooks/useViewTransition';
import {
  formatUsd,
  getProductSiblings,
  getProductSwatchColor,
} from '../../utils/commerce';
import {
  getKitBackPrintDefaults,
  getNextKitCardPinnedView,
  resolveKitCardShowingBack,
  type KitCardPinnedView,
} from '../../utils/kitCardView';
import { JerseyPreviewSvg } from './JerseyPreviewSvg';
import { ProductMedia } from './ProductMedia';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const {
    navigate,
    addToCart,
    toggleWishlist,
    isWishlisted,
    setQuickViewProduct,
    memberProfile,
  } = useStore();
  const mediaRef = useRef<HTMLDivElement>(null);

  const siblings = useMemo(
    () => getProductSiblings(PRODUCTS, product),
    [product],
  );
  const prefersReducedMotion = useReducedMotion();
  const [activeProductId, setActiveProductId] = useState(product.id);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [isHoveringMedia, setIsHoveringMedia] = useState(false);
  const [pinnedView, setPinnedView] = useState<KitCardPinnedView>('auto');
  const [quickSizeOpen, setQuickSizeOpen] = useState(false);
  const [justAddedSize, setJustAddedSize] = useState<string | null>(null);

  const displayed =
    siblings.find((s) => s.id === activeProductId) ?? product;

  const hasBackView = Boolean(displayed.jerseyTheme);
  const showingBack = resolveKitCardShowingBack({
    hasBackView,
    isHovering: isHoveringMedia,
    pinnedView,
  });
  const backDefaults = useMemo(
    () => getKitBackPrintDefaults(displayed),
    [displayed],
  );

  const handleSelectSibling = (targetId: string) => {
    const currentIdx = siblings.findIndex((s) => s.id === displayed.id);
    const nextIdx = siblings.findIndex((s) => s.id === targetId);
    setSlideDir(nextIdx >= currentIdx ? 1 : -1);
    setActiveProductId(targetId);
    setPinnedView('auto');
  };

  const saved = isWishlisted(displayed.id);
  const inStockCount = Object.values(displayed.branchStock).filter(
    (s) => s !== 'Out of Stock',
  ).length;

  const discountPct =
    displayed.originalPrice && displayed.originalPrice > displayed.price
      ? Math.round(
          ((displayed.originalPrice - displayed.price) /
            displayed.originalPrice) *
            100,
        )
      : 0;

  const quickSizes = displayed.sizes.slice(0, 6);

  const handleDirectSizeAdd = (size: string) => {
    addToCart(displayed, size, 1, undefined, false);
    setJustAddedSize(size);
    window.setTimeout(() => {
      setJustAddedSize(null);
      setQuickSizeOpen(false);
    }, 650);
  };

  const handleDefaultQuickAdd = () => {
    if (displayed.sizes.length === 1) {
      handleDirectSizeAdd(displayed.sizes[0]);
      return;
    }
    setQuickSizeOpen((v) => !v);
  };

  const preferredSize =
    displayed.category === 'boots'
      ? memberProfile.preferredBootSize
      : displayed.category === 'jerseys' || displayed.category === 'f1'
        ? memberProfile.preferredJerseySize
        : displayed.sizes[0];

  const openProductDetail = () => {
    assignMorphSource(mediaRef.current);
    navigate({ page: 'product', slug: displayed.slug }, displayed.slug);
  };

  return (
    <article
      onMouseLeave={() => {
        setQuickSizeOpen(false);
        setIsHoveringMedia(false);
        setPinnedView('auto');
      }}
      className="group flex flex-col bg-[#FDFCF9] border border-[#0E1113]/10 transition-colors duration-200 hover:border-[#0E1113]/45"
    >
      {/* Studio Image Stage (Guaranteed-Unique View-Transition Morph Source) */}
      <div
        ref={mediaRef}
        data-card-view={showingBack ? 'back' : 'front'}
        onMouseEnter={() => {
          if (hasBackView) setIsHoveringMedia(true);
        }}
        onMouseLeave={() => {
          setIsHoveringMedia(false);
        }}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#EFECE6]"
      >
        <button
          type="button"
          onClick={openProductDetail}
          aria-label={`View ${displayed.name}`}
          className="relative block h-full w-full cursor-pointer text-left"
        >
          <AnimatePresence initial={false} custom={slideDir}>
            <motion.div
              key={displayed.id}
              custom={slideDir}
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, x: slideDir * 18, scale: 1.02 }
              }
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, x: slideDir * -18, scale: 0.985 }
              }
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 h-full w-full"
            >
              {/* Front Studio Layer */}
              <div
                aria-hidden={showingBack}
                className={`absolute inset-0 h-full w-full transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                  showingBack
                    ? 'opacity-0 scale-[1.04]'
                    : 'opacity-100 scale-100 group-hover:scale-[1.04]'
                }`}
              >
                <ProductMedia
                  product={displayed}
                  className="h-full w-full bg-[#EAE7DF]"
                />
              </div>

              {/* Back-of-Kit Smooth Hover Layer for Jerseys & F1 Kits */}
              {displayed.jerseyTheme && (
                <div
                  aria-hidden={!showingBack}
                  className={`absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-b from-[#E4E9EE] via-[#E9ECEE] to-[#DFE3E7] px-4 pt-2.5 pb-9 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                    showingBack
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-[0.96] pointer-events-none'
                  }`}
                >
                  <div className="h-[92%] max-w-[220px]">
                    <JerseyPreviewSvg
                      theme={displayed.jerseyTheme}
                      playerName={backDefaults.playerName}
                      squadNumber={backDefaults.squadNumber}
                      patch={backDefaults.patch}
                      fontStyle={backDefaults.fontStyle}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </button>

        {/* Top-right Save & Back-View Toggle buttons */}
        <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => toggleWishlist(displayed.id)}
            aria-label={
              saved
                ? `Remove ${displayed.shortName} from wishlist`
                : `Save ${displayed.shortName} to wishlist`
            }
            className={`flex h-8 w-8 items-center justify-center border transition-colors cursor-pointer ${
              saved
                ? 'border-[#C8232C] bg-[#C8232C] text-white'
                : 'border-[#0E1113]/15 bg-[#FDFCF9]/90 text-[#0E1113] hover:border-[#0E1113] hover:bg-[#FDFCF9]'
            }`}
          >
            <Heart
              className="h-3.5 w-3.5"
              fill={saved ? 'currentColor' : 'none'}
              strokeWidth={1.8}
            />
          </button>
          {hasBackView && (
            <button
              type="button"
              onClick={() =>
                setPinnedView(
                  getNextKitCardPinnedView({
                    currentlyShowingBack: showingBack,
                    isHovering: isHoveringMedia,
                  }),
                )
              }
              aria-pressed={showingBack}
              aria-label={
                showingBack
                  ? `Show front studio photo of ${displayed.shortName}`
                  : `Show back view of ${displayed.shortName}`
              }
              title={showingBack ? 'Show front view' : 'Show back view'}
              className={`flex h-8 w-8 items-center justify-center border transition-colors cursor-pointer ${
                showingBack
                  ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                  : 'border-[#0E1113]/15 bg-[#FDFCF9]/90 text-[#0E1113] hover:border-[#0E1113] hover:bg-[#FDFCF9]'
              }`}
            >
              <Shirt className="h-3.5 w-3.5" strokeWidth={1.7} />
            </button>
          )}
        </div>

        {/* Quiet Unboxed Back-View Indicator (Zero-Pill Editorial Label) */}
        {hasBackView && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-3 top-3 z-10 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#0E1113]/65 transition-opacity duration-300 ${
              showingBack ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Back View
          </span>
        )}

        {/* Top-left Technical Stamp */}
        <div
          className={`pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1.5 transition-opacity duration-300 ${
            showingBack ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {discountPct > 0 ? (
            <span className="bg-[#C8232C] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-white">
              -{discountPct}%
            </span>
          ) : displayed.surface ? (
            <span className="bg-[#0E1113] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#FDFCF9]">
              {displayed.surface}
            </span>
          ) : displayed.isChampionsLeague ? (
            <span className="bg-[#032EA1] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
              UCL 26/27
            </span>
          ) : null}
        </div>

        {/* Hover Quick-Size Overlay Matrix */}
        {quickSizeOpen ? (
          <div className="animate-mega-unfold absolute inset-x-0 bottom-0 bg-[#FDFCF9]/98 border-t border-[#0E1113]/15 p-2.5 backdrop-blur-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5A5D57]">
                Select Size to Add
              </span>
              <button
                type="button"
                onClick={() => setQuickSizeOpen(false)}
                className="font-mono text-[10px] text-[#5A5D57] hover:text-[#0E1113] cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {quickSizes.map((sz) => {
                const isPreferred = sz === preferredSize;
                const isAdded = justAddedSize === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleDirectSizeAdd(sz)}
                    className={`h-7 border font-mono text-[11px] font-medium transition-colors cursor-pointer ${
                      isAdded
                        ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                        : isPreferred
                          ? 'border-[#032EA1] bg-[#032EA1]/8 text-[#032EA1] font-semibold hover:bg-[#032EA1] hover:text-white'
                          : 'border-[#0E1113]/15 bg-white text-[#0E1113] hover:border-[#0E1113] hover:bg-[#0E1113] hover:text-white'
                    }`}
                  >
                    {isAdded ? <Check className="mx-auto h-3.5 w-3.5" /> : sz}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:translate-y-1.5 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 transition-all duration-200">
            <button
              type="button"
              onClick={handleDefaultQuickAdd}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 bg-[#0E1113] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#FDFCF9] hover:bg-[#C8232C] transition-colors cursor-pointer"
            >
              <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.8} />
              <span>
                {displayed.sizes.length === 1 ? 'Quick Add' : 'Quick Size'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setQuickViewProduct(displayed)}
              aria-label={`Quick view ${displayed.shortName}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#0E1113]/20 bg-[#FDFCF9] text-[#0E1113] hover:border-[#0E1113] hover:bg-[#EAE7DF] transition-colors cursor-pointer"
            >
              <Eye className="h-4 w-4" strokeWidth={1.7} />
            </button>
          </div>
        )}
      </div>

      {/* Product Specification Block */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#5A5D57]">
          <span className="truncate">
            {displayed.brand} · {displayed.colorway}
          </span>
          {displayed.weightGrams ? (
            <span className="shrink-0 text-[#0E1113]">{displayed.weightGrams}G</span>
          ) : displayed.season ? (
            <span className="shrink-0 text-[#0E1113]">{displayed.season}</span>
          ) : null}
        </div>

        <h3 className="mt-1.5 text-sm font-semibold leading-snug text-[#0E1113] line-clamp-2">
          <button
            type="button"
            onClick={openProductDetail}
            className="text-left hover:text-[#C8232C] transition-colors cursor-pointer"
          >
            {displayed.name}
          </button>
        </h3>

        {/* In-Card Colorway / Kit Edition Swatches */}
        {siblings.length > 1 && (
          <div
            className="mt-2.5 flex items-center gap-1.5"
            role="group"
            aria-label={`Available editions for ${product.club ?? product.brand}`}
          >
            {siblings.map((sib) => {
              const isSelected = sib.id === displayed.id;
              const hex = getProductSwatchColor(sib);
              return (
                <button
                  key={sib.id}
                  type="button"
                  onClick={() => handleSelectSibling(sib.id)}
                  aria-label={`Preview ${sib.shortName} (${sib.colorway})`}
                  aria-pressed={isSelected}
                  title={`${sib.kitType ?? sib.shortName} — ${sib.colorway}`}
                  className={`h-4 w-4 border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#0E1113] ring-1 ring-[#0E1113] ring-offset-1 scale-105'
                      : 'border-[#0E1113]/25 hover:border-[#0E1113]'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              );
            })}
            <span className="ml-1 font-mono text-[10px] text-[#5A5D57]">
              {siblings.length} {product.club ? 'editions' : 'models'}
            </span>
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 pt-3 border-t border-[#0E1113]/8 mt-3.5">
          <div className="flex items-baseline gap-2">
            <span
              className={`font-mono text-[15px] font-semibold tabular-nums ${
                discountPct > 0 ? 'text-[#C8232C]' : 'text-[#0E1113]'
              }`}
            >
              {formatUsd(displayed.price)}
            </span>
            {displayed.originalPrice && (
              <span className="font-mono text-xs line-through tabular-nums text-[#5A5D57]">
                {formatUsd(displayed.originalPrice)}
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#5A5D57]">
            {inStockCount === 3 ? '3 Branches' : `${inStockCount} Branches`}
          </span>
        </div>
      </div>
    </article>
  );
}
