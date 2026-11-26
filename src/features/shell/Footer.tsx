import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { useBranches } from '../catalog/api';
import { LangSwitch } from './LangSwitch';

export function Footer() {
  const { t } = useI18n();
  const branches = useBranches();
  const link = 'text-paper/80 hover:text-paper hover:underline underline-offset-4';
  return (
    <footer className="relative mt-24 bg-obsidian text-paper">
      <span aria-hidden className="flag-rule absolute inset-x-0 top-0 h-2" />
      <div className="mx-auto max-w-[1320px] px-4 pb-10 pt-14 lg:px-8 lg:pt-16">
        <div className="flex flex-col gap-5 border-b border-paper/15 pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p aria-hidden className="font-display text-[44px] font-extrabold uppercase leading-[0.85] tracking-[-0.01em] lg:text-[64px]">
              Sport<span className="text-vermilion">·</span>Castle
            </p>
            <p className="mt-3 max-w-[44ch] text-[15px] text-paper/75">{t('footer.payments')}</p>
          </div>
          <LangSwitch tone="dark" className="self-start sm:self-auto" />
        </div>
        <div className="grid gap-10 pt-10 lg:grid-cols-[3fr_1fr] lg:gap-16">
          <section aria-labelledby="footer-stores">
            <h2 id="footer-stores" className="font-display text-2xl font-bold">
              {t('footer.stores')}
            </h2>
            {branches.data ? (
              <ul className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-3">
                {branches.data.branches.map((b) => (
                  <li key={b.id} className="text-[15px] leading-snug">
                    <Link to="/stores" className="font-semibold underline-offset-4 hover:underline">
                      {b.shortName}
                    </Link>
                    <p className="mt-1 text-paper/70">{b.address}</p>
                    {b.hours && <p className="tabular text-paper/70">{b.hours}</p>}
                    {b.phone && (
                      <a href={`tel:${b.phone.replace(/\s/g, '')}`} className={`tabular mt-1 inline-block ${link}`}>
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
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-[15px] lg:grid-cols-1">
              <li><Link className={link} to="/track">{t('footer.track')}</Link></li>
              <li><Link className={link} to="/help/delivery">{t('footer.delivery')}</Link></li>
              <li><Link className={link} to="/help/returns">{t('footer.returns')}</Link></li>
              <li><Link className={link} to="/help/contact">{t('footer.contact')}</Link></li>
            </ul>
          </nav>
        </div>
      </div>
      <div className="border-t border-paper/15">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-5 text-sm text-paper/60 lg:px-8">
          <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <Link className="hover:text-paper hover:underline underline-offset-4" to="/help/terms">{t('footer.terms')}</Link>
          <Link className="hover:text-paper hover:underline underline-offset-4" to="/help/privacy">{t('footer.privacy')}</Link>
        </div>
      </div>
    </footer>
  );
}
