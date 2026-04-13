"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { dictionaries, isLocale, type Locale } from "@/lib/i18n/dictionaries";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const LOCALE_STORAGE_KEY = "harmohome_locale";

function getNestedValue(obj: unknown, path: string): string | null {
  const segments = path.split(".");
  let current: any = obj;
  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return null;
    }
    current = current[segment];
  }
  return typeof current === "string" ? current : null;
}

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "fr";

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && isLocale(stored)) return stored;

  const browserLang = (window.navigator.language || "fr").toLowerCase();
  if (browserLang.startsWith("fr")) return "fr";
  if (browserLang.startsWith("en")) return "en";
  return "fr";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    setLocaleState(detectInitialLocale());
  }, []);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
      document.documentElement.lang = nextLocale;
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale,
      t: (key: string) => {
        const dict = dictionaries[locale];
        const fallbackDict = dictionaries.fr;
        return (
          getNestedValue(dict, key) ||
          getNestedValue(fallbackDict, key) ||
          key
        );
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
