import { en, type StringKey } from "./strings.en";
import { DEFAULT_LANGUAGE, LANGUAGES } from "../data/languages";

/**
 * Table of every registered language's strings. Only "en" is populated for
 * this first version; a future translation is added by importing its
 * strings.<code>.ts file and adding one line here — no other code changes.
 */
const TABLES: Partial<Record<string, Record<string, string>>> = {
  en,
};

type Listener = (language: string) => void;

let currentLanguage = DEFAULT_LANGUAGE;
const listeners = new Set<Listener>();

export function setLanguage(code: string): void {
  const def = LANGUAGES.find((l) => l.code === code);
  if (!def || !def.available) {
    return;
  }
  currentLanguage = code;
  listeners.forEach((fn) => fn(currentLanguage));
}

export function getLanguage(): string {
  return currentLanguage;
}

export function onLanguageChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key: StringKey): string {
  const table = TABLES[currentLanguage] ?? en;
  return table[key] ?? en[key] ?? key;
}
