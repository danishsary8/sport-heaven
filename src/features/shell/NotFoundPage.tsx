import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { PageTitle, Seo } from '../../ui';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-[1320px] px-4 py-16 lg:px-8 lg:py-28">
      <Seo title={t('notFound.title')} noindex />
      <p aria-hidden className="font-display text-[clamp(96px,22vw,220px)] font-extrabold leading-[0.8] text-stone">404</p>
      <PageTitle className="mt-4">{t('notFound.title')}</PageTitle>
      <p className="mt-3 max-w-prose text-graphite">{t('notFound.body')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/search" className="inline-flex h-11 items-center rounded-[6px] bg-obsidian px-5 font-semibold text-paper">
          {t('notFound.search')}
        </Link>
        <Link to="/" className="inline-flex h-11 items-center rounded-[6px] border border-obsidian px-5 font-semibold">
          {t('notFound.home')}
        </Link>
      </div>
    </section>
  );
}
