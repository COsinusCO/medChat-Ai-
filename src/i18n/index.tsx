/**
 * Tiny i18n: the four locales the backend stores on the user, `{{placeholder}}` interpolation,
 * and nothing else. The language follows `user.lang` (as in the Mini App), falling back to the
 * device locale, then Uzbek.
 */
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getLocales } from 'expo-localization';

import {
  LANGUAGES,
  translations,
  type Language,
  type TranslationKey,
} from '@/i18n/translations';
import { setIdentity } from '@/services/identity-store';

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type I18nValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translate;
};

const I18nContext = createContext<I18nValue | null>(null);

export function normalizeLanguage(value?: string | null): Language | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (normalized.includes('cyrl')) return 'cyrl';
  if (normalized.startsWith('ru')) return 'ru';
  if (normalized.startsWith('uz')) return 'uz';
  if (normalized.startsWith('en')) return 'en';
  return null;
}

function detectLanguage(): Language {
  for (const locale of getLocales()) {
    const detected = normalizeLanguage(locale.languageTag) ?? normalizeLanguage(locale.languageCode);
    if (detected) return detected;
  }
  return 'uz';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectLanguage);

  const setLanguage = useCallback((next: Language) => {
    if (LANGUAGES.includes(next)) setLanguageState(next);
  }, []);

  // The gateway wants the active language on the `lang` header of every request.
  useEffect(() => {
    setIdentity({ lang: language });
  }, [language]);

  const t = useCallback<Translate>(
    (key, vars) => {
      const template = translations[language][key] ?? translations.en[key] ?? key;
      if (!vars) return template;

      return Object.entries(vars).reduce(
        (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
        template
      );
    },
    [language]
  );

  const value = useMemo<I18nValue>(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n() {
  const value = use(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}

/** Shorthand for components that only need the translate function. */
export function useTranslate() {
  return useI18n().t;
}
