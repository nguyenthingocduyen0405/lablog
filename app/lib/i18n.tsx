'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { messages } from './i18n-messages';

export type Locale = 'ko' | 'vi' | 'en';
export type TranslationKey = keyof typeof messages.ko;
export type LocalizedText = { ko: string; vi: string; en: string };
type Value = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  l: (ko: string, vi: string, en: string) => string;
};
const Context = createContext<Value | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ko');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem('lablog-locale');
      const browser = navigator.languages?.[0] ?? navigator.language;
      setLocaleState(saved === 'ko' || saved === 'vi' || saved === 'en' ? saved : browser.startsWith('vi') ? 'vi' : browser.startsWith('en') ? 'en' : 'ko');
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const value = useMemo<Value>(() => ({
    locale,
    setLocale(next) { localStorage.setItem('lablog-locale', next); setLocaleState(next); },
    t(key) { return messages[locale][key]; },
    l(ko, vi, en) { return locale === 'ko' ? ko : locale === 'vi' ? vi : en; },
  }), [locale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n() {
  const value = useContext(Context);
  if (!value) throw new Error('useI18n must be used inside LanguageProvider');
  return value;
}

export function Localized({ ko, vi, en }: LocalizedText) {
  const { locale } = useI18n();
  return locale === 'ko' ? ko : locale === 'vi' ? vi : en;
}
