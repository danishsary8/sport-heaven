import { Clock, MapPin, Phone, Send } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { PageTitle, QueryView, Seo, Skeleton } from '../../ui';
import { useBranches } from '../catalog/api';
import { mapsUrl } from './maps';

/** The three stores as a list with "Open in Google Maps" links (an embedded map needs a Maps key: OWNER-TODO). */
export function StoresPage() {
  const { t } = useI18n();
  const branches = useBranches();
  return (
    <section className="mx-auto max-w-[1320px] px-4 pb-16 pt-8 lg:px-8 lg:pt-12">
      <Seo title={t('stores.title')} description={t('stores.body')} canonical="/stores" />
      <PageTitle size="page">{t('stores.title')}</PageTitle>
      <p className="mt-2 max-w-prose text-graphite">{t('stores.body')}</p>
      <QueryView query={branches} skeleton={<Skeleton className="mt-8 h-48 w-full" />}>
        {(d) => (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {d.branches.map((b) => (
              <article key={b.id} className="flex flex-col gap-3 rounded-[8px] border border-stone bg-chalk/60 p-5 lg:p-6">
                <h2 className="font-display text-[28px] font-bold leading-none">{b.name}</h2>
                <p className="flex gap-2 text-[15px]">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-cobalt" aria-hidden />
                  <span>
                    {b.address}
                    {b.landmarks && <span className="block text-graphite">{b.landmarks}</span>}
                  </span>
                </p>
                <p className="flex gap-2 text-[15px]">
                  <Clock className="mt-0.5 size-4 shrink-0 text-cobalt" aria-hidden />
                  {b.hours}
                </p>
                {b.phone && (
                  <a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`} className="flex gap-2 text-[15px] font-semibold hover:underline">
                    <Phone className="mt-0.5 size-4 shrink-0 text-cobalt" aria-hidden />
                    {b.phone}
                  </a>
                )}
                {b.telegram && (
                  <a href={`https://t.me/${b.telegram.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="flex gap-2 text-[15px] font-semibold hover:underline">
                    <Send className="mt-0.5 size-4 shrink-0 text-cobalt" aria-hidden />
                    {t('stores.telegram', { handle: b.telegram })}
                  </a>
                )}
                <p className="text-sm text-graphite">{b.pickupEnabled ? t('stores.pickup') : t('stores.noPickup')}</p>
                <a
                  href={mapsUrl(b)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t('stores.mapsFor', { name: b.name })}
                  className="mt-auto inline-flex h-11 items-center justify-center rounded-[6px] border border-cobalt font-semibold text-cobalt hover:bg-cobalt hover:text-paper"
                >
                  {t('stores.maps')}
                </a>
              </article>
            ))}
          </div>
        )}
      </QueryView>
    </section>
  );
}
