import React, { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { GOOGLE_LANGUAGES, Language } from '../utils/googleLanguages';
import { getLanguageCode, getLastError, getVersion, initLanguage, isBusy, isTranslationConfigured, setLanguageCode, subscribe } from '../i18n/translator';

export const LANGUAGES = GOOGLE_LANGUAGES;
export const DEFAULT_LANGUAGE = LANGUAGES[0];

type Ctx = {
  language: Language;
  languages: Language[];
  /** false until the saved language has been restored at app start */
  ready: boolean;
  /** true while new strings are still being translated */
  translating: boolean;
  /** always true - translation works without a key (an optional EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY switches to the official API) */
  configured: boolean;
  error: string | null;
  setLanguage: (l: Language) => Promise<void>;
};

const LanguageContext = createContext<Ctx>({} as Ctx);
export const useLanguage = () => useContext(LanguageContext);

/** Mobile counterpart of the web LanguageContext (same `language` / `setLanguage` / `LANGUAGES` shape). */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useSyncExternalStore(subscribe, getVersion);

  useEffect(() => { initLanguage().finally(() => setReady(true)); }, []);

  const setLanguage = useCallback(async (l: Language) => { await setLanguageCode(l.code); }, []);

  const code = getLanguageCode();
  const language = LANGUAGES.find((l) => l.code === code) ?? DEFAULT_LANGUAGE;

  return (
    <LanguageContext.Provider value={{ language, languages: LANGUAGES, ready, translating: isBusy(), configured: isTranslationConfigured(), error: getLastError(), setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}