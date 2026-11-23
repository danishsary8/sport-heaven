import { ArrowRight, ShoppingBag, Sparkles } from 'lucide-react';
import { MATCHDAY_LOOKBOOKS } from '../data/lookbooks';
import { PRODUCTS } from '../data/catalog';
import { useStore } from '../context/StoreContext';
import {
  calculateLookbookBundlePricing,
  formatKhr,
  formatUsd,
} from '../utils/commerce';
import { ProductMedia } from '../components/product';

export function LookbookPage() {
  const { navigate, addBundleToCart, addToCart, memberProfile } = useStore();

  return (
    <div className="animate-page-enter mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#18222D]/10 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#032EA1]">
            Shop The Complete Kit
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#18222D]">
            Matchday Lookbooks &amp; Curated Bundles
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#56616A]">
            Complete matchday pairings styled for Phnom Penh pitches — combine jersey, boot, and pitch gear in one click and automatically save 10% with code CASTLE10.
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="font-mono text-xs text-[#56616A]">
            Auto-sizing with your Club profile:
          </p>
          <p className="mt-0.5 font-mono text-xs font-semibold text-[#18222D]">
            Boots {memberProfile.preferredBootSize} · Jersey {memberProfile.preferredJerseySize}
          </p>
        </div>
      </div>

      {/* Curated Editorial Lookbook Stack */}
      <div className="mt-10 space-y-12">
        {MATCHDAY_LOOKBOOKS.map((bundle, idx) => {
          const pricing = calculateLookbookBundlePricing(
            bundle.productIds,
            bundle.discountPercent,
            PRODUCTS,
          );
          const isReversed = idx % 2 === 1;

          return (
            <section
              key={bundle.id}
              aria-label={bundle.title}
              className="overflow-hidden rounded-2xl border border-[#18222D]/10 bg-white shadow-sm"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                {/* Editorial Visual Column */}
                <div
                  className={`relative min-h-[300px] lg:col-span-5 bg-[#E5EBF0] overflow-hidden ${
                    isReversed ? 'lg:order-2' : ''
                  }`}
                >
                  <img
                    src={bundle.heroImage}
                    alt={bundle.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B0D10]/85 via-[#0B0D10]/30 to-transparent p-6 text-white">
                    <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#D4AF37]">
                      {bundle.tag} · {bundle.pitchContext}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-bold leading-tight">
                      {bundle.title}
                    </h2>
                  </div>
                </div>

                {/* Bundle Items & 1-Click Checkout Column */}
                <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#18222D]/8 pb-4">
                      <p className="text-sm font-medium text-[#56616A]">
                        {bundle.editorialNote}
                      </p>
                    </div>

                    <div className="mt-5 divide-y divide-[#18222D]/8">
                      {pricing.items.map((item) => {
                        const defaultSize =
                          item.category === 'boots' &&
                          item.sizes.includes(memberProfile.preferredBootSize)
                            ? memberProfile.preferredBootSize
                            : (item.category === 'jerseys' ||
                                  item.category === 'f1') &&
                                item.sizes.includes(
                                  memberProfile.preferredJerseySize,
                                )
                              ? memberProfile.preferredJerseySize
                              : item.sizes[0];
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-4 py-3.5"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  { page: 'product', slug: item.slug },
                                  item.slug,
                                )
                              }
                              className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-[#E5EBF0] border border-[#18222D]/8 cursor-pointer"
                              aria-label={`Inspect ${item.name}`}
                            >
                              <ProductMedia
                                product={item}
                                className="h-full w-full"
                              />
                            </button>

                            <div className="min-w-0 flex-1">
                              <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#56616A]">
                                {item.brand}
                                {item.surface ? ` · ${item.surface}` : ''}
                                {item.season ? ` · ${item.season}` : ''}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    { page: 'product', slug: item.slug },
                                    item.slug,
                                  )
                                }
                                className="mt-0.5 block truncate text-left text-sm font-semibold text-[#18222D] hover:text-[#032EA1] hover:underline cursor-pointer"
                              >
                                {item.name}
                              </button>
                              <p className="mt-0.5 font-mono text-xs text-[#56616A]">
                                Default size: {defaultSize} ·{' '}
                                <span className="font-semibold text-[#18222D]">
                                  {formatUsd(item.price)}
                                </span>
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                addToCart(item, defaultSize, 1, undefined, false)
                              }
                              className="h-9 shrink-0 rounded-md border border-[#18222D]/20 px-3 text-xs font-semibold text-[#18222D] hover:border-[#18222D] hover:bg-[#18222D] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                            >
                              + Add Item
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bundle Summary Bar */}
                  <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-[#F5F7F8] p-4 border border-[#18222D]/8">
                    <div>
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-mono text-2xl font-bold tabular-nums text-[#18222D]">
                          {formatUsd(pricing.bundleTotal)}
                        </span>
                        <span className="font-mono text-xs tabular-nums text-[#56616A] line-through">
                          {formatUsd(pricing.originalTotal)}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#032EA1]">
                          Save {formatUsd(pricing.savings)} (-{bundle.discountPercent}%)
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-[#56616A]">
                        ≈ {formatKhr(pricing.bundleTotal)} · Free Phnom Penh Delivery included
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => addBundleToCart(pricing.items, bundle.title)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#18222D] px-5 text-xs font-semibold text-white hover:bg-[#0B0D10] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Add Full Bundle ({pricing.items.length} Items)</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Bottom CTA to Custom Studio */}
      <div className="mt-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-[#18222D]/10 bg-white p-6">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-[#032EA1]" />
          <div>
            <h3 className="font-display text-base font-bold text-[#18222D]">
              Need custom player printing on your team&apos;s matchday pack?
            </h3>
            <p className="mt-0.5 text-xs text-[#56616A]">
              Order 5+ custom printed kits in our studio and unlock an automatic 10% Phnom Penh Squad Discount.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate({ page: 'custom-studio' })}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-[#18222D] px-4 text-xs font-semibold text-[#18222D] hover:bg-[#18222D] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          <span>Open Custom Studio</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
