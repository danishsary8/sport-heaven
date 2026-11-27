import { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';

/** How long a page may take before the skeleton shows: most cached pages arrive sooner, so nothing flashes. */
const SHOW_AFTER_MS = 200;

/** Shown while a page's code loads (lazy routes). */
export function PageFallback() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShow(true), SHOW_AFTER_MS);
    return () => clearTimeout(id);
  }, []);
  if (!show) return <div aria-busy="true" className="min-h-[60vh]"><span className="sr-only">{t('common.loading')}</span></div>;
  return (
    <div aria-busy="true" className="animate-fade mx-auto max-w-[1320px] px-4 py-10 lg:px-8">
      <span className="sr-only">{t('common.loading')}</span>
      <div aria-hidden className="skeleton h-10 w-56 rounded" />
      <div aria-hidden className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton aspect-[3/4] rounded-[6px]" />
        ))}
      </div>
    </div>
  );
}

/** A route failed to render or its code could not be fetched (often an old tab after a new release). */
export function RouteError() {
  const { t } = useI18n();
  return (
    <section role="alert" className="mx-auto max-w-[720px] px-4 py-20">
      <h1 className="font-display text-4xl font-bold">{t('routeError.title')}</h1>
      <p className="mt-2 text-graphite">{t('routeError.body')}</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-6 inline-flex h-11 items-center rounded-[6px] bg-obsidian px-5 font-semibold text-paper">
        {t('routeError.reload')}
      </button>
    </section>
  );
}
