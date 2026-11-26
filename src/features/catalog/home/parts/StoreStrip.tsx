import { MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { useI18n } from '../../../../lib/i18n';
import { CONTAINER, SectionTitle } from '../../../../ui';
import { useBranches } from '../../api';

/** The cobalt band before the footer: pickup at the three stores, with address and hours. */
export function StoreStrip() {
  const { t } = useI18n();
  const branches = useBranches();
  const id = 'home-stores';
  return (
    <section aria-labelledby={id} className="bg-cobalt text-paper">
      <div className={`${CONTAINER} py-12 lg:py-16`}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <SectionTitle id={id}>{t('home.storesTitle')}</SectionTitle>
            <p className="mt-3 max-w-[52ch] text-paper/85 lg:text-lg">{t('home.storesBody')}</p>
          </div>
          <Link to="/stores" className="text-[15px] font-semibold underline decoration-paper/40 decoration-2 underline-offset-[6px] hover:decoration-paper focus-visible:outline-paper">
            {t('home.storesLink')}
          </Link>
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-3 lg:gap-4">
          {(branches.data?.branches ?? []).map((b) => (
            <li key={b.id} className="flex items-start gap-3 rounded-[8px] bg-paper/[0.08] p-4 ring-1 ring-paper/15 lg:p-5">
              <MapPin className="mt-0.5 size-5 shrink-0 text-paper/90" aria-hidden />
              <div className="min-w-0">
                <p className="font-display text-2xl font-bold leading-none">{b.shortName}</p>
                {b.address && <p className="mt-2 text-sm leading-snug text-paper/80">{b.address}</p>}
                {b.hours && <p className="tabular mt-1 text-sm text-paper/80">{b.hours}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
