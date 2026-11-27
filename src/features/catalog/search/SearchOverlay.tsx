import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, CornerDownLeft, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { apiFetch } from '../../../lib/api';
import { useI18n } from '../../../lib/i18n';
import { Picture, Price, Sheet, cx } from '../../../ui';
import { useMenu, useSuggest, type ProductList } from '../api';
import { CATEGORY_IMAGES } from '../categoryImages';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

const RECENT_KEY = 'sh:recent-searches';
const readRecent = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
};
const saveRecent = (q: string) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 5)));
  } catch {
    /* private mode: recent searches are a nicety */
  }
};

/** The matched part of a name in bold, so you see why each result is there. */
function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-bold text-obsidian underline decoration-brass decoration-2 underline-offset-[3px]">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * The header's search. Results update as you type: a letter narrows the categories and brands at once,
 * two letters bring products (150 ms after you stop). Arrow keys move through results; Enter opens all results.
 */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose(): void }) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} side="top" title={t('search.title')} hideTitle>
      <SearchBody onClose={onClose} />
    </Sheet>
  );
}

function SearchBody({ onClose }: { onClose(): void }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const menu = useMenu();
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [recent, setRecent] = useState(readRecent);
  const typed = text.trim();
  const q = useDebounced(typed, 150);
  const suggest = useSuggest(q);
  const showSuggest = q.length >= 2 && typed.length >= 2;
  const data = suggest.data;
  const stale = suggest.isFetching && (suggest.isPlaceholderData || q !== typed);

  const trending = useQuery({
    queryKey: ['catalog', 'products', 'trending', lang],
    queryFn: ({ signal }) => apiFetch<ProductList>('/v1/catalog/products', { query: { pageSize: 4 }, withLang: true, signal }),
    staleTime: 5 * 60_000,
  });

  const categories = menu.data?.categories ?? [];
  const brands = menu.data?.brands ?? [];
  // One letter is too little to ask the API, but enough to narrow the shop's own categories and brands.
  const quick = useMemo(() => {
    if (!typed) return [];
    const needle = typed.toLowerCase();
    return [...categories.map((c) => ({ href: `/c/${c.slug}`, name: c.name })), ...brands.map((b) => ({ href: `/brands/${b.slug}`, name: b.name }))].filter((l) =>
      l.name.toLowerCase().split(/[\s/&-]+/).some((w) => w.startsWith(needle)) || l.name.toLowerCase().startsWith(needle),
    );
  }, [typed, categories, brands]);

  const go = (value: string) => {
    const v = value.trim();
    if (!v) return;
    saveRecent(v);
    onClose();
    void navigate(`/search?q=${encodeURIComponent(v)}`);
  };

  /** Up and down move between the search box and every result, like a list. */
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [input.current, ...(results.current?.querySelectorAll<HTMLElement>('[data-result]') ?? [])].filter(Boolean) as HTMLElement[];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? Math.min(at + 1, items.length - 1) : Math.max(at - 1, 0);
    if (next === at) return;
    e.preventDefault();
    items[next]?.focus();
  };

  const row = 'rounded-[10px] outline-none transition-colors hover:bg-stone focus-visible:bg-stone focus-visible:outline-2 focus-visible:outline-obsidian';
  const chip =
    'inline-flex h-10 items-center gap-2 rounded-full border border-[#DEDAD0] bg-paper px-4 text-[15px] font-medium outline-none transition-colors hover:border-obsidian focus-visible:border-obsidian focus-visible:outline-2 focus-visible:outline-obsidian';

  return (
    <div className="mx-auto max-w-[980px] pt-3" onKeyDown={onKeyDown} onClick={(e) => {
        if (!(e.target as HTMLElement).closest('a')) return;
        if (typed.length >= 2) saveRecent(typed);
        onClose();
      }}
    >
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(text);
        }}
        className="pr-11"
      >
        <label className="group relative flex items-center">
          <span className="sr-only">{t('search.label')}</span>
          <Search className="pointer-events-none absolute left-4 size-[22px] text-graphite transition-colors group-focus-within:text-obsidian" aria-hidden />
          <input
            ref={input}
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('search.placeholder')}
            maxLength={100}
            enterKeyHint="search"
            autoComplete="off"
            data-autofocus
            className="h-14 w-full rounded-[12px] border border-[#D6D2C8] bg-chalk pl-12 pr-28 text-[17px] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-graphite/70 focus:border-obsidian focus:bg-paper focus:shadow-[0_0_0_4px_rgb(14_17_19/0.07)]"
          />
          <span className="absolute right-2 flex items-center gap-1">
            {suggest.isFetching && showSuggest && <span aria-hidden className="mr-1 size-4 animate-spin rounded-full border-2 border-graphite/40 border-r-transparent" />}
            {text && (
              <button
                type="button"
                onClick={() => {
                  setText('');
                  input.current?.focus();
                }}
                aria-label={t('search.clear')}
                className="grid size-9 place-items-center rounded-full text-graphite hover:bg-stone hover:text-obsidian"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
            <button type="submit" aria-label={t('search.submit')} className="hidden h-9 items-center gap-1.5 rounded-[8px] bg-obsidian px-3 text-sm font-semibold text-paper sm:inline-flex">
              <CornerDownLeft className="size-3.5" aria-hidden />
              {t('search.submit')}
            </button>
          </span>
        </label>
      </form>

      <div ref={results} className="mt-6 pb-3">
        {!typed ? (
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="flex flex-col gap-7">
              {recent.length > 0 && (
                <section>
                  <div className="mb-2.5 flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold text-graphite">{t('search.recent')}</h3>
                    <button
                      type="button"
                      className="text-sm text-graphite underline-offset-4 hover:text-obsidian hover:underline"
                      onClick={() => {
                        localStorage.removeItem(RECENT_KEY);
                        setRecent([]);
                      }}
                    >
                      {t('search.clearRecent')}
                    </button>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <li key={r}>
                        <button type="button" data-result onClick={() => go(r)} className={chip}>
                          <Clock className="size-3.5 text-graphite" aria-hidden />
                          {r}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section>
                <h3 className="mb-2.5 text-sm font-semibold text-graphite">{t('search.popular')}</h3>
                <ul className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <li key={c.slug}>
                      <Link to={`/c/${c.slug}`} data-result className={cx(chip, 'pl-1.5')}>
                        {CATEGORY_IMAGES[c.slug] ? (
                          <Picture src={CATEGORY_IMAGES[c.slug]} alt="" sizes="28px" width={28} height={28} className="stage block size-7 overflow-hidden rounded-full" />
                        ) : (
                          <span aria-hidden className="size-7 rounded-full bg-stone" />
                        )}
                        {c.name}
                      </Link>
                    </li>
                  ))}
                  {brands.slice(0, 6).map((b) => (
                    <li key={b.slug}>
                      <Link to={`/brands/${b.slug}`} data-result className={chip}>
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            {trending.data && trending.data.products.length > 0 && (
              <section>
                <h3 className="mb-2.5 text-sm font-semibold text-graphite">{t('search.trending')}</h3>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
                  {trending.data.products.slice(0, 4).map((p, i) => (
                    <li key={p.id} className="animate-result" style={{ ['--i' as string]: i }}>
                      <Link to={`/p/${p.slug}`} data-result className={cx('group flex flex-col p-1', row)}>
                        <Picture src={p.imageUrl} alt="" sizes="160px" width={240} height={320} className="stage block aspect-[3/4] overflow-hidden rounded-[8px]" imgClassName="transition-transform duration-500 group-hover:scale-[1.04]" />
                        <span className="mt-2 line-clamp-2 text-[13px] font-medium leading-snug">{p.name}</span>
                        <Price cents={p.priceCents} compareAtCents={p.compareAtCents} size="sm" className="mt-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : !showSuggest ? (
          <div className="flex flex-col gap-4">
            {quick.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {quick.map((l) => (
                  <li key={l.href} className="animate-result">
                    <Link to={l.href} data-result className={chip}>
                      <Highlight text={l.name} q={typed} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[15px] text-graphite">{t('search.keepTyping')}</p>
          </div>
        ) : suggest.isError && !data ? (
          <p role="status" className="text-graphite">
            {t('search.suggestError')}
          </p>
        ) : !data ? (
          <ul aria-hidden className="grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3 p-2">
                <div className="skeleton h-[72px] w-14 shrink-0 rounded-[8px]" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="skeleton h-3.5 w-4/5 rounded" />
                  <div className="skeleton h-3 w-1/4 rounded" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className={cx('grid gap-6 transition-opacity', (data.categories.length > 0 || data.brands.length > 0) && 'md:grid-cols-[minmax(0,1fr)_220px]', stale && 'opacity-60')} aria-live="polite" aria-busy={stale || undefined}>
            <section>
              <h3 className="mb-1.5 text-sm font-semibold text-graphite">{t('search.products')}</h3>
              {data.products.length === 0 ? (
                <p className="rounded-[10px] bg-chalk px-4 py-5 text-[15px] text-graphite">{t('search.noSuggestions')}</p>
              ) : (
                <ul className={cx('grid gap-1 sm:grid-cols-2', !(data.categories.length > 0 || data.brands.length > 0) && 'lg:grid-cols-3')}>
                  {data.products.map((p, i) => (
                    <li key={p.slug} className="animate-result" style={{ ['--i' as string]: i }}>
                      <Link to={`/p/${p.slug}`} data-result className={cx('group flex items-center gap-3 p-2', row)}>
                        <Picture src={p.imageUrl} alt="" sizes="56px" width={56} height={72} className="stage block h-[72px] w-14 shrink-0 overflow-hidden rounded-[8px]" />
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="line-clamp-2 text-[15px] font-medium leading-snug">
                            <Highlight text={p.name} q={q} />
                          </span>
                          <Price cents={p.priceCents} size="sm" />
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-graphite opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {(data.categories.length > 0 || data.brands.length > 0) && (
              <div className="flex flex-col gap-5">
                {data.categories.length > 0 && (
                  <section>
                    <h3 className="mb-1.5 text-sm font-semibold text-graphite">{t('search.categories')}</h3>
                    <ul className="flex flex-col">
                      {data.categories.map((c) => (
                        <li key={c.slug}>
                          <Link to={`/c/${c.slug}`} data-result className={cx('block px-2.5 py-2 text-[15px]', row)}>
                            <Highlight text={c.name} q={q} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {data.brands.length > 0 && (
                  <section>
                    <h3 className="mb-1.5 text-sm font-semibold text-graphite">{t('search.brands')}</h3>
                    <ul className="flex flex-col">
                      {data.brands.map((b) => (
                        <li key={b.slug}>
                          <Link to={`/brands/${b.slug}`} data-result className={cx('block px-2.5 py-2 text-[15px]', row)}>
                            <Highlight text={b.name} q={q} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
            <Link
              to={`/search?q=${encodeURIComponent(q)}`}
              data-result
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-obsidian px-5 text-[15px] font-semibold text-paper hover:bg-[#2A2E31] md:col-span-2"
            >
              {t('search.seeAll', { q })}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
