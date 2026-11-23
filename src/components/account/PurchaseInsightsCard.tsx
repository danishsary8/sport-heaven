import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, PieChart } from 'lucide-react';
import type { Order, PageRoute } from '../../types/store';
import { formatUsd } from '../../utils/commerce';
import {
  buildDonutArcGeometry,
  calculatePurchaseInsights,
  type InsightDimension,
  type PurchaseInsightSlice,
} from '../../utils/purchaseInsights';

interface PurchaseInsightsCardProps {
  orders: readonly Order[];
  onNavigate: (next: PageRoute) => void;
}

const DONUT_SIZE = 200;
const DONUT_CENTER = DONUT_SIZE / 2;
const DONUT_RADIUS = 76;
const DONUT_STROKE = 18;

export function PurchaseInsightsCard({
  orders,
  onNavigate,
}: PurchaseInsightsCardProps) {
  const [dimension, setDimension] = useState<InsightDimension>('category');

  const insights = useMemo(() => calculatePurchaseInsights(orders), [orders]);

  const activeSlices: readonly PurchaseInsightSlice[] =
    dimension === 'category' ? insights.categories : insights.brands;

  const [focusedKey, setFocusedKey] = useState<string | null>(
    activeSlices[0]?.key ?? null,
  );

  // Keep focused segment aligned with the leading slice when switching tabs or orders change
  useEffect(() => {
    setFocusedKey(activeSlices[0]?.key ?? null);
  }, [dimension, activeSlices]);

  const focusedSlice =
    activeSlices.find((s) => s.key === focusedKey) ?? activeSlices[0] ?? null;

  const arcs = useMemo(
    () => buildDonutArcGeometry(activeSlices, DONUT_RADIUS, 3.5),
    [activeSlices],
  );

  const hasPurchases = insights.totalItems > 0 && activeSlices.length > 0;
  const primaryLeader =
    dimension === 'category'
      ? insights.favoriteCategory
      : insights.favoriteBrand;

  const handleShopFavorite = () => {
    if (dimension === 'category' && insights.favoriteCategory?.collectionSlug) {
      onNavigate({
        page: 'shop',
        collectionSlug: insights.favoriteCategory.collectionSlug,
      });
      return;
    }
    if (dimension === 'brand' && insights.favoriteBrand) {
      onNavigate({
        page: 'search',
        query: insights.favoriteBrand.label,
      });
      return;
    }
    onNavigate({ page: 'shop', collectionSlug: 'all' });
  };

  return (
    <section
      aria-labelledby="purchase-insights-heading"
      data-testid="purchase-insights-card"
      data-dimension={dimension}
      data-total-items={insights.totalItems}
      className="mt-8 border border-[#0E1113]/15 bg-[#FDFCF9] p-6 sm:p-8"
    >
      {/* Card Header + Dimension Switcher */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#0E1113]/10 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-[#B8933B] uppercase">
            Member Analytics · Order History Breakdown
          </p>
          <h2
            id="purchase-insights-heading"
            className="mt-1 font-display text-2xl font-extrabold tracking-tight text-[#0E1113] uppercase sm:text-3xl"
          >
            Purchase Insights
          </h2>
          <p className="mt-1.5 text-xs text-[#5A5D57]">
            {!hasPurchases
              ? 'Complete your first Sport Castle order to see your favorite category and most frequently purchased brands.'
              : dimension === 'category' && insights.favoriteCategory
                ? `Favorite category: ${insights.favoriteCategory.label} (${insights.favoriteCategory.sharePct}% of ${insights.totalItems} purchased ${insights.totalItems === 1 ? 'item' : 'items'} across ${insights.totalOrders} ${insights.totalOrders === 1 ? 'order' : 'orders'}).`
                : insights.favoriteBrand
                  ? `Top purchased brand: ${insights.favoriteBrand.label} (${insights.favoriteBrand.sharePct}% · ${formatUsd(insights.favoriteBrand.totalSpendUsd)} across ${insights.favoriteBrand.orderCount} ${insights.favoriteBrand.orderCount === 1 ? 'order' : 'orders'}).`
                  : 'Purchase summary derived from your completed and active orders.'}
          </p>
        </div>

        {/* Clean Architectural Segmented Control */}
        <div
          role="group"
          aria-label="Purchase insights view"
          className="inline-flex shrink-0 border border-[#0E1113]/18 bg-[#F4F2EC] p-0.5 self-start sm:self-auto"
        >
          <button
            type="button"
            data-testid="insights-tab-category"
            aria-pressed={dimension === 'category'}
            onClick={() => setDimension('category')}
            className={`px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.14em] uppercase transition ${
              dimension === 'category'
                ? 'bg-[#0E1113] text-[#FDFCF9]'
                : 'text-[#5A5D57] hover:text-[#0E1113]'
            }`}
          >
            By Category
          </button>
          <button
            type="button"
            data-testid="insights-tab-brand"
            aria-pressed={dimension === 'brand'}
            onClick={() => setDimension('brand')}
            className={`px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.14em] uppercase transition ${
              dimension === 'brand'
                ? 'bg-[#0E1113] text-[#FDFCF9]'
                : 'text-[#5A5D57] hover:text-[#0E1113]'
            }`}
          >
            By Brand
          </button>
        </div>
      </div>

      {/* Main Visualization & Breakdown */}
      {!hasPurchases ? (
        <div className="mt-6 grid grid-cols-1 items-center gap-6 py-4 md:grid-cols-12">
          <div className="flex justify-center md:col-span-4">
            <div className="relative flex h-[176px] w-[176px] items-center justify-center">
              <svg
                viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
                className="h-full w-full"
                role="img"
                aria-label="Empty purchase insights chart"
              >
                <circle
                  cx={DONUT_CENTER}
                  cy={DONUT_CENTER}
                  r={DONUT_RADIUS}
                  fill="none"
                  stroke="#EAE7DF"
                  strokeWidth={DONUT_STROKE}
                />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <PieChart
                  className="h-5 w-5 text-[#5A5D57]"
                  aria-hidden="true"
                />
                <span className="mt-1 font-mono text-[10px] font-bold tracking-[0.14em] text-[#5A5D57] uppercase">
                  No Orders
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-3 md:col-span-8">
            <h3 className="font-display text-xl font-extrabold text-[#0E1113] uppercase">
              Your Kit &amp; Boot Profile Starts Here
            </h3>
            <p className="max-w-lg text-xs leading-relaxed text-[#5A5D57]">
              Once you order match jerseys, studded football boots, F1 paddock
              apparel, or pitch essentials, this chart maps your favorite gear
              categories and go-to brands automatically.
            </p>
            <button
              type="button"
              onClick={() => onNavigate({ page: 'shop', collectionSlug: 'all' })}
              className="inline-flex items-center gap-1.5 bg-[#0E1113] px-4 py-2.5 font-mono text-[10px] font-bold tracking-[0.14em] text-[#FDFCF9] uppercase transition hover:bg-[#C8232C]"
            >
              <span>Explore Catalog</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Left: Interactive SVG Donut Chart */}
          <div className="flex flex-col items-center justify-center lg:col-span-5">
            <div className="relative h-[216px] w-[216px] sm:h-[232px] sm:w-[232px]">
              <svg
                viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
                className="h-full w-full -rotate-90 overflow-visible"
                role="img"
                data-testid="purchase-insights-donut"
                aria-label={`Donut chart of purchases ${dimension === 'category' ? 'by category' : 'by brand'}: ${activeSlices
                  .map((s) => `${s.label} ${s.sharePct}%`)
                  .join(', ')}`}
              >
                {/* Subtle Alabaster Track */}
                <circle
                  cx={DONUT_CENTER}
                  cy={DONUT_CENTER}
                  r={DONUT_RADIUS}
                  fill="none"
                  stroke="#EAE7DF"
                  strokeWidth={DONUT_STROKE}
                />

                {/* Proportional Arc Segments */}
                {arcs.map((arc) => {
                  const isFocused = focusedSlice?.key === arc.key;
                  const sliceMeta = activeSlices.find((s) => s.key === arc.key);

                  return (
                    <circle
                      key={arc.key}
                      data-testid={`donut-arc-${arc.key}`}
                      data-focused={String(isFocused)}
                      cx={DONUT_CENTER}
                      cy={DONUT_CENTER}
                      r={DONUT_RADIUS}
                      fill="none"
                      stroke={arc.color}
                      strokeWidth={isFocused ? DONUT_STROKE + 3 : DONUT_STROKE}
                      strokeDasharray={`${arc.dashLength} ${arc.dashGap}`}
                      strokeDashoffset={arc.dashOffset}
                      strokeLinecap="butt"
                      onMouseEnter={() => setFocusedKey(arc.key)}
                      onClick={() => setFocusedKey(arc.key)}
                      className="cursor-pointer transition-[stroke-width,opacity] duration-200 motion-reduce:transition-none"
                      opacity={focusedSlice && !isFocused ? 0.52 : 1}
                    >
                      <title>
                        {sliceMeta
                          ? `${sliceMeta.label}: ${sliceMeta.sharePct}% (${sliceMeta.itemCount} ${sliceMeta.itemCount === 1 ? 'item' : 'items'}, ${formatUsd(sliceMeta.totalSpendUsd)})`
                          : `${arc.sharePct}%`}
                      </title>
                    </circle>
                  );
                })}
              </svg>

              {/* Center Metric Readout */}
              {focusedSlice && (
                <div
                  data-testid="donut-center-readout"
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-9 text-center"
                >
                  <span className="font-mono text-[9px] font-bold tracking-[0.16em] text-[#5A5D57] uppercase">
                    {focusedSlice.key === primaryLeader?.key
                      ? dimension === 'category'
                        ? 'Favorite'
                        : 'Top Brand'
                      : 'Selected'}
                  </span>
                  <span className="mt-0.5 font-mono text-[28px] leading-none font-bold tracking-tight text-[#0E1113] tabular-nums">
                    {focusedSlice.sharePct}%
                  </span>
                  <span className="mt-1 max-w-[116px] truncate text-xs font-bold text-[#0E1113]">
                    {focusedSlice.shortLabel}
                  </span>
                  <span className="mt-0.5 font-mono text-[9.5px] text-[#5A5D57] tabular-nums">
                    {focusedSlice.itemCount}{' '}
                    {focusedSlice.itemCount === 1 ? 'item' : 'items'} ·{' '}
                    {formatUsd(focusedSlice.totalSpendUsd)}
                  </span>
                </div>
              )}
            </div>

            <p className="mt-3 text-center font-mono text-[10px] tracking-[0.12em] text-[#5A5D57] uppercase tabular-nums">
              {insights.totalItems}{' '}
              {insights.totalItems === 1 ? 'Item' : 'Items'} ·{' '}
              {formatUsd(insights.totalItemSpendUsd)} Gear Value
              {insights.customPrintedCount > 0
                ? ` · ${insights.customPrintedCount} Heat-Pressed`
                : ''}
            </p>
          </div>

          {/* Right: Top Favorites Strip + Interactive Ranked Legend */}
          <div className="lg:col-span-7">
            {/* At-a-glance Favorite Category & Top Brand Summary */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                data-testid="insight-favorite-category"
                className={`border px-4 py-3 transition-colors ${
                  dimension === 'category'
                    ? 'border-[#0E1113]/30 bg-[#F4F2EC]'
                    : 'border-[#0E1113]/12 bg-[#FDFCF9]'
                }`}
              >
                <p className="font-mono text-[9px] font-bold tracking-[0.16em] text-[#5A5D57] uppercase">
                  Favorite Category
                </p>
                <p className="mt-1 font-display text-lg font-extrabold tracking-tight text-[#0E1113] uppercase">
                  {insights.favoriteCategory?.label ?? '—'}
                </p>
                {insights.favoriteCategory && (
                  <p className="mt-0.5 font-mono text-[10px] text-[#5A5D57] tabular-nums">
                    {insights.favoriteCategory.sharePct}% share ·{' '}
                    {insights.favoriteCategory.itemCount}{' '}
                    {insights.favoriteCategory.itemCount === 1
                      ? 'piece'
                      : 'pieces'}{' '}
                    · {formatUsd(insights.favoriteCategory.totalSpendUsd)}
                  </p>
                )}
              </div>

              <div
                data-testid="insight-favorite-brand"
                className={`border px-4 py-3 transition-colors ${
                  dimension === 'brand'
                    ? 'border-[#B8933B]/55 bg-[#FAF6EB]'
                    : 'border-[#0E1113]/12 bg-[#FDFCF9]'
                }`}
              >
                <p className="font-mono text-[9px] font-bold tracking-[0.16em] text-[#5A5D57] uppercase">
                  Most Purchased Brand
                </p>
                <p className="mt-1 font-display text-lg font-extrabold tracking-tight text-[#0E1113] uppercase">
                  {insights.favoriteBrand?.label ?? '—'}
                </p>
                {insights.favoriteBrand && (
                  <p className="mt-0.5 font-mono text-[10px] text-[#5A5D57] tabular-nums">
                    {insights.favoriteBrand.sharePct}% share ·{' '}
                    {insights.favoriteBrand.itemCount}{' '}
                    {insights.favoriteBrand.itemCount === 1
                      ? 'piece'
                      : 'pieces'}{' '}
                    · {formatUsd(insights.favoriteBrand.totalSpendUsd)}
                  </p>
                )}
              </div>
            </div>

            {/* Interactive Slice Breakdown List */}
            <ul
              aria-label={`Breakdown ${dimension === 'category' ? 'by product category' : 'by brand'}`}
              className="mt-4 divide-y divide-[#0E1113]/10 border-t border-b border-[#0E1113]/10"
            >
              {activeSlices.map((slice) => {
                const isFocused = focusedSlice?.key === slice.key;
                const isTop = slice.key === primaryLeader?.key;

                return (
                  <li key={slice.key}>
                    <button
                      type="button"
                      data-testid={`insight-slice-row-${slice.key}`}
                      aria-pressed={isFocused}
                      onMouseEnter={() => setFocusedKey(slice.key)}
                      onFocus={() => setFocusedKey(slice.key)}
                      onClick={() => setFocusedKey(slice.key)}
                      className={`w-full px-2.5 py-2.5 text-left transition-colors ${
                        isFocused ? 'bg-[#F4F2EC]/90' : 'hover:bg-[#F4F2EC]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className={`h-3 w-3 shrink-0 ${slice.swatchClass}`}
                          />
                          <span className="truncate text-xs font-bold text-[#0E1113]">
                            {slice.label}
                          </span>
                          {isTop && (
                            <span className="shrink-0 font-mono text-[9px] font-bold tracking-[0.12em] text-[#9A7422] uppercase">
                              · #1
                            </span>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-3 font-mono text-[11px] tabular-nums">
                          <span className="hidden text-[#5A5D57] sm:inline">
                            {slice.itemCount}{' '}
                            {slice.itemCount === 1 ? 'item' : 'items'}
                          </span>
                          <span className="text-[#5A5D57]">
                            {formatUsd(slice.totalSpendUsd)}
                          </span>
                          <span className="w-9 text-right font-bold text-[#0E1113]">
                            {slice.sharePct}%
                          </span>
                        </div>
                      </div>

                      {/* Hairline Proportional Bar */}
                      <div
                        aria-hidden="true"
                        className="mt-2 h-1 w-full bg-[#EAE7DF]"
                      >
                        <div
                          className={`h-full transition-[width] duration-300 motion-reduce:transition-none ${slice.swatchClass}`}
                          style={{ width: `${slice.sharePct}%` }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Footer Action Strip */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-[10px] text-[#5A5D57] uppercase">
                Hover or select any segment to inspect spend &amp; volume
              </span>
              <button
                type="button"
                onClick={handleShopFavorite}
                className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.14em] text-[#0E1113] uppercase transition hover:text-[#C8232C]"
              >
                <span>
                  Shop {primaryLeader?.label ?? 'More Gear'}
                </span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
