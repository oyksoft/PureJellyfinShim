import { commands } from '@bindings';
import type { AppConfig } from '@bindings';
import { Effect } from 'effect';
import { createContext, createSignal, useContext } from 'solid-js';

import { runTauriCommandRaw } from '../effects/commands';
import { en } from './en';
import { zh } from './zh';

export type Locale = 'en' | 'zh';
export type SupportedLocale = 'auto' | Locale;
export type Translations = typeof en;

const translations: Record<Locale, Translations> = { en, zh };

export { en, zh };

function detectSystemLocale(): Locale {
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('zh')) return 'zh';
  return 'en';
}

function storageToLocale(s: string | null): SupportedLocale {
  if (s === 'auto' || s === 'en' || s === 'zh') return s;
  return 'auto';
}

function resolveLocale(supported: SupportedLocale): Locale {
  return supported === 'auto' ? detectSystemLocale() : supported;
}

interface I18nContextValue {
  /** Translations for the current locale. Reactive — must call as t(). */
  t: () => Translations;
  locale: () => Locale;
  setLocale: (locale: SupportedLocale) => void;
  supportedLocale: () => SupportedLocale;
}

const I18nContext = createContext<I18nContextValue>();

export function I18nProvider(props: { children: any }) {
  const stored = storageToLocale(localStorage.getItem('locale'));
  const [locale, setLocaleSignal] = createSignal<Locale>(resolveLocale(stored));
  const [supportedLocale, setSupportedLocale] = createSignal<SupportedLocale>(stored);

  const setLocale = (newLocale: SupportedLocale) => {
    localStorage.setItem('locale', newLocale);
    const actual = resolveLocale(newLocale);
    setSupportedLocale(newLocale);
    setLocaleSignal(actual);

    runTauriCommandRaw(() => commands.configGet())
      .pipe(
        Effect.flatMap((current) => {
          const localeBackend: AppConfig['locale'] =
            newLocale === 'auto' ? 'auto' : newLocale === 'zh' ? 'zh' : 'en';
          const updated: AppConfig = { ...current, locale: localeBackend };
          return runTauriCommandRaw(() => commands.configSet(updated));
        }),
        Effect.flatMap(() => runTauriCommandRaw(() => commands.rebuildTray())),
        Effect.runPromise,
      )
      .catch((error) => {
        console.error('[i18n] Failed to persist locale:', error);
      });
  };

  const value: I18nContextValue = {
    t: () => translations[locale()],
    locale,
    setLocale,
    supportedLocale,
  };

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
