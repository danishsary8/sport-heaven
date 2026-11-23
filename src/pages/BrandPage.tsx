import { ArrowRight, Check } from 'lucide-react';
import { PRODUCTS } from '../data/catalog';
import { BRAND_BY_SLUG, BRAND_PROFILES } from '../data/editorial';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/product';

interface BrandPageProps {
  slug: string;
}

export function BrandPage({ slug }: BrandPageProps) {
  const { navigate, navigateToShop } = useStore();
  const brand = BRAND_BY_SLUG.get(slug.toLowerCase()) ?? BRAND_PROFILES[0];

  const brandProducts = PRODUCTS.filter((p) => {
    if (brand.categoryFilter) return p.category === brand.categoryFilter;
    if (brand.brandFilter) return p.brand.toLowerCase() === brand.brandFilter.toLowerCase();
    return false;
  });

  return (
    <div className="bg-[#F4F2EC] animate-page-reveal">
      {/* Breadcrumb */}
      <div className="border-b border-[#0E1113]/12 bg-[#FDFCF9]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5A5D57]">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate({ page: 'home' })}
              className="hover:text-[#0E1113] cursor-pointer"
            >
              Home
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => navigateToShop({ collectionSlug: 'all' })}
              className="hover:text-[#0E1113] cursor-pointer"
            >
              Brands
            </button>
            <span>/</span>
            <span className="text-[#0E1113] font-semibold">{brand.name}</span>
          </nav>
          <span>{brandProducts.length} AUTHENTIC ITEMS</span>
        </div>
      </div>

      {/* Brand Monograph Header */}
      <section className="border-b border-[#0E1113]/12 bg-[#FDFCF9] atelier-grid-bg">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-12 lg:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#5A5D57]">
                <span className="text-[#C8232C] font-semibold">OFFICIAL PARTNER</span>
                <span>·</span>
                <span>EST. {brand.founded}</span>
                <span>·</span>
                <span>{brand.origin}</span>
              </div>
              <h1 className="mt-3 font-display text-5xl sm:text-6xl font-extrabold uppercase leading-[0.94] text-[#0E1113]">
                {brand.display}
              </h1>
              <p className="mt-2 font-editorial italic text-2xl text-[#5A5D57]">
                {brand.tagline}
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[#5A5D57]">
                {brand.story}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {brand.signatureTech.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center gap-1.5 border border-[#0E1113]/15 bg-[#F4F2EC] px-3 py-1.5 font-mono text-[11px] text-[#0E1113]"
                  >
                    <Check className="h-3 w-3 text-[#C8232C]" />
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative aspect-[4/3] overflow-hidden border border-[#0E1113]/15 bg-[#EAE7DF] shadow-[8px_8px_0px_rgba(14,17,19,0.06)]">
                <img
                  src={brand.heroImage}
                  alt={brand.display}
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-3 left-3 bg-[#0E1113] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#FDFCF9]">
                  Phnom Penh Authorized Stock
                </div>
              </div>
            </div>
          </div>

          {/* Switch Between All Partner Brands */}
          <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-[#0E1113]/12 pt-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5A5D57] mr-2">
              Switch Brand:
            </span>
            {BRAND_PROFILES.map((b) => {
              const active = b.slug === brand.slug;
              return (
                <button
                  key={b.slug}
                  type="button"
                  onClick={() => navigate({ page: 'brand', slug: b.slug })}
                  className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] border transition-colors cursor-pointer ${
                    active
                      ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                      : 'border-[#0E1113]/15 bg-[#FDFCF9] text-[#0E1113] hover:border-[#0E1113]'
                  }`}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Brand Product Grid */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#5A5D57]">
              IN-STOCK PHNOM PENH INVENTORY
            </p>
            <h2 className="mt-1 font-display text-3xl font-extrabold uppercase text-[#0E1113]">
              {brand.name} Collection ({brandProducts.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() =>
              navigateToShop(
                brand.categoryFilter
                  ? { category: brand.categoryFilter }
                  : { brand: brand.brandFilter },
              )
            }
            className="inline-flex items-center gap-2 border border-[#0E1113] bg-[#FDFCF9] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#0E1113] hover:bg-[#0E1113] hover:text-[#FDFCF9] transition-colors cursor-pointer"
          >
            Open with Full Facet Filters
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {brandProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
