import { Menu, Search, ShoppingBag, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { cx } from '../../ui';
import { useBagCount } from '../cart/api';
import { useMenu } from '../catalog/api';
import { LangSwitch } from './LangSwitch';
import { MobileMenu } from './MobileMenu';
import { Wordmark } from './Wordmark';

const iconButton = 'relative grid size-11 place-items-center rounded-full hover:bg-stone';

export function Header() {
  const { t } = useI18n();
  const { status } = useAuth();
  const menu = useMenu();
  const count = useBagCount();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const bagLabel = count ? t('nav.bagWithCount', { n: count }) : t('nav.bag');

  return (
    <header className={cx('sticky top-0 z-40 bg-paper/95 backdrop-blur transition-shadow', scrolled && 'shadow-[0_1px_0_#EAE7DF]')}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-obsidian focus:px-3 focus:py-2 focus:text-paper">
        {t('nav.skip')}
      </a>
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-2 px-4 lg:h-16 lg:px-8">
        <button type="button" className={cx(iconButton, '-ml-2 lg:hidden')} aria-label={t('nav.menu')} aria-expanded={open} onClick={() => setOpen(true)}>
          <Menu className="size-6" aria-hidden />
        </button>
        <Wordmark className="mr-6 shrink-0" />
        <nav aria-label={t('nav.main')} className="hidden min-w-0 flex-1 lg:block">
          <ul className="flex items-center gap-6">
            {(menu.data?.categories ?? []).slice(0, 7).map((c) => (
              <li key={c.slug}>
                <NavLink
                  to={`/c/${c.slug}`}
                  className={({ isActive }) => cx('whitespace-nowrap text-[15px] font-semibold underline-offset-[6px] hover:underline', isActive && 'underline decoration-2')}
                >
                  {c.name}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink to="/stores" className="whitespace-nowrap text-[15px] font-semibold text-cobalt underline-offset-[6px] hover:underline">
                {t('nav.stores')}
              </NavLink>
            </li>
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-0.5">
          <div className="mr-2 hidden lg:block">
            <LangSwitch />
          </div>
          <Link to="/search" className={iconButton} aria-label={t('nav.search')}>
            <Search className="size-[22px]" aria-hidden />
          </Link>
          <Link to={status === 'member' ? '/account' : '/sign-in'} className={iconButton} aria-label={status === 'member' ? t('nav.account') : t('nav.signIn')}>
            <User className="size-[22px]" aria-hidden />
          </Link>
          <Link to="/bag" className={cx(iconButton, '-mr-2')} aria-label={bagLabel}>
            <ShoppingBag className="size-[22px]" aria-hidden />
            {count ? (
              <span aria-hidden className="tabular absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-vermilion px-1 text-[11px] font-bold text-paper">
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </header>
  );
}
