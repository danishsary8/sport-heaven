import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type DictKey } from './dict.en';
import { km } from './dict.km';
import type { Lang } from './types';

const STORAGE_KEY = 'sc.lang';
const DICTS = { en, km } as const;

interface I18nValue {
  lang: Lang;
  setLang(l: Lang): void;
  t(key: DictKey, vars?: Record<string, string | number>): string;
}

const I18nContext = createContext<I18nValue | null>(null);

function readStored(): Lang | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'en' || v === 'km' ? v : null;
  } catch {
    return null;
  }
}

export function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function I18nProvider({ children, initial }: { children: ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(() => initial ?? readStored() ?? 'en');

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // private mode: the choice lasts for this visit only
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: (key, vars) => interpolate(DICTS[lang][key] ?? en[key], vars) }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
