import { Link, useSearchParams } from 'react-router';
import { useI18n } from '../../../lib/i18n';
import { EmptyState, Seo } from '../../../ui';
import { ListingView } from '../listing/ListingView';

export function SearchPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  if (!q) {
    return (
      <section className="mx-auto max-w-[1320px] px-4 py-10 lg:px-8">
        <Seo title={t('search.title')} noindex />
        <EmptyState title={t('search.empty')} body={t('search.noResultsBody')} action={<Link to="/shop" className="font-semibold underline underline-offset-4">{t('listing.shopAll')}</Link>} />
      </section>
    );
  }
  return (
    <>
      <Seo title={t('search.results', { q })} noindex />
      <ListingView
        key={q}
        title={t('search.results', { q })}
        base={{ q }}
        path="/v1/search"
        emptyTitle={t('search.noResults', { q })}
        emptyBody={t('search.noResultsBody')}
        emptyAction={
          <Link to="/shop" className="inline-flex h-11 items-center rounded-[6px] bg-obsidian px-5 font-semibold text-paper">
            {t('listing.shopAll')}
          </Link>
        }
      />
    </>
  );
}
