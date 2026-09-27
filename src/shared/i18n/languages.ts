export type LanguageCode = "en" | "hi" | "mr" | "gu" | "ta" | "te" | "kn" | "bn" | "ml" | "pa";

/** The languages the app has translations for. Also doubles as the
 * suggestion list an advocate picks from when listing the languages they
 * speak on their profile (features/profile/ProfileEditForm.tsx) — the
 * in-app Language setting only ever offers languages from that list that
 * also appear on the signed-in advocate's own profile. */
export const SUPPORTED_LANGUAGES: { code: LanguageCode; name: string }[] = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "bn", name: "Bengali" },
  { code: "ml", name: "Malayalam" },
  { code: "pa", name: "Punjabi" },
];

export function codeForLanguageName(name: string): LanguageCode | null {
  const needle = name.trim().toLowerCase();
  return SUPPORTED_LANGUAGES.find((l) => l.name.toLowerCase() === needle)?.code ?? null;
}

export function nameForLanguageCode(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.name ?? "English";
}
