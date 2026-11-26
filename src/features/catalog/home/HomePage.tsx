import { useI18n } from '../../../lib/i18n';
import { CONTAINER, QueryView, Seo, Skeleton } from '../../../ui';
import { useHome, type HomeSection } from '../api';
import { BrandRow } from './parts/BrandRow';
import { CategoryGrid } from './parts/CategoryGrid';
import { Hero } from './parts/Hero';
import { ProductRail } from './parts/ProductRail';
import { StoreStrip } from './parts/StoreStrip';
import { readBrandRow, readCategoryGrid, readHero, readRail } from './sections';

/** The home page: the sections staff arrange in the admin, in their order, then the stores band. */
export function HomePage() {
  const { t } = useI18n();
  const home = useHome();
  return (
    <>
      <Seo title="Sport Castle" description={t('home.description')} canonical="/" />
      <QueryView
        query={home}
        skeleton={
          <div className={`${CONTAINER} py-6`}>
            <Skeleton className="h-[52vh] w-full" />
          </div>
        }
      >
        {(data) => (
          // -mb-24 cancels the footer's top margin so the stores band meets it.
          <div className="-mb-24 flex flex-col gap-16 lg:gap-24">
            {data.sections.map((s, i) => (
              <Section key={s.id} section={s} first={i === 0} />
            ))}
            {/* Rendered with the sections (not below the skeleton) so the page doesn't jump when they arrive. */}
            <StoreStrip />
          </div>
        )}
      </QueryView>
    </>
  );
}

function Section({ section, first }: { section: HomeSection; first: boolean }) {
  switch (section.type) {
    case 'hero':
      return <Hero content={readHero(section.payload)} priority={first} />;
    case 'product_rail':
      return <ProductRail content={readRail(section.payload)} />;
    case 'category_grid':
      return <CategoryGrid content={readCategoryGrid(section.payload)} />;
    case 'brand_row':
      return <BrandRow content={readBrandRow(section.payload)} />;
    default:
      // A section type this storefront doesn't know yet (newer backend): skip it rather than fail.
      return null;
  }
}
