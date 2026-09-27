// i18next's default export re-exposes its own instance methods as named
// exports too (for module-splitting setups this app doesn't use); calling
// them on the default import, as the library's own docs show, is intentional.
/* eslint-disable import/no-named-as-default-member */
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { getLanguagePreference, setLanguagePreference } from "./languagePreference";
import type { LanguageCode } from "./languages";
import bn from "./resources/bn.json";
import en from "./resources/en.json";
import gu from "./resources/gu.json";
import hi from "./resources/hi.json";
import kn from "./resources/kn.json";
import ml from "./resources/ml.json";
import mr from "./resources/mr.json";
import pa from "./resources/pa.json";
import ta from "./resources/ta.json";
import te from "./resources/te.json";

i18next.use(initReactI18next).init({
  compatibilityJSON: "v4",
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    mr: { translation: mr },
    gu: { translation: gu },
    ta: { translation: ta },
    te: { translation: te },
    kn: { translation: kn },
    bn: { translation: bn },
    ml: { translation: ml },
    pa: { translation: pa },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

/** Call once at startup to restore the advocate's saved app-language choice
 * (only the language setting itself — which languages are offered still
 * comes from their profile). */
export async function restoreLanguagePreference(): Promise<void> {
  const saved = await getLanguagePreference();
  if (saved) await i18next.changeLanguage(saved);
}

export async function changeAppLanguage(code: LanguageCode): Promise<void> {
  await i18next.changeLanguage(code);
  await setLanguagePreference(code);
}

export function currentLanguageCode(): LanguageCode {
  return (i18next.language as LanguageCode) || "en";
}

export default i18next;
