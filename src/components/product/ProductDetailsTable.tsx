import { useState } from 'react';
import { Check, Layers, MapPin, Package } from 'lucide-react';
import type { CatalogProduct, ProductDetailRow } from '../../lib/mock-store/catalog';
import { useStore } from '../../context/StoreContext';
import { formatUsd } from '../../utils/commerce';

interface ProductDetailsTableProps {
  product: CatalogProduct;
  variant?: 'minimal' | 'technical';
}

const GROUP_META: Array<{
  id: ProductDetailRow['group'];
  title: string;
}> = [
  { id: 'classification', title: '01 · Classification & Identity' },
  { id: 'technical', title: '02 · Construction, Sizing & Specs' },
  { id: 'fulfillment', title: '03 · Stock, Care & Authenticity' },
];

/**
 * Clean, structured Product Details & Variant Stock Table
 * Used across both Minimalist Kit Atelier PDPs (jerseys/F1) and Technical Hardware PDPs (boots/balls/GK).
 */
export function ProductDetailsTable({
  product,
  variant = 'minimal',
}: ProductDetailsTableProps) {
  const { branches } = useStore();
  const [activeTab, setActiveTab] = useState<'specs' | 'inventory'>('specs');
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);

  const activeVariant =
    product.variants[selectedVariantIdx] ?? product.variants[0];

  const surfaceBg = variant === 'minimal' ? 'bg-[#FFFFFF]' : 'bg-[#FAF9F6]';

  return (
    <section
      aria-label="Product specification and inventory details table"
      className={`border-t border-[#0E1113]/12 ${surfaceBg}`}
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-12 lg:py-14">
        {/* Header + View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#0E1113]/12 pb-5">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#5F625C]">
              STRUCTURED SPECIFICATION SHEET · {product.sku}
            </p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#0E1113]">
              Product Details &amp; Variant Stock Table
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Product detail views"
            className="inline-flex border border-[#0E1113]/15 bg-[#FFFFFF]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'specs'}
              onClick={() => setActiveTab('specs')}
              className={`inline-flex h-9 items-center gap-2 px-4 text-xs font-semibold uppercase tracking-[0.1em] transition-colors cursor-pointer ${
                activeTab === 'specs'
                  ? 'bg-[#0E1113] text-white'
                  : 'text-[#5F625C] hover:text-[#0E1113]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Specifications</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'inventory'}
              onClick={() => setActiveTab('inventory')}
              className={`inline-flex h-9 items-center gap-2 px-4 text-xs font-semibold uppercase tracking-[0.1em] transition-colors cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-[#0E1113] text-white'
                  : 'text-[#5F625C] hover:text-[#0E1113]'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>Size &amp; Branch Stock ({product.totalUnitsAvailable})</span>
            </button>
          </div>
        </div>

        {activeTab === 'specs' ? (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 4 Cols: Highlights & Variant Pricing Summary */}
            <div className="lg:col-span-4 space-y-6">
              <div className="border border-[#0E1113]/12 bg-[#FAF9F6] p-5">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5F625C]">
                  Key Performance Highlights
                </p>
                <ul className="mt-3.5 space-y-2.5">
                  {product.techHighlights.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-xs leading-relaxed text-[#0E1113]"
                    >
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C8232C]"
                        strokeWidth={2}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Structured Variant Summary Card */}
              <div className="border border-[#0E1113]/12 bg-[#FFFFFF] p-5">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5F625C]">
                  Available Editions &amp; Pricing
                </p>
                <div className="mt-3 divide-y divide-[#0E1113]/10">
                  {product.variants.map((v) => (
                    <div
                      key={v.variantId}
                      className="flex items-center justify-between gap-3 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0 border border-[#0E1113]/25"
                          style={{ backgroundColor: v.swatchHex }}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#0E1113]">
                            {v.editionLabel}
                          </p>
                          <p className="font-mono text-[10px] text-[#5F625C]">
                            {v.sku} · {v.totalStock} units
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-semibold tabular-nums text-[#0E1113] shrink-0">
                        {formatUsd(v.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 8 Cols: Clean Structured HTML Specification Table */}
            <div className="lg:col-span-8 space-y-6">
              {GROUP_META.map((group) => {
                const groupRows = product.detailsTable.filter(
                  (r) => r.group === group.id,
                );
                if (groupRows.length === 0) return null;
                return (
                  <div
                    key={group.id}
                    className="overflow-hidden border border-[#0E1113]/12 bg-[#FFFFFF]"
                  >
                    <div className="border-b border-[#0E1113]/12 bg-[#FAF9F6] px-4 py-2.5">
                      <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#0E1113]">
                        {group.title}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs sm:text-[13px]">
                        <tbody className="divide-y divide-[#0E1113]/10">
                          {groupRows.map((row) => (
                            <tr
                              key={row.label}
                              className="transition-colors hover:bg-[#FAF9F6]/70"
                            >
                              <th
                                scope="row"
                                className="w-[38%] sm:w-[34%] bg-[#FAF9F6]/45 px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#5F625C] align-top"
                              >
                                {row.label}
                              </th>
                              <td
                                className={`px-4 py-3 text-[#0E1113] leading-relaxed ${
                                  row.mono ? 'font-mono text-xs font-medium' : 'font-medium'
                                }`}
                              >
                                {row.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* TAB 2: STRUCTURED SIZE & PHNOM PENH BRANCH VARIANT STOCK TABLE */
          <div className="mt-8 space-y-5">
            {product.variants.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                {product.variants.map((v, idx) => (
                  <button
                    key={v.variantId}
                    type="button"
                    onClick={() => setSelectedVariantIdx(idx)}
                    className={`inline-flex h-9 items-center gap-2 border px-3.5 text-xs font-medium transition-colors cursor-pointer ${
                      idx === selectedVariantIdx
                        ? 'border-[#0E1113] bg-[#0E1113] text-white'
                        : 'border-[#0E1113]/15 bg-[#FFFFFF] text-[#0E1113] hover:border-[#0E1113]'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 border border-white/40"
                      style={{ backgroundColor: v.swatchHex }}
                    />
                    <span>{v.editionLabel}</span>
                    <span className="font-mono text-[10.5px] opacity-80">
                      {formatUsd(v.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="overflow-x-auto border border-[#0E1113]/12 bg-[#FFFFFF]">
              <table className="w-full min-w-[600px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#0E1113]/12 bg-[#FAF9F6] font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#5F625C]">
                    <th scope="col" className="px-4 py-3">
                      Size
                    </th>
                    {branches.map((branch) => (
                      <th key={branch.id} scope="col" className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {branch.shortName}
                        </span>
                      </th>
                    ))}
                    <th scope="col" className="px-4 py-3">
                      Total Units
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0E1113]/10">
                  {activeVariant.sizes.map((entry) => (
                    <tr
                      key={entry.size}
                      className="hover:bg-[#FAF9F6]/70 transition-colors"
                    >
                      <th
                        scope="row"
                        className="px-4 py-3 font-mono font-semibold text-[#0E1113]"
                      >
                        {entry.size}
                      </th>
                      {branches.map((branch) => {
                        const qty = entry.byBranch[branch.id];
                        return (
                          <td
                            key={branch.id}
                            className={`px-4 py-3 font-mono tabular-nums ${
                              qty === 0 ? 'text-[#5F625C]/45' : 'text-[#0E1113]'
                            }`}
                          >
                            {qty === 0 ? '—' : `${qty} pcs`}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 font-mono font-semibold tabular-nums text-[#0E1113]">
                        {entry.totalQty}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-block border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${
                            entry.status === 'Sold Out'
                              ? 'border-[#0E1113]/15 bg-[#FAF9F6] text-[#5F625C] line-through'
                              : entry.status === 'Low Stock'
                                ? 'border-[#B8933B]/45 bg-[#FFFDF5] text-[#8F6B18]'
                                : 'border-[#0E1113]/20 bg-[#FFFFFF] text-[#0E1113]'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
