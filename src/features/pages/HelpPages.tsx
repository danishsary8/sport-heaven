import { Link, useParams } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { PageTitle, Seo } from '../../ui';
import { NotFoundPage } from '../shell/NotFoundPage';
import { TOPICS, helpTopic, type TopicId } from './helpContent';

const container = 'mx-auto max-w-[860px] px-4 pb-16 pt-8 lg:px-8 lg:pt-12';

export function HelpIndexPage() {
  const { t, lang } = useI18n();
  return (
    <section className={container}>
      <Seo title={t('help.title')} canonical="/help" />
      <PageTitle>{t('help.title')}</PageTitle>
      <ul className="mt-8 divide-y divide-stone border-y border-stone">
        {TOPICS.map((id) => {
          const { topic } = helpTopic(id, lang);
          return (
            <li key={id}>
              <Link to={`/help/${id}`} className="block py-4 hover:bg-chalk">
                <span className="block text-lg font-semibold">{topic.title}</span>
                <span className="block text-graphite">{topic.summary}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link to="/track" className="block py-4 hover:bg-chalk">
            <span className="block text-lg font-semibold">{t('nav.track')}</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}

export function HelpTopicPage() {
  const { topic: id = '' } = useParams();
  const { t, lang } = useI18n();
  if (!(TOPICS as readonly string[]).includes(id)) return <NotFoundPage />;
  const { topic, englishOnly } = helpTopic(id as TopicId, lang);
  return (
    <article className={container}>
      <Seo title={topic.title} description={topic.summary} canonical={`/help/${id}`} />
      <Link to="/help" className="text-sm font-semibold text-graphite hover:underline">
        {t('help.title')}
      </Link>
      <PageTitle className="mt-2">{topic.title}</PageTitle>
      {topic.draft && <p className="mt-4 rounded-[6px] bg-brass/15 px-3 py-2 text-sm font-medium">{t('help.draft')}</p>}
      {englishOnly && (
        <p lang="km" className="mt-4 rounded-[6px] bg-stone px-3 py-2 text-sm">
          {t('help.englishOnly')}
        </p>
      )}
      <div lang={englishOnly ? 'en' : undefined} className="mt-6 flex flex-col gap-6 text-[16px]">
        {topic.blocks.map((b, i) => (
          <section key={i}>
            {b.heading && <h2 className="text-xl font-semibold">{b.heading}</h2>}
            {b.text?.map((p) => (
              <p key={p} className="mt-1.5">
                {p}
              </p>
            ))}
            {b.list && (
              <ul className="mt-1.5 list-disc pl-5">
                {b.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {id === 'contact' && (
        <Link to="/stores" className="mt-8 inline-flex h-11 items-center rounded-[6px] bg-cobalt px-5 font-semibold text-paper">
          {t('help.seeStores')}
        </Link>
      )}
    </article>
  );
}
