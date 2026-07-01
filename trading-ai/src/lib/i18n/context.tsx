"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  getDir,
  translations,
  type Locale,
  type TranslationKeys,
} from "./translations";

const STORAGE_KEY = "husai-trading-locale";

type I18nContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: TranslationKeys;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "ar" || stored === "en") setLocaleState(stored);
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    document.documentElement.dir = getDir(next);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = getDir(locale);
  }, [locale, ready]);

  const value = useMemo(
    () => ({
      locale,
      dir: getDir(locale),
      t: translations[locale],
      setLocale,
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useRecommendationLabel(rec: string) {
  const { t } = useI18n();
  if (rec === "buy") return t.recommendation.buy;
  if (rec === "sell") return t.recommendation.sell;
  return t.recommendation.hold;
}

export function useRiskLabel(level: string) {
  const { t } = useI18n();
  const key = level as keyof typeof t.riskLevel;
  return t.riskLevel[key] ?? level;
}

export function useAssetClassLabel(assetClass: string) {
  const { t } = useI18n();
  const key = assetClass as keyof typeof t.assetClass;
  return t.assetClass[key] ?? assetClass;
}
