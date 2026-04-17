"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

type ThemeContextValue = {
  theme: Theme;
  themePreference: ThemePreference;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  setThemePreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "harmohome_theme";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function detectSystemTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function detectInitialThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemePreference(stored)) {
    return stored;
  }

  return "system";
}

function applyTheme(resolvedTheme: Theme, preference: ThemePreference) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [systemTheme, setSystemTheme] = useState<Theme>("light");
  const resolvedTheme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    const nextSystemTheme = detectSystemTheme();
    const nextThemePreference = detectInitialThemePreference();
    setSystemTheme(nextSystemTheme);
    setThemePreferenceState(nextThemePreference);
    applyTheme(nextThemePreference === "system" ? nextSystemTheme : nextThemePreference, nextThemePreference);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    applyTheme(resolvedTheme, themePreference);
  }, [resolvedTheme, themePreference]);

  const setThemePreference = useCallback((nextThemePreference: ThemePreference) => {
    setThemePreferenceState(nextThemePreference);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextThemePreference);
    }
    applyTheme(nextThemePreference === "system" ? systemTheme : nextThemePreference, nextThemePreference);
  }, [systemTheme]);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemePreference(nextTheme);
  }, [setThemePreference]);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      theme: resolvedTheme,
      themePreference,
      isDark: resolvedTheme === "dark",
      setTheme,
      setThemePreference,
      toggleTheme: () => setThemePreference(resolvedTheme === "dark" ? "light" : "dark"),
    };
  }, [resolvedTheme, setTheme, setThemePreference, themePreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
