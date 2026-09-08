/**
 * The 12 languages used across the Bible Games Project. Only English ships
 * with real content in this first version; the rest are listed so the
 * language picker's structure and layout are already correct, and future
 * translations only need a new `strings.<code>.ts` file plus flipping
 * `available` to true here.
 */

export interface LanguageDefinition {
  code: string;
  /** Name written in the language itself, so it stays readable to its speakers. */
  nativeName: string;
  available: boolean;
}

export const LANGUAGES: LanguageDefinition[] = [
  { code: "en", nativeName: "English", available: true },
  { code: "es", nativeName: "Español", available: false },
  { code: "pt", nativeName: "Português", available: false },
  { code: "fr", nativeName: "Français", available: false },
  { code: "de", nativeName: "Deutsch", available: false },
  { code: "it", nativeName: "Italiano", available: false },
  { code: "nl", nativeName: "Nederlands", available: false },
  { code: "ru", nativeName: "Русский", available: false },
  { code: "pl", nativeName: "Polski", available: false },
  { code: "id", nativeName: "Bahasa Indonesia", available: false },
  { code: "hi", nativeName: "हिन्दी", available: false },
  { code: "zh", nativeName: "中文", available: false },
];

export const DEFAULT_LANGUAGE = "en";
