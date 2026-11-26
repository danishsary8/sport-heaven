import { LANGS, useI18n } from '../../lib/i18n';
import { cx } from '../../ui';

/** EN / ខ្មែរ toggle. Each option is labelled in its own language; the visible label is the accessible name. */
export function LangSwitch({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t('lang.label')} className={cx('inline-flex rounded-full border p-0.5', tone === 'dark' ? 'border-paper/30' : 'border-[#C9C5BB]', className)}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={cx(
            'rounded-full px-3 py-1 text-sm font-semibold',
            lang === l ? (tone === 'dark' ? 'bg-paper text-obsidian' : 'bg-obsidian text-paper') : tone === 'dark' ? 'text-paper' : 'text-obsidian',
          )}
        >
          {l === 'en' ? 'EN' : t('lang.km')}
        </button>
      ))}
    </div>
  );
}
