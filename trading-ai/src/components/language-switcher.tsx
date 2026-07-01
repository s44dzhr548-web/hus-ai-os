"use client";

import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className={`flex rounded-lg border border-zinc-700 bg-zinc-900 p-0.5 ${className}`}>
      {(["ar", "en"] as Locale[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLocale(lang)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            locale === lang
              ? "bg-emerald-500 text-zinc-950"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          aria-pressed={locale === lang}
        >
          {t.language[lang]}
        </button>
      ))}
    </div>
  );
}
