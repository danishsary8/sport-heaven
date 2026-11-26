import { Link } from 'react-router';
import { useI18n } from '../../../lib/i18n';
import { PageTitle, QueryView, Seo } from '../../../ui';
import { useProducts } from '../api';
import { GridSkeleton } from '../listing/ListingView';
import { ProductCard } from '../ProductCard';

/** Customisable products are exactly the jerseys and F1 teamwear (no "customizable" filter in the API). */
export function CustomPage() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-[1320px] px-4 pb-16 pt-6 lg:px-8 lg:pt-10">
      <Seo title={t('custom.title')} canonical="/custom" />
      <PageTitle size="page">{t('custom.title')}</PageTitle>
      <p className="mt-2 max-w-prose text-graphite">{t('custom.body')}</p>
      <CustomRail category="jerseys" title={t('custom.jerseys')} />
      <CustomRail category="f1" title={t('custom.f1')} />
    </section>
  );
}

function CustomRail({ category, title }: { category: string; title: string }) {
  const { t } = useI18n();
  const products = useProducts({ category, sort: 'popular' });
  return (
    <section aria-labelledby={`custom-${category}`} className="mt-10">
      <div className="mb-4 flex items-end justify-between">
        <h2 id={`custom-${category}`} className="font-display text-3xl font-bold">
          {title}
        </h2>
        <Link to={`/c/${category}`} className="font-semibold underline underline-offset-4">
          {t('home.seeAll')}
        </Link>
      </div>
      <QueryView query={products} skeleton={<GridSkeleton n={4} />}>
        {(d) => (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
            {d.pages[0]!.products.slice(0, 8).map((p) => (
              <li key={p.id}>
                <ProductCard product={p} hash="print" />
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </section>
  );
}
