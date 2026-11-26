import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { Sheet } from '../../ui';
import { useMenu } from '../catalog/api';
import { LangSwitch } from './LangSwitch';

export function MobileMenu({ open, onClose }: { open: boolean; onClose(): void }) {
  const { t } = useI18n();
  const menu = useMenu();
  const link = 'block py-2.5 text-[17px] font-medium';
  return (
    <Sheet open={open} onClose={onClose} side="left" title={t('nav.menu')}>
      <nav aria-label={t('nav.categories')} className="flex flex-col gap-6" onClick={(e) => (e.target as HTMLElement).closest('a') && onClose()}>
        <ul className="divide-y divide-stone">
          {(menu.data?.categories ?? []).map((c) => (
            <li key={c.slug}>
              <Link to={`/c/${c.slug}`} className="flex items-baseline justify-between py-3 font-display text-2xl font-bold">
                {c.name}
              </Link>
            </li>
          ))}
          <li>
            <Link to="/shop" className="flex py-3 font-display text-2xl font-bold">
              {t('nav.shopAll')}
            </Link>
          </li>
        </ul>
        {menu.data && menu.data.brands.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-semibold text-graphite">{t('nav.brands')}</h3>
            <ul className="flex flex-wrap gap-x-4">
              {menu.data.brands.map((b) => (
                <li key={b.slug}>
                  <Link to={`/brands/${b.slug}`} className={link}>
                    {b.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ul>
          <li>
            <Link to="/stores" className={link}>
              {t('nav.stores')}
            </Link>
          </li>
          <li>
            <Link to="/track" className={link}>
              {t('nav.track')}
            </Link>
          </li>
          <li>
            <Link to="/help" className={link}>
              {t('nav.help')}
            </Link>
          </li>
        </ul>
      </nav>
      <div className="mt-6 border-t border-stone pt-5">
        <LangSwitch />
      </div>
    </Sheet>
  );
}
