import { useEffect, useState } from 'react';
import { ArrowRight, Ruler, ShoppingBag, X } from 'lucide-react';
import { BRANCHES } from '../../data/catalog';
import { useStore } from '../../context/StoreContext';
import { formatKhr, formatUsd } from '../../utils/commerce';
import { ProductMedia } from '../product/ProductMedia';

export function ProductQuickViewModal() {
  const {
    quickViewProduct,
    setQuickViewProduct,
    addToCart,
    navigate,
    openSizeGuide,
  } = useStore();
  const [selectedSize, setSelectedSize] = useState('');

  useEffect(() => {
    if (quickViewProduct) {
      setSelectedSize(
        quickViewProduct.sizes[Math.min(2, quickViewProduct.sizes.length - 1)] ??
          quickViewProduct.sizes[0],
      );
    }
  }, [quickViewProduct]);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view ${product.name}`}
    >
      <div
        className="fixed inset-0 bg-[#0B0D10]/55 backdrop-blur-[2px]"
        onClick={() => setQuickViewProduct(null)}
      />

      <div className="relative z-10 grid max-h-[90vh] w-full max-w-3xl grid-cols-1 overflow-y-auto rounded-xl bg-white shadow-2xl md:grid-cols-2">
        <button
          type="button"
          onClick={() => setQuickViewProduct(null)}
          aria-label="Close quick view"
          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#18222D] hover:bg-white shadow-sm cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-[#E5EBF0] flex items-center justify-center">
          <ProductMedia product={product} className="aspect-[4/3] w-full md:h-full" />
        </div>

        <div className="flex flex-col p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#56616A]">
            {product.brand} · {product.colorway}
            {product.surface ? ` · ${product.surface}` : ''}
          </p>
          <h2 className="mt-1.5 font-display text-xl font-bold leading-tight text-[#18222D]">
            {product.name}
          </h2>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-xl font-bold tabular-nums text-[#18222D]">
              {formatUsd(product.price)}
            </span>
            <span className="font-mono text-xs tabular-nums text-[#56616A]">
              ≈ {formatKhr(product.price)}
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-[#56616A]">{product.summary}</p>

          {/* Size Selector */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#18222D]">Select Size</span>
              <button
                type="button"
                onClick={() =>
                  openSizeGuide(product.category === 'boots' ? 'boots' : 'jerseys')
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-[#56616A] hover:text-[#18222D] underline underline-offset-2 cursor-pointer"
              >
                <Ruler className="h-3.5 w-3.5" />
                <span>Size Guide</span>
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`h-9 min-w-[44px] rounded border px-2.5 font-mono text-xs font-medium transition-colors cursor-pointer ${
                    selectedSize === size
                      ? 'border-[#18222D] bg-[#18222D] text-white'
                      : 'border-[#18222D]/15 text-[#18222D] hover:border-[#18222D]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Phnom Penh Branch Stock */}
          <div className="mt-5 border-t border-[#18222D]/10 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#56616A]">
              Phnom Penh Branch Availability
            </p>
            <div className="mt-2 space-y-1 text-xs">
              {BRANCHES.map((branch) => {
                const status = product.branchStock[branch.id];
                return (
                  <div key={branch.id} className="flex items-center justify-between">
                    <span className="text-[#18222D]">{branch.shortName}</span>
                    <span
                      className={`font-medium ${
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

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                addToCart(product, selectedSize, 1, undefined, true);
                setQuickViewProduct(null);
              }}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#18222D] text-sm font-semibold text-white hover:bg-[#0B0D10] cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Add to Bag — {formatUsd(product.price)}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setQuickViewProduct(null);
                navigate({ page: 'product', slug: product.slug });
              }}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-[#18222D]/20 text-xs font-semibold text-[#18222D] hover:border-[#18222D] cursor-pointer"
            >
              <span>
                {product.customizable
                  ? 'Full Specs & Live Custom Printing'
                  : 'View Full Technical Specs'}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
