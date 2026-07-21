'use client';

import { useI18n, type Locale } from '../lib/i18n';

const options: Array<{ locale: Locale; label: string }> = [
  { locale: 'ko', label: '한국어' },
  { locale: 'vi', label: 'Tiếng Việt' },
  { locale: 'en', label: 'English' },
];

export default function LanguageSwitcher({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const shell = dark ? 'bg-white/10 ring-white/10' : 'bg-white shadow-sm ring-black/[.06]';
  return (
    <div role='group' aria-label={t('language')} className={'inline-flex items-center rounded-full p-1 ring-1 ' + shell}>
      {options.map((option) => {
        const active = locale === option.locale;
        const state = active ? 'bg-[#ffd84d] text-stone-950 shadow-sm' : dark ? 'text-white/45 hover:text-white' : 'text-stone-400 hover:text-stone-900';
        return <button key={option.locale} type='button' onClick={() => setLocale(option.locale)} aria-pressed={active} className={'rounded-full px-2.5 py-1.5 text-[10px] font-black transition ' + state}>{compact ? option.locale.toUpperCase() : option.label}</button>;
      })}
    </div>
  );
}
