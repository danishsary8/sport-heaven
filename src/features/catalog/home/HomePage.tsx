import { useI18n, type DictKey } from '../../../lib/i18n';
import { CONTAINER, QueryView, Seo, Skeleton } from '../../../ui';
import { useHome, type HomeSection } from '../api';
import { BrandRow } from './parts/BrandRow';
import { CategoryGrid } from './parts/CategoryGrid';
import { HeroCarousel, type HeroSlide } from './parts/HeroCarousel';
import { CAMPAIGN_SLIDES } from './heroSlides';
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
            {/* The hero(es) from the API open the carousel, followed by the campaign slides. */}
            <HeroCarousel slides={heroSlides(data.sections, t)} />
            {data.sections
              .filter((s) => s.type !== 'hero')
              .map((s) => (
                <Section key={s.id} section={s} />
              ))}
            {/* Rendered with the sections (not below the skeleton) so the page doesn't jump when they arrive. */}
            <StoreStrip />
          </div>
        )}
      </QueryView>
    </>
  );
}

function Section({ section }: { section: HomeSection }) {
  switch (section.type) {
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

type Translate = (key: DictKey, vars?: Record<string, string | number>) => string;

/** The campaign slides (copy translated), then the hero(es) from the API. */
function heroSlides(sections: HomeSection[], t: Translate): HeroSlide[] {
  const fromApi: HeroSlide[] = sections
    .filter((s) => s.type === 'hero')
    .map((s) => {
      const h = readHero(s.payload);
      const cta = h.href.startsWith('/collections/new-arrivals') ? t('home.shopNew') : t('home.shopNow');
      return { id: `api-${s.id}`, title: h.title, body: h.subtitle, cta, href: h.href, tone: 'photo', image: h.image, products: [] };
    });
  const campaign: HeroSlide[] = CAMPAIGN_SLIDES.map((c) => ({
    id: c.id,
    title: t(c.title),
    body: t(c.body),
    cta: t(c.cta),
    href: c.href,
    tone: c.image ? 'photo' : c.tone,
    image: c.image,
    align: c.align,
    focus: c.focus,
    valign: c.valign,
    products: c.products,
  }));
  // Player campaigns open the carousel; the hero managed in the API follows them.
  return [...campaign, ...fromApi];
}
