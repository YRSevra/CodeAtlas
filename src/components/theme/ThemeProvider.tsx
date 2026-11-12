"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemePreference = "dark" | "light" | "system";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedScheme: "dark" | "light";
  setPreference: (next: ThemePreference) => void;
  toggleQuickTheme: () => void;
}

const STORAGE_KEY = "codeatlas-color-scheme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyMetaColorScheme(preference: ThemePreference): void {
  if (typeof document === "undefined") return;
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (!meta) return;
  if (preference === "system") {
    meta.setAttribute("content", "light dark");
  } else {
    meta.setAttribute("content", preference);
  }
}

function getSystemScheme(): "dark" | "light" {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");
  const [systemScheme, setSystemScheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setSystemScheme(getSystemScheme());
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreferenceState(stored);
        applyMetaColorScheme(stored);
      } else {
        setPreferenceState("dark");
        applyMetaColorScheme("dark");
      }
    } catch {
      applyMetaColorScheme("dark");
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = (event: MediaQueryListEvent) => {
      setSystemScheme(event.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleMediaChange);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        const next =
          event.newValue === "light" || event.newValue === "dark" || event.newValue === "system"
            ? event.newValue
            : "dark";
        setPreferenceState(next);
        applyMetaColorScheme(next);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    applyMetaColorScheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const resolvedScheme = preference === "system" ? systemScheme : preference;

  const toggleQuickTheme = useCallback(() => {
    const next: ThemePreference = resolvedScheme === "dark" ? "light" : "dark";
    setPreference(next);
  }, [resolvedScheme, setPreference]);

  return (
    <ThemeContext.Provider
      value={{
        preference,
        resolvedScheme,
        setPreference,
        toggleQuickTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
