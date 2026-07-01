"use client";

import Link from "next/link";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n/context";

export function HomeClient() {
  const { t, dir } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50" dir={dir}>
      <DisclaimerBanner />
      <div className="absolute end-4 top-16 z-10 sm:end-6 sm:top-20">
        <LanguageSwitcher />
      </div>
      <main className="mx-auto flex max-w-4xl flex-1 flex-col justify-center px-6 py-16 text-start">
        <p className="text-sm uppercase tracking-widest text-emerald-400">{t.brand}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{t.home.title}</h1>
        <p className="mt-4 text-lg leading-8 text-zinc-400">{t.home.subtitle}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
          >
            {t.home.openDashboard}
          </Link>
          <Link
            href="/api/health"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm hover:border-zinc-500"
          >
            {t.home.healthCheck}
          </Link>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {t.home.features.map((f) => (
            <p key={f} className="text-sm text-zinc-500">
              ✓ {f}
            </p>
          ))}
        </div>
      </main>
    </div>
  );
}
