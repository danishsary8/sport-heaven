import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { useBranches } from '../catalog/api';
import { LangSwitch } from './LangSwitch';

export function Footer() {
  const { t } = useI18n();
  const branches = useBranches();
  const link = 'text-paper/80 hover:text-paper hover:underline underline-offset-4';
  return (
    <footer className="mt-24 bg-obsidian text-paper">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr] lg:px-8">
        <section aria-labelledby="footer-stores">
          <h2 id="footer-stores" className="font-display text-2xl font-bold">
            {t('footer.stores')}
          </h2>
          {branches.data ? (
            <ul className="mt-4 grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
              {branches.data.branches.map((b) => (
                <li key={b.id} className="text-[15px] leading-snug">
                  <Link to="/stores" className="font-semibold hover:underline">
                    {b.shortName}
                  </Link>
                  <p className="text-paper/70">{b.address}</p>
                  {b.hours && <p className="text-paper/70">{b.hours}</p>}
                  {b.phone && (
                    <a href={`tel:${b.phone.replace(/\s/g, '')}`} className={link}>
                      {b.phone}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-paper/70">{t('footer.storesFallback')}</p>
          )}
        </section>
        <nav aria-labelledby="footer-help">
          <h2 id="footer-help" className="font-display text-2xl font-bold">
            {t('footer.help')}
          </h2>
          <ul className="mt-4 flex flex-col gap-2 text-[15px]">
            <li><Link className={link} to="/track">{t('footer.track')}</Link></li>
            <li><Link className={link} to="/help/delivery">{t('footer.delivery')}</Link></li>
            <li><Link className={link} to="/help/returns">{t('footer.returns')}</Link></li>
            <li><Link className={link} to="/help/contact">{t('footer.contact')}</Link></li>
          </ul>
        </nav>
        <div className="flex flex-col gap-4 text-[15px]">
          <p className="text-paper/80">{t('footer.payments')}</p>
          <LangSwitch tone="dark" className="self-start" />
        </div>
      </div>
      <div className="border-t border-paper/15">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-5 text-sm text-paper/60 lg:px-8">
          <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <Link className="hover:text-paper" to="/help/terms">{t('footer.terms')}</Link>
          <Link className="hover:text-paper" to="/help/privacy">{t('footer.privacy')}</Link>
        </div>
      </div>
    </footer>
  );
}
