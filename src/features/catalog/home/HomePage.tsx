import { ArrowRight, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { buildUrl } from '../../../lib/api';
import { useI18n } from '../../../lib/i18n';
import { Picture, QueryView, Seo, Skeleton, cx } from '../../../ui';
import { useBranches, useHome, useMenu, type HomeSection, type ProductSummary } from '../api';
import { ProductCard } from '../ProductCard';

const HERO_FALLBACK = '/assets/site/editorial_phnom_penh_pitch_1795112606361.jpg';
const container = 'mx-auto w-full max-w-[1320px] px-4 lg:px-8';

/** A link object from a section payload → a storefront URL. */
function linkTo(link: unknown): string {
  const l = (link ?? {}) as Record<string, string>;
  if (l.collection) return `/collections/${l.collection}`;
  if (l.category) return `/c/${l.category}`;
  if (l.brand) return `/brands/${l.brand}`;
  if (l.product) return `/p/${l.product}`;
  return '/shop';
}

/** A rail's API query → the listing URL that shows the same products. */
export function railHref(query: unknown): string {
  const q = (query ?? {}) as Record<string, string | string[]>;
  const { category, collection, ...rest } = q;
  const base = collection ? `/collections/${collection}` : category ? `/c/${category}` : '/shop';
  return buildUrl(base, rest).replace(/^https?:\/\/[^/]+/, '');
}

export function HomePage() {
  const { t } = useI18n();
  const home = useHome();
  return (
    <>
      <Seo title="Sport Castle" description={t('home.description')} canonical="/" />
      <QueryView
        query={home}
        skeleton={
          <div className={`${container} py-6`}>
            <Skeleton className="h-[52vh] w-full" />
          </div>
        }
      >
        {(data) => (
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
  const p = section.payload as Record<string, unknown> & { title?: string; products?: ProductSummary[] };
  switch (section.type) {
    case 'hero':
      return <Hero title={p.title ?? ''} subtitle={p.subtitle as string | undefined} href={linkTo(p.link)} image={(p.imagePath as string | null) ?? HERO_FALLBACK} first={first} />;
    case 'product_rail':
      return <Rail title={p.title ?? ''} products={p.products ?? []} href={railHref(p.query)} />;
    case 'category_grid':
      return <CategoryGrid title={p.title ?? ''} slugs={(p.categories as string[] | undefined) ?? []} />;
    case 'brand_row':
      return <BrandRow title={p.title ?? ''} slugs={(p.brands as string[] | undefined) ?? []} />;
    default:
      return null;
  }
}

function Hero({ title, subtitle, href, image, first }: { title: string; subtitle?: string; href: string; image: string; first: boolean }) {
  const { t } = useI18n();
  const label = href.startsWith('/collections/new-arrivals') ? t('home.shopNew') : t('home.shopNow');
  return (
    <section className="relative isolate overflow-hidden bg-obsidian text-paper">
      <Picture src={image} alt="" sizes="100vw" priority={first} width={1440} height={900} className="absolute inset-0 -z-20 h-full w-full" imgClassName="opacity-80" />
      {/* Dark from the bottom-left, where the headline sits, so the photo keeps its colour elsewhere. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(14_17_19/0.92)_0%,rgb(14_17_19/0.55)_45%,rgb(14_17_19/0.15)_100%)] lg:bg-[linear-gradient(100deg,rgb(14_17_19/0.9)_0%,rgb(14_17_19/0.55)_45%,rgb(14_17_19/0.05)_80%)]" />
      <div className={`${container} flex min-h-[68vh] flex-col justify-end pb-10 pt-24 lg:min-h-[74vh] lg:pb-20`}>
        <span aria-hidden className="flag-rule mb-5 block h-3 w-[72px] lg:mb-7 lg:h-4 lg:w-24" />
        <h1 className="max-w-[14ch] font-display text-[clamp(56px,14vw,148px)] font-extrabold uppercase leading-[0.84] tracking-[-0.015em]">{title}</h1>
        {subtitle && <p className="mt-5 max-w-[40ch] text-lg leading-snug text-paper/90 lg:text-xl">{subtitle}</p>}
        <Link
          to={href}
          className="group mt-8 inline-flex h-13 w-fit items-center gap-2.5 rounded-[6px] bg-paper px-7 text-base font-semibold text-obsidian transition-colors hover:bg-stone focus-visible:outline-paper"
        >
          {label}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function SectionHead({ id, title, href }: { id: string; title: string; href?: string }) {
  const { t } = useI18n();
  return (
    <div className="mb-5 flex items-end justify-between gap-4 lg:mb-7">
      <h2 id={id} className="font-display text-[34px] font-bold leading-[0.95] tracking-[-0.005em] lg:text-5xl">
        {title}
      </h2>
      {href && (
        <Link to={href} className="mb-0.5 shrink-0 text-[15px] font-semibold underline decoration-obsidian/30 decoration-2 underline-offset-[6px] transition-colors hover:decoration-obsidian">
          {t('home.seeAll')}
        </Link>
      )}
    </div>
  );
}

function Rail({ title, products, href }: { title: string; products: ProductSummary[]; href: string }) {
  const id = `rail-${title.replace(/\W+/g, '-').toLowerCase()}`;
  if (products.length === 0) return null;
  return (
    <section aria-labelledby={id} className={container}>
      <SectionHead id={id} title={title} href={href} />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [contain:paint] [scroll-padding-inline:16px] lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
        {products.slice(0, 8).map((p) => (
          <li key={p.id} className="w-[44vw] max-w-[240px] shrink-0 snap-start lg:w-auto lg:max-w-none">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A product photo per category, from the catalog's own studio shots. Categories without one get a type-only tile. */
const CATEGORY_IMAGES: Record<string, string> = {
  boots: '/assets/catalog/boot_predator_25_ft_1795135088584.jpg',
  jerseys: '/assets/catalog/jersey_cambodia_blue_1795112605589.jpg',
  f1: '/assets/catalog/jersey_f1_mclaren_2026_1795193990807.jpg',
  balls: '/assets/catalog/ball_ucl_pro_2627_1795193989350.jpg',
  essentials: '/assets/catalog/gear_gk_pro_gloves_1795138746248.jpg',
};

function CategoryGrid({ title, slugs }: { title: string; slugs: string[] }) {
  const { t } = useI18n();
  const menu = useMenu();
  const id = 'home-categories';
  const cats = slugs.map((slug) => menu.data?.categories.find((c) => c.slug === slug) ?? { slug, name: slug, productCount: null });
  return (
    <section aria-labelledby={id} className={container}>
      <SectionHead id={id} title={title} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {cats.map((c, i) => {
          const image = CATEGORY_IMAGES[c.slug];
          // With an odd count, the first tile runs the full width on phones so the grid has no gap.
          const wide = i === 0 && cats.length % 2 === 1;
          return (
            <li key={c.slug} className={cx(wide && 'max-sm:col-span-2')}>
              <Link
                to={`/c/${c.slug}`}
                className={cx(
                  'stage group relative isolate flex h-full flex-col overflow-hidden rounded-[8px] p-4 transition-colors hover:bg-[#E2DED4] lg:p-5',
                  image ? (wide ? 'aspect-[2/1] sm:aspect-[4/5]' : 'aspect-[4/5]') : 'min-h-28 justify-between lg:min-h-36',
                )}
              >
                <span className="relative z-10 font-display text-[26px] font-bold leading-[0.95] lg:text-[28px]">{c.name}</span>
                {c.productCount != null && <span className="tabular relative z-10 mt-1 text-sm text-graphite">{t('listing.count', { n: c.productCount })}</span>}
                {image && (
                  <Picture
                    src={image}
                    alt=""
                    sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                    className={cx(
                      'absolute inset-x-0 bottom-0 h-[72%] [mask-image:linear-gradient(to_bottom,transparent,black_28%)]',
                      wide && 'max-sm:left-auto max-sm:h-full max-sm:w-[58%] max-sm:[mask-image:linear-gradient(to_right,transparent,black_30%)]',
                    )}
                    imgClassName="object-cover object-[50%_65%] transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BrandRow({ title, slugs }: { title: string; slugs: string[] }) {
  const menu = useMenu();
  const id = 'home-brands';
  const brands = (slugs.length ? slugs : (menu.data?.brands ?? []).map((b) => b.slug)).map((slug) => menu.data?.brands.find((b) => b.slug === slug) ?? { slug, name: slug });
  return (
    <section aria-labelledby={id} className={container}>
      <SectionHead id={id} title={title} />
      <ul className="flex flex-wrap gap-2">
        {brands.map((b) => (
          <li key={b.slug}>
            <Link to={`/brands/${b.slug}`} className="inline-flex h-11 items-center rounded-full border border-[#C9C5BB] px-5 font-semibold hover:border-obsidian">
              {b.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StoreStrip() {
  const { t } = useI18n();
  const branches = useBranches();
  const id = 'home-stores';
  return (
    <section aria-labelledby={id} className="bg-cobalt text-paper">
      <div className={`${container} py-12 lg:py-16`}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <h2 id={id} className="font-display text-[34px] font-bold leading-[0.95] lg:text-5xl">
              {t('home.storesTitle')}
            </h2>
            <p className="mt-3 max-w-[52ch] text-paper/85 lg:text-lg">{t('home.storesBody')}</p>
          </div>
          <Link to="/stores" className="text-[15px] font-semibold underline decoration-paper/40 decoration-2 underline-offset-[6px] hover:decoration-paper focus-visible:outline-paper">
            {t('home.storesLink')}
          </Link>
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-3 lg:gap-4">
          {(branches.data?.branches ?? []).map((b) => (
            <li key={b.id} className="flex items-start gap-3 rounded-[8px] bg-paper/[0.08] p-4 ring-1 ring-paper/15 lg:p-5">
              <MapPin className="mt-0.5 size-5 shrink-0 text-paper/90" aria-hidden />
              <div className="min-w-0">
                <p className="font-display text-2xl font-bold leading-none">{b.shortName}</p>
                {b.address && <p className="mt-2 text-sm leading-snug text-paper/80">{b.address}</p>}
                {b.hours && <p className="tabular mt-1 text-sm text-paper/80">{b.hours}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
