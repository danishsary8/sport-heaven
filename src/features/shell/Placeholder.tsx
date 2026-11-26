import { useI18n } from '../../lib/i18n';
import { Seo } from '../../ui';

/** Stands in for a page a later plan builds. Never reachable in a release build once FE5 lands. */
export function Placeholder({ title }: { title: string }) {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-[1320px] px-4 py-16 lg:px-8">
      <Seo title={title} noindex />
      <h1 className="font-display text-4xl font-bold">{title}</h1>
      <p className="mt-2 text-graphite">{t('placeholder.title')}</p>
    </section>
  );
}
