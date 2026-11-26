import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useI18n } from '../../../lib/i18n';
import { Picture, Price, Sheet } from '../../../ui';
import { useMenu, useSuggest } from '../api';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** The header's search: quick suggestions as you type (250 ms, 2+ characters), Enter for all results. */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose(): void }) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} side="top" title={t('search.title')} hideTitle>
      {open && <SearchBody onClose={onClose} />}
    </Sheet>
  );
}

function SearchBody({ onClose }: { onClose(): void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const menu = useMenu();
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), 250);
  const suggest = useSuggest(q);
  const showSuggest = q.length >= 2 && text.trim().length >= 2;
  const data = suggest.data;
  const link = 'block rounded-[6px] px-2 py-2 hover:bg-stone';

  return (
    <div className="mx-auto max-w-[760px] pt-2" onClick={(e) => (e.target as HTMLElement).closest('a') && onClose()}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const value = text.trim();
          if (!value) return;
          onClose();
          void navigate(`/search?q=${encodeURIComponent(value)}`);
        }}
        className="flex items-center gap-2 pr-10"
      >
        <label className="relative flex-1">
          <span className="sr-only">{t('search.label')}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-graphite" aria-hidden />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('search.placeholder')}
            maxLength={100}
            enterKeyHint="search"
            data-autofocus
            className="h-12 w-full rounded-[8px] border border-obsidian bg-paper pl-10 pr-3 text-[16px]"
          />
        </label>
        <button type="submit" className="sr-only">
          {t('search.submit')}
        </button>
      </form>

      <div className="mt-5 pb-2">
        {!showSuggest ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-graphite">{t('search.popular')}</h3>
            <ul className="flex flex-wrap gap-2">
              {[...(menu.data?.categories ?? []).map((c) => ({ href: `/c/${c.slug}`, name: c.name })), ...(menu.data?.brands ?? []).slice(0, 6).map((b) => ({ href: `/brands/${b.slug}`, name: b.name }))].map((l) => (
                <li key={l.href}>
                  <Link to={l.href} className="inline-flex h-10 items-center rounded-full bg-stone px-4 text-[15px] font-medium hover:bg-[#DDD9CF]">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : suggest.isError && !data ? (
          <p role="status" className="text-graphite">{t('search.suggestError')}</p>
        ) : !data ? (
          <p role="status" className="text-graphite">{t('common.loading')}</p>
        ) : data ? (
          <div className="grid gap-5 sm:grid-cols-[1fr_200px]" aria-live="polite">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-graphite">{t('search.products')}</h3>
              {data.products.length === 0 ? (
                <p className="py-2 text-graphite">{t('search.noSuggestions')}</p>
              ) : (
                <ul>
                  {data.products.map((p) => (
                    <li key={p.slug}>
                      <Link to={`/p/${p.slug}`} className={`${link} flex items-center gap-3`}>
                        <Picture src={p.imageUrl} alt="" sizes="48px" width={48} height={64} className="block h-16 w-12 shrink-0 overflow-hidden rounded bg-stone" />
                        <span className="flex-1 text-[15px] font-medium leading-snug">{p.name}</span>
                        <Price cents={p.priceCents} size="sm" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {(data.brands.length > 0 || data.categories.length > 0) && (
              <div className="flex flex-col gap-4">
                {data.categories.length > 0 && (
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-graphite">{t('search.categories')}</h3>
                    <ul>
                      {data.categories.map((c) => (
                        <li key={c.slug}>
                          <Link to={`/c/${c.slug}`} className={link}>
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.brands.length > 0 && (
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-graphite">{t('search.brands')}</h3>
                    <ul>
                      {data.brands.map((b) => (
                        <li key={b.slug}>
                          <Link to={`/brands/${b.slug}`} className={link}>
                            {b.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <Link to={`/search?q=${encodeURIComponent(q)}`} className="font-semibold underline underline-offset-4 sm:col-span-2">
              {t('search.seeAll', { q })}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
