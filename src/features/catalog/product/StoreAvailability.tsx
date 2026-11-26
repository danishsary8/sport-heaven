import { MapPin } from 'lucide-react';
import { useI18n } from '../../../lib/i18n';
import { Availability } from '../../../ui';
import { useBranches, type Variant } from '../api';

/** Which stores have the chosen size (only after a size is chosen: the API answers per size). */
export function StoreAvailability({ variant }: { variant: Variant | undefined }) {
  const { t } = useI18n();
  const branches = useBranches();
  const byBranch = (variant?.byBranch ?? {}) as Record<string, 'ok' | 'low' | 'out'>;
  return (
    <section aria-labelledby="stores-heading" className="mt-8 rounded-[8px] border border-cobalt/25 bg-cobalt/[0.04] p-4">
      <h2 id="stores-heading" className="flex items-center gap-2 font-semibold text-cobalt">
        <MapPin className="size-4" aria-hidden />
        {t('product.inStores')}
      </h2>
      {!variant ? (
        <p className="mt-1 text-sm text-graphite">{t('product.storesHint')}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {(branches.data?.branches ?? []).map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 text-[15px]">
              <span>{b.shortName}</span>
              <Availability value={byBranch[b.id] ?? 'out'} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
