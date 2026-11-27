import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type Dict, type DictKey } from './dict.en';
import type { Lang } from './types';

const STORAGE_KEY = 'sc.lang';

/**
 * Khmer copy is loaded on demand: English readers never download it (it is a large share of the first
 * page's JavaScript). main.tsx loads it before the first render when Khmer is the saved choice, so
 * Khmer readers don't see English first.
 */
let kmDict: Dict | null = null;
let kmLoading: Promise<Dict> | null = null;

export function loadLang(lang: Lang): Promise<void> {
  if (lang !== 'km' || kmDict) return Promise.resolve();
  kmLoading ??= import('./dict.km').then((m) => (kmDict = m.km));
  return kmLoading.then(() => undefined);
}

/** The saved language, if any (shared with main.tsx). */
export function storedLang(): Lang | null {
  return readStored();
}

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
  // Re-render once the Khmer copy arrives (when switching to Khmer for the first time).
  const [, setLoaded] = useState(0);
  useEffect(() => {
    if (lang === 'km' && !kmDict) void loadLang('km').then(() => setLoaded((n) => n + 1));
  }, [lang]);

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
    // Until the Khmer copy has loaded, English stands in (only on the very first switch to Khmer).
    () => ({ lang, setLang, t: (key, vars) => interpolate((lang === 'km' && kmDict ? kmDict[key] : undefined) ?? en[key], vars) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kmDict is module state; setLoaded re-renders when it changes
    [lang, setLang, kmDict],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
