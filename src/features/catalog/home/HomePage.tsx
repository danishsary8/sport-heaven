import { ArrowRight, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { buildUrl } from '../../../lib/api';
import { useI18n } from '../../../lib/i18n';
import { Picture, QueryView, Seo, Skeleton } from '../../../ui';
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
          <div className="flex flex-col gap-14 pb-16 lg:gap-20">
            {data.sections.map((s, i) => (
              <Section key={s.id} section={s} first={i === 0} />
            ))}
          </div>
        )}
      </QueryView>
      <StoreStrip />
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
      <Picture src={image} alt="" sizes="100vw" priority={first} width={1440} height={900} className="absolute inset-0 -z-10 h-full w-full" imgClassName="opacity-55" />
      <div className={`${container} flex min-h-[64vh] flex-col justify-end py-10 lg:min-h-[72vh] lg:py-16`}>
        <h1 className="max-w-[14ch] font-display text-[clamp(52px,13vw,128px)] font-extrabold uppercase leading-[0.86] tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="mt-4 max-w-[46ch] text-lg text-paper/90">{subtitle}</p>}
        <Link to={href} className="mt-7 inline-flex h-12 w-fit items-center gap-2 rounded-[6px] bg-paper px-6 font-semibold text-obsidian hover:bg-stone">
          {label}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function SectionHead({ id, title, href }: { id: string; title: string; href?: string }) {
  const { t } = useI18n();
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 id={id} className="font-display text-3xl font-bold leading-none lg:text-4xl">
        {title}
      </h2>
      {href && (
        <Link to={href} className="shrink-0 text-[15px] font-semibold underline underline-offset-4 hover:no-underline">
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

function CategoryGrid({ title, slugs }: { title: string; slugs: string[] }) {
  const { t } = useI18n();
  const menu = useMenu();
  const id = 'home-categories';
  const cats = slugs.map((slug) => menu.data?.categories.find((c) => c.slug === slug) ?? { slug, name: slug, productCount: null });
  return (
    <section aria-labelledby={id} className={container}>
      <SectionHead id={id} title={title} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cats.map((c) => (
          <li key={c.slug}>
            <Link to={`/c/${c.slug}`} className="group flex h-28 flex-col justify-between rounded-[8px] bg-stone p-4 hover:bg-obsidian hover:text-paper lg:h-36">
              <span className="font-display text-2xl font-bold leading-none">{c.name}</span>
              {c.productCount != null && <span className="text-sm text-graphite group-hover:text-paper/80">{t('listing.count', { n: c.productCount })}</span>}
            </Link>
          </li>
        ))}
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
      <div className={`${container} py-10 lg:py-14`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id={id} className="font-display text-3xl font-bold leading-none lg:text-4xl">
              {t('home.storesTitle')}
            </h2>
            <p className="mt-2 max-w-prose text-paper/85">{t('home.storesBody')}</p>
          </div>
          <Link to="/stores" className="text-[15px] font-semibold underline underline-offset-4 hover:no-underline">
            {t('home.storesLink')}
          </Link>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {(branches.data?.branches ?? []).map((b) => (
            <li key={b.id} className="flex items-start gap-3 rounded-[8px] bg-paper/10 p-4">
              <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">{b.shortName}</p>
                <p className="text-sm text-paper/80">{b.hours}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
