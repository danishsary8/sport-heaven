import type { GridDensity } from '../../types/store';

interface SkeletonCardProps {
  staggerIndex?: number;
}

/**
 * Minimalist architectural skeleton matching ProductCard (4:3 technical gear frame,
 * chalk/paper/stone tokens, hairline borders).
 */
export function ProductCardSkeleton({ staggerIndex = 0 }: SkeletonCardProps) {
  const delayStyle = { animationDelay: `${(staggerIndex % 4) * 75}ms` };

  return (
    <div
      aria-hidden="true"
      className="flex flex-col bg-[#FDFCF9] border border-[#0E1113]/10"
    >
      {/* 4:3 Studio Media Placeholder */}
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-[#0E1113]/8 bg-[#EAE7DF]">
        <div
          className="skeleton-shimmer h-full w-full"
          style={delayStyle}
        />
        {/* Subtle top-left technical stamp placeholder */}
        <div className="absolute left-2.5 top-2.5 h-4 w-12 bg-[#0E1113]/8" />
        {/* Subtle top-right save icon box placeholder */}
        <div className="absolute right-2.5 top-2.5 h-8 w-8 border border-[#0E1113]/8 bg-[#FDFCF9]/70" />
      </div>

      {/* Specification Stack Placeholder */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <div
            className="skeleton-shimmer h-2.5 w-2/3 rounded-[1px]"
            style={delayStyle}
          />
          <div className="skeleton-shimmer h-2.5 w-10 rounded-[1px]" />
        </div>

        <div className="mt-2.5 space-y-1.5">
          <div
            className="skeleton-shimmer h-3.5 w-11/12 rounded-[1px]"
            style={delayStyle}
          />
          <div className="skeleton-shimmer h-3.5 w-3/5 rounded-[1px]" />
        </div>

        {/* Swatch Row Placeholder */}
        <div className="mt-3 flex items-center gap-1.5">
          <span className="h-4 w-4 border border-[#0E1113]/10 bg-[#EAE7DF]" />
          <span className="h-4 w-4 border border-[#0E1113]/10 bg-[#EAE7DF]" />
          <span className="h-4 w-4 border border-[#0E1113]/10 bg-[#EAE7DF]" />
          <span className="ml-1 h-2.5 w-14 bg-[#EAE7DF]" />
        </div>

        {/* Bottom Price & Branch Availability Row */}
        <div className="mt-4 flex items-baseline justify-between gap-2 border-t border-[#0E1113]/8 pt-3.5">
          <div
            className="skeleton-shimmer h-4 w-16 rounded-[1px]"
            style={delayStyle}
          />
          <div className="skeleton-shimmer h-2.5 w-20 rounded-[1px]" />
        </div>
      </div>
    </div>
  );
}

/**
 * Minimalist borderless 3:4 portrait skeleton matching KitProductCard (Jerseys & F1 Atelier).
 */
export function KitProductCardSkeleton({ staggerIndex = 0 }: SkeletonCardProps) {
  const delayStyle = { animationDelay: `${(staggerIndex % 4) * 75}ms` };

  return (
    <div aria-hidden="true" className="flex flex-col bg-transparent">
      {/* Portrait 3:4 Studio Frame */}
      <div className="relative aspect-[3/4] w-full overflow-hidden border border-[#0E1113]/8 bg-[#E7E3D9]">
        <div
          className="skeleton-shimmer-paper h-full w-full"
          style={delayStyle}
        />
      </div>

      {/* Minimalist Garment Specification Stack */}
      <div className="flex flex-col pt-3">
        <div className="flex items-center justify-between gap-2">
          <div
            className="skeleton-shimmer-paper h-2.5 w-1/2 rounded-[1px]"
            style={delayStyle}
          />
          <div className="h-5 w-5 rounded-[1px] bg-[#E7E3D9]" />
        </div>

        <div
          className="skeleton-shimmer-paper mt-1.5 h-3.5 w-10/12 rounded-[1px]"
          style={delayStyle}
        />

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <div className="skeleton-shimmer-paper h-3.5 w-14 rounded-[1px]" />
          <div className="skeleton-shimmer-paper h-2.5 w-10 rounded-[1px]" />
        </div>

        {/* Inline Square Edition Swatches */}
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 border border-[#0E1113]/12 bg-[#E3DED3]" />
          <span className="h-3.5 w-3.5 border border-[#0E1113]/12 bg-[#E3DED3]" />
          <span className="h-3.5 w-3.5 border border-[#0E1113]/12 bg-[#E3DED3]" />
          <span className="ml-1 h-2.5 w-10 bg-[#E7E3D9]" />
        </div>
      </div>
    </div>
  );
}

interface ProductGridSkeletonProps {
  variant: 'technical' | 'kit';
  count: number;
  gridDensity: GridDensity;
}

/**
 * Full responsive product listing grid skeleton matching either the Technical Gear
 * grid or the Minimalist Kit Atelier grid with zero layout shift.
 */
export function ProductGridSkeleton({
  variant,
  count,
  gridDensity,
}: ProductGridSkeletonProps) {
  const colsClass =
    variant === 'kit'
      ? gridDensity === 2
        ? 'grid-cols-2 gap-x-5 gap-y-10'
        : gridDensity === 3
          ? 'grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-10'
          : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10'
      : gridDensity === 2
        ? 'grid-cols-1 sm:grid-cols-2 gap-6'
        : gridDensity === 4
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading products"
      data-testid="product-listing-skeleton"
    >
      <span className="sr-only">Loading Sport Castle catalog items…</span>
      <div className={`grid ${colsClass}`}>
        {Array.from({ length: count }, (_, idx) =>
          variant === 'kit' ? (
            <KitProductCardSkeleton key={idx} staggerIndex={idx} />
          ) : (
            <ProductCardSkeleton key={idx} staggerIndex={idx} />
          ),
        )}
      </div>
    </div>
  );
}

interface ProductDetailSkeletonProps {
  variant: 'technical' | 'kit';
}

/**
 * Architectural Product Detail Page skeleton matching both the Technical Gear 4:3
 * split stage (Chalk/Warm Paper) and the Minimalist Kit Atelier 3:4 portrait stage (Pure Paper).
 */
export function ProductDetailSkeleton({ variant }: ProductDetailSkeletonProps) {
  const isKit = variant === 'kit';
  const shimmer = isKit ? 'skeleton-shimmer-paper' : 'skeleton-shimmer';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading product details"
      data-testid="product-detail-skeleton"
      className={isKit ? 'bg-[#FFFFFF] pb-20' : 'bg-[#F4F2EC]'}
    >
      <span className="sr-only">Loading product details and branch stock…</span>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
        {/* Breadcrumb Skeleton (Technical PDP) */}
        {!isKit && (
          <div className="mb-6 flex items-center gap-2">
            <div className={`${shimmer} h-3 w-12 rounded-[1px]`} />
            <span className="text-[#0E1113]/20">/</span>
            <div className={`${shimmer} h-3 w-24 rounded-[1px]`} />
            <span className="text-[#0E1113]/20">/</span>
            <div className={`${shimmer} h-3 w-40 rounded-[1px]`} />
          </div>
        )}

        {/* Main 12-Column Split Stage */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 items-start">
          {/* LEFT 7 COLS: Vertical Thumbnail Rail + Main Studio Stage */}
          <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-3.5">
            {/* Thumbnail Rail */}
            <div className="flex sm:flex-col gap-2.5 sm:w-22 shrink-0">
              {Array.from({ length: isKit ? 4 : 3 }, (_, idx) => (
                <div
                  key={idx}
                  className={`border border-[#0E1113]/10 p-1 ${
                    isKit
                      ? 'aspect-[3/4] w-[68px] sm:w-full shrink-0 bg-[#F1EFEA]'
                      : 'flex-1 sm:flex-none rounded-lg bg-[#FDFCF9]'
                  }`}
                >
                  <div
                    className={`${shimmer} ${
                      isKit ? 'h-full w-full' : 'aspect-[4/3] w-full rounded'
                    }`}
                    style={{ animationDelay: `${idx * 70}ms` }}
                  />
                  {!isKit && (
                    <div className={`${shimmer} mt-1.5 h-2.5 w-12 rounded-[1px]`} />
                  )}
                </div>
              ))}
            </div>

            {/* Primary Media Stage */}
            <div
              className={`relative flex-1 w-full overflow-hidden border border-[#0E1113]/10 ${
                isKit
                  ? 'aspect-[3/4] max-h-[760px] bg-[#F1EFEA]'
                  : 'aspect-[4/3] rounded-xl bg-[#EAE7DF]'
              }`}
            >
              <div className={`${shimmer} h-full w-full`} />
            </div>
          </div>

          {/* RIGHT 5 COLS: Contiguous Purchase Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Brand, Title & Price Block */}
            <div className="space-y-3">
              <div className={`${shimmer} h-3 w-44 rounded-[1px]`} />
              <div className="space-y-2">
                <div className={`${shimmer} h-8 w-11/12 rounded-[1px]`} />
                <div className={`${shimmer} h-8 w-2/3 rounded-[1px]`} />
              </div>
              <div className="flex items-baseline gap-3 pt-1">
                <div className={`${shimmer} h-7 w-24 rounded-[1px]`} />
                <div className={`${shimmer} h-4 w-28 rounded-[1px]`} />
              </div>
              {!isKit && (
                <div className="space-y-2 pt-2">
                  <div className={`${shimmer} h-3.5 w-full rounded-[1px]`} />
                  <div className={`${shimmer} h-3.5 w-5/6 rounded-[1px]`} />
                </div>
              )}
            </div>

            {/* Edition Switcher Thumbnails */}
            <div className="border-t border-[#0E1113]/10 pt-5 space-y-3">
              <div className={`${shimmer} h-3 w-36 rounded-[1px]`} />
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {Array.from({ length: 3 }, (_, idx) => (
                  <div
                    key={idx}
                    className={`border border-[#0E1113]/10 p-1 ${
                      isKit ? 'bg-[#FAF9F6]' : 'rounded-lg bg-[#FDFCF9]'
                    }`}
                  >
                    <div
                      className={`${shimmer} w-full ${
                        isKit ? 'aspect-[3/4]' : 'aspect-[4/3] rounded'
                      }`}
                      style={{ animationDelay: `${idx * 80}ms` }}
                    />
                    <div className={`${shimmer} mt-1.5 h-2.5 w-14 rounded-[1px]`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Size Matrix */}
            <div className="border-t border-[#0E1113]/10 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className={`${shimmer} h-3 w-24 rounded-[1px]`} />
                <div className={`${shimmer} h-3 w-20 rounded-[1px]`} />
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }, (_, idx) => (
                  <div
                    key={idx}
                    className={`${shimmer} h-11 border border-[#0E1113]/10 ${
                      isKit ? '' : 'rounded-md'
                    }`}
                    style={{ animationDelay: `${idx * 45}ms` }}
                  />
                ))}
              </div>
            </div>

            {/* Primary CTA Row */}
            <div className="flex items-center gap-2.5 pt-1">
              <div
                className={`${shimmer} h-12 flex-1 border border-[#0E1113]/10 ${
                  isKit ? '' : 'rounded-md'
                }`}
              />
              <div
                className={`${shimmer} h-12 w-12 shrink-0 border border-[#0E1113]/10 ${
                  isKit ? '' : 'rounded-md'
                }`}
              />
              {isKit && (
                <div className={`${shimmer} h-12 w-12 shrink-0 border border-[#0E1113]/10`} />
              )}
            </div>

            {/* Trust Strip */}
            <div className="grid grid-cols-2 gap-3 border-y border-[#0E1113]/10 py-3.5">
              <div className={`${shimmer} h-3.5 w-4/5 rounded-[1px]`} />
              <div className={`${shimmer} h-3.5 w-4/5 rounded-[1px]`} />
            </div>

            {/* Branch Stock / Minimalist Accordions Block */}
            <div
              className={`border border-[#0E1113]/10 p-5 space-y-3 ${
                isKit ? 'bg-[#FAF9F6]' : 'rounded-xl bg-[#FDFCF9]'
              }`}
            >
              <div className={`${shimmer} h-3 w-44 rounded-[1px]`} />
              {Array.from({ length: 3 }, (_, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border-t border-[#0E1113]/8 pt-3"
                >
                  <div className="space-y-1.5 w-2/3">
                    <div className={`${shimmer} h-3 w-36 rounded-[1px]`} />
                    <div className={`${shimmer} h-2.5 w-48 rounded-[1px]`} />
                  </div>
                  <div className={`${shimmer} h-3 w-16 rounded-[1px]`} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lower Specification Table Skeleton Preview */}
        <div className="mt-14 border-t border-[#0E1113]/12 pt-10">
          <div className={`${shimmer} h-3 w-40 rounded-[1px]`} />
          <div className={`${shimmer} mt-2 h-7 w-72 rounded-[1px]`} />
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }, (_, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border border-[#0E1113]/10 bg-[#FDFCF9] px-4 py-3.5"
              >
                <div className={`${shimmer} h-3 w-32 rounded-[1px]`} />
                <div className={`${shimmer} h-3 w-40 rounded-[1px]`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
