import { Link, Navigate, useSearchParams } from 'react-router';
import { useI18n } from '../../../lib/i18n';
import { EmptyState, Seo, Skeleton } from '../../../ui';
import { ListingView } from '../listing/ListingView';
import { hasRealFilters, smartHref, useSmartSearch } from './smart';

export function SearchPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  // Smart search reads the words first (two words or more; "exact=1" skips it). When it finds real filters,
  // the shopper lands on that shop page; otherwise (or when it is off or fails) the exact words are searched.
  const tryWords = !!q && params.get('exact') !== '1' && q.split(/\s+/).length >= 2;
  const smart = useSmartSearch(q, tryWords);
  if (tryWords && smart.isPending) {
    return (
      <section className="mx-auto max-w-[1320px] px-4 py-10 lg:px-8" aria-busy="true">
        <Seo title={t('search.results', { q })} noindex />
        <p className="mb-5 text-graphite">{t('search.smartReading')}</p>
        <Skeleton className="h-72 w-full" />
      </section>
    );
  }
  if (tryWords && smart.data?.filters && hasRealFilters(smart.data.filters)) return <Navigate replace to={smartHref(smart.data.filters, q)} />;
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
