import { ChevronDown, Menu, Search, ShoppingBag, User } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { cx } from '../../ui';
import { useBagCount } from '../cart/api';
import { BAG_BUMP, BAG_OPEN } from '../cart/bagEvents';
import { useMenu } from '../catalog/api';
import { LangSwitch } from './LangSwitch';
import { useMegaMenu } from './useMegaMenu';
import { Wordmark } from './Wordmark';

// Only needed once someone opens a category, so it loads then (keeps the first page light).
const MobileMenu = lazy(() => import('./MobileMenu').then((m) => ({ default: m.MobileMenu })));
const SearchOverlay = lazy(() => import('../catalog/search/SearchOverlay').then((m) => ({ default: m.SearchOverlay })));
const BagDrawer = lazy(() => import('../cart/BagDrawer').then((m) => ({ default: m.BagDrawer })));
const MegaMenuPanel = lazy(() => import('./MegaMenu').then((m) => ({ default: m.MegaMenuPanel })));

const iconButton = 'relative grid size-11 place-items-center rounded-full hover:bg-stone';

export function Header() {
  const { t } = useI18n();
  const { status } = useAuth();
  const menu = useMenu();
  const count = useBagCount();
  const [open, setOpen] = useState(false);
  // The phone menu's code loads on the first tap and stays mounted after that (so it can animate closed).
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoaded, setSearchLoaded] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [bagLoaded, setBagLoaded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bump, setBump] = useState(0);

  // The add-to-bag flight lands here (the bag bounces), and alerts can open the bag drawer.
  useEffect(() => {
    const onBump = () => setBump((n) => n + 1);
    const onOpen = () => {
      setBagLoaded(true);
      setBagOpen(true);
    };
    window.addEventListener(BAG_BUMP, onBump);
    window.addEventListener(BAG_OPEN, onOpen);
    return () => {
      window.removeEventListener(BAG_BUMP, onBump);
      window.removeEventListener(BAG_OPEN, onOpen);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const categories = (menu.data?.categories ?? []).slice(0, 7);
  const mega = useMegaMenu();
  const openCategory = categories.find((c) => c.slug === mega.open);

  const bagLabel = count ? t('nav.bagWithCount', { n: count }) : t('nav.bag');

  return (
    <header className={cx('sticky top-0 z-40 bg-paper/95 backdrop-blur transition-shadow', scrolled && 'shadow-[0_1px_0_#EAE7DF]')}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-obsidian focus:px-3 focus:py-2 focus:text-paper">
        {t('nav.skip')}
      </a>
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-2 px-4 lg:h-16 lg:px-8">
        <button type="button" className={cx(iconButton, '-ml-2 lg:hidden')} aria-label={t('nav.menu')} aria-expanded={open} onClick={() => {
            setMenuLoaded(true);
            setOpen(true);
          }}>
          <Menu className="size-6" aria-hidden />
        </button>
        <Wordmark className="mr-6 shrink-0" />
        <nav aria-label={t('nav.main')} className="hidden min-w-0 flex-1 lg:block" onMouseLeave={mega.leave} onKeyDown={mega.onKeyDown}>
          <ul className="flex items-center gap-1">
            {categories.map((c) => {
              const open = mega.open === c.slug;
              return (
                <li key={c.slug} className="flex items-center" onMouseEnter={() => mega.enter(c.slug)}>
                  <NavLink
                    to={`/c/${c.slug}`}
                    className={({ isActive }) =>
                      cx(
                        'whitespace-nowrap py-5 pl-2.5 text-[15px] font-semibold underline-offset-[6px] hover:underline',
                        (isActive || open) && 'underline decoration-2',
                      )
                    }
                  >
                    {c.name}
                  </NavLink>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={open ? `mega-${c.slug}` : undefined}
                    aria-label={t('mega.open', { name: c.name })}
                    onClick={() => mega.toggle(c.slug)}
                    className="grid size-6 place-items-center rounded text-graphite hover:text-obsidian"
                  >
                    <ChevronDown className={cx('size-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
                  </button>
                </li>
              );
            })}
            <li className="ml-2" onMouseEnter={() => mega.enter(null)}>
              <NavLink to="/stores" className="whitespace-nowrap text-[15px] font-semibold text-cobalt underline-offset-[6px] hover:underline">
                {t('nav.stores')}
              </NavLink>
            </li>
          </ul>
          {openCategory && (
            <Suspense fallback={null}>
              <MegaMenuPanel id={`mega-${openCategory.slug}`} category={openCategory.slug} name={openCategory.name} onNavigate={mega.close} />
            </Suspense>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-0.5">
          <div className="mr-2 hidden lg:block">
            <LangSwitch />
          </div>
          <button
            type="button"
            className={iconButton}
            aria-label={t('nav.search')}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey) return void window.open('/search', '_blank');
              setSearchLoaded(true);
              setSearchOpen(true);
            }}
          >
            <Search className="size-[22px]" aria-hidden />
          </button>
          <Link to={status === 'member' ? '/account' : '/sign-in'} className={iconButton} aria-label={status === 'member' ? t('nav.account') : t('nav.signIn')}>
            <User className="size-[22px]" aria-hidden />
          </Link>
          <Link
            to="/bag"
            className={cx(iconButton, '-mr-2')}
            aria-label={bagLabel}
            data-bag-target
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              setBagLoaded(true);
              setBagOpen(true);
            }}
          >
            <ShoppingBag key={bump} className={cx('size-[22px]', bump > 0 && 'animate-bag-bump')} aria-hidden />
            {count ? (
              <span key={count} aria-hidden className={cx('tabular absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-vermilion px-1 text-[11px] font-bold text-paper ring-2 ring-paper', bump > 0 && 'animate-count-pop')}>
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
      {menuLoaded && (
        <Suspense fallback={null}>
          <MobileMenu open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
      {searchLoaded && (
        <Suspense fallback={null}>
          <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
      {bagLoaded && (
        <Suspense fallback={null}>
          <BagDrawer open={bagOpen} onClose={() => setBagOpen(false)} />
        </Suspense>
      )}
    </header>
  );
}
