import fr from "@/messages/fr.json";
import en from "@/messages/en.json";

export const dictionaries = {
  fr,
  en,
} as const;

export type Locale = keyof typeof dictionaries;

export function isLocale(value: string): value is Locale {
  return value === "fr" || value === "en";
}
