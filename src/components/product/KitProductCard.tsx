import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Eye, Heart, Shirt } from 'lucide-react';
import type { Product } from '../../types/store';
import { PRODUCTS } from '../../data/catalog';
import { useStore } from '../../context/StoreContext';
import { assignMorphSource } from '../../hooks/useViewTransition';
import {
  formatJerseySizeWithEu,
  formatUsd,
  getKitUnavailableSizes,
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

interface KitProductCardProps {
  product: Product;
  priority?: boolean;
}

/**
 * Minimalist Portrait 3:4 Jersey & Kit Card
 * Synthesizes Zando's airy high-fashion garment card ergonomics (borderless 3:4 portrait frame,
 * hover back-view / quick-size reveal, inline edition swatches, clean single-row brand + heart)
 * inside Sport Castle's original Swiss-minimalist visual identity.
 */
export function KitProductCard({ product, priority = false }: KitProductCardProps) {
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

  const handleSelectEdition = (targetId: string) => {
    const currentIdx = siblings.findIndex((s) => s.id === displayed.id);
    const nextIdx = siblings.findIndex((s) => s.id === targetId);
    setSlideDir(nextIdx >= currentIdx ? 1 : -1);
    setActiveProductId(targetId);
    setPinnedView('auto');
  };
  const saved = isWishlisted(displayed.id);
  const unavailableSizes = useMemo(
    () => getKitUnavailableSizes(displayed),
    [displayed],
  );

  const discountPct =
    displayed.originalPrice && displayed.originalPrice > displayed.price
      ? Math.round(
          ((displayed.originalPrice - displayed.price) /
            displayed.originalPrice) *
            100,
        )
      : 0;

  const handleQuickAdd = (size: string) => {
    if (unavailableSizes.includes(size)) return;
    addToCart(displayed, size, 1, undefined, false);
    setJustAddedSize(size);
    window.setTimeout(() => setJustAddedSize(null), 700);
  };

  const openDetail = () => {
    assignMorphSource(mediaRef.current);
    navigate({ page: 'product', slug: displayed.slug }, displayed.slug);
  };

  return (
    <article
      onMouseLeave={() => {
        setIsHoveringMedia(false);
        setPinnedView('auto');
      }}
      className="group flex flex-col bg-transparent"
    >
      {/* Portrait 3:4 Minimalist Studio Stage */}
      <div
        ref={mediaRef}
        data-card-view={showingBack ? 'back' : 'front'}
        onMouseEnter={() => {
          if (hasBackView) setIsHoveringMedia(true);
        }}
        onMouseLeave={() => {
          setIsHoveringMedia(false);
        }}
        className="relative aspect-[3/4] w-full overflow-hidden bg-[#F1EFEA] transition-colors duration-300 group-hover:bg-[#EAE7DF]"
      >
        <button
          type="button"
          onClick={openDetail}
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
                  : { opacity: 0, x: slideDir * 20, scale: 1.02 }
              }
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, x: slideDir * -20, scale: 0.985 }
              }
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 h-full w-full"
            >
              {/* Front Studio Layer */}
              <div
                aria-hidden={showingBack}
                className={`absolute inset-0 h-full w-full transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                  showingBack
                    ? 'opacity-0 scale-[1.04]'
                    : 'opacity-100 scale-100 group-hover:scale-[1.03]'
                }`}
              >
                <ProductMedia
                  product={displayed}
                  loading={priority ? 'eager' : 'lazy'}
                  className="h-full w-full bg-[#F1EFEA]"
                />
              </div>

              {/* Back-of-Kit Smooth Hover Layer (Zando-style crossfade) */}
              {displayed.jerseyTheme && (
                <div
                  aria-hidden={!showingBack}
                  className={`absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-b from-[#E4E9EE] via-[#E9ECEE] to-[#DFE3E7] px-2.5 pt-7 pb-3 sm:px-3 sm:pt-3 sm:pb-14 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                    showingBack
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-[0.96] pointer-events-none'
                  }`}
                >
                  <div className="w-[88%] sm:w-[92%]">
                    <JerseyPreviewSvg
                      theme={displayed.jerseyTheme}
                      playerName={backDefaults.playerName}
                      squadNumber={backDefaults.squadNumber}
                      patch={backDefaults.patch}
                      fontStyle={backDefaults.fontStyle}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </button>

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

        {/* Subtle Top-Right Secondary View & Quick-View Controls */}
        <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
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
                  : 'border-[#0E1113]/12 bg-[#FFFFFF]/92 text-[#0E1113] hover:border-[#0E1113]'
              }`}
            >
              <Shirt className="h-3.5 w-3.5" strokeWidth={1.7} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setQuickViewProduct(displayed)}
            aria-label={`Quick view ${displayed.shortName}`}
            title="Quick View"
            className="flex h-8 w-8 items-center justify-center border border-[#0E1113]/12 bg-[#FFFFFF]/92 text-[#0E1113] hover:border-[#0E1113] transition-colors cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={1.7} />
          </button>
        </div>

        {/* Minimal Bottom-Left Single Tag (Only when discounted or limited) */}
        {discountPct > 0 && (
          <span className="pointer-events-none absolute bottom-11 sm:bottom-3 left-0 z-10 bg-[#C8232C] px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.06em] text-white sm:group-hover:opacity-0 transition-opacity">
            -{discountPct}%
          </span>
        )}

        {/* Minimalist Floating Quick-Size Tray on Hover */}
        <div className="absolute inset-x-0 bottom-0 z-20 translate-y-full bg-[#FFFFFF]/96 backdrop-blur-md border-t border-[#0E1113]/10 px-2.5 py-2 transition-transform duration-200 ease-out group-hover:translate-y-0 group-focus-within:translate-y-0 hidden sm:block">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#5F625C]">
              Quick Add Size
            </span>
            {displayed.kitType && (
              <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#0E1113]">
                {displayed.kitType}
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {displayed.sizes.slice(0, 5).map((sz) => {
              const soldOut = unavailableSizes.includes(sz);
              const isAdded = justAddedSize === sz;
              const isPref = sz === memberProfile.preferredJerseySize;
              return (
                <button
                  key={sz}
                  type="button"
                  disabled={soldOut}
                  onClick={() => handleQuickAdd(sz)}
                  title={formatJerseySizeWithEu(sz)}
                  aria-label={
                    soldOut
                      ? `Size ${formatJerseySizeWithEu(sz)} sold out for ${displayed.shortName}`
                      : `Add ${displayed.shortName} size ${formatJerseySizeWithEu(sz)} to bag`
                  }
                  className={`h-7 border font-mono text-[10.5px] transition-colors ${
                    soldOut
                      ? 'border-[#0E1113]/10 bg-[#F4F2EC] text-[#5F625C]/45 line-through cursor-not-allowed'
                      : isAdded
                        ? 'border-[#0E1113] bg-[#0E1113] text-white cursor-pointer'
                        : isPref
                          ? 'border-[#0E1113]/45 bg-[#FFFFFF] text-[#0E1113] font-semibold hover:bg-[#0E1113] hover:text-white cursor-pointer'
                          : 'border-[#0E1113]/15 bg-[#FFFFFF] text-[#0E1113] hover:border-[#0E1113] hover:bg-[#0E1113] hover:text-white cursor-pointer'
                  }`}
                >
                  {isAdded ? <Check className="mx-auto h-3 w-3" /> : sz}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Minimalist Garment Specification Stack */}
      <div className="pt-3 flex flex-col">
        {/* Row 1: Brand / Season + Optimistic Spring Wishlist Heart */}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#5F625C]">
            {displayed.club ?? displayed.brand}
            {displayed.season ? ` · ${displayed.season}` : ''}
          </span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.82 }}
            onClick={() => toggleWishlist(displayed.id)}
            aria-label={
              saved
                ? `Remove ${displayed.shortName} from wishlist`
                : `Save ${displayed.shortName} to wishlist`
            }
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center transition-colors cursor-pointer ${
              saved
                ? 'text-[#C8232C]'
                : 'text-[#0E1113]/65 hover:text-[#0E1113]'
            }`}
          >
            <Heart
              className="h-4 w-4"
              fill={saved ? 'currentColor' : 'none'}
              strokeWidth={1.65}
            />
          </motion.button>
        </div>

        {/* Row 2: Clean Single-Line Kit Title */}
        <h3 className="mt-0.5 text-[13.5px] font-medium leading-snug text-[#0E1113] truncate">
          <button
            type="button"
            onClick={openDetail}
            className="text-left hover:text-[#C8232C] transition-colors cursor-pointer truncate max-w-full"
          >
            {displayed.name}
          </button>
        </h3>

        {/* Row 3: Tabular Monospace Price */}
        <div className="mt-1 flex items-baseline gap-2">
          <span
            className={`font-mono text-[13.5px] font-semibold tabular-nums ${
              discountPct > 0 ? 'text-[#C8232C]' : 'text-[#0E1113]'
            }`}
          >
            {formatUsd(displayed.price)}
          </span>
          {displayed.originalPrice && displayed.originalPrice > displayed.price && (
            <span className="font-mono text-[11.5px] line-through tabular-nums text-[#5F625C]">
              {formatUsd(displayed.originalPrice)}
            </span>
          )}
          {displayed.kitType && (
            <span className="ml-auto font-mono text-[10px] text-[#5F625C]">
              {displayed.kitType}
            </span>
          )}
        </div>

        {/* Row 4: Inline Square Edition Swatches (Zando-style minimal swatch strip) */}
        {siblings.length > 1 && (
          <div
            className="mt-2.5 flex items-center gap-1.5"
            role="group"
            aria-label={`Kit editions for ${product.club ?? product.brand}`}
          >
            {siblings.map((sib) => {
              const active = sib.id === displayed.id;
              return (
                <button
                  key={sib.id}
                  type="button"
                  onClick={() => handleSelectEdition(sib.id)}
                  aria-label={`Switch to ${sib.shortName} (${sib.kitType ?? sib.colorway})`}
                  aria-pressed={active}
                  title={`${sib.kitType ?? sib.shortName} — ${sib.colorway}`}
                  className={`h-3.5 w-3.5 border transition-all cursor-pointer ${
                    active
                      ? 'border-[#0E1113] ring-1 ring-[#0E1113] ring-offset-1'
                      : 'border-[#0E1113]/25 hover:border-[#0E1113]'
                  }`}
                  style={{ backgroundColor: getProductSwatchColor(sib) }}
                />
              );
            })}
            <span className="ml-1 font-mono text-[10px] text-[#5F625C]">
              +{siblings.length} kits
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
