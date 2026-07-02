"use client";

import { useEffect, useState } from "react";
import type { ArabicMarketBrief } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";

export function ArabicIntelClient() {
  const { t, locale } = useI18n();
  const [brief, setBrief] = useState<ArabicMarketBrief | null>(null);

  useEffect(() => {
    fetch("/api/intelligence/modules")
      .then((r) => r.json())
      .then((d) => setBrief(d.arabicBrief));
  }, []);

  if (!brief) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start" dir={locale === "ar" ? "rtl" : "ltr"}>
      <h2 className="text-xl font-semibold">{locale === "ar" ? brief.headlineAr : brief.headlineEn}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {brief.focusAreas.map((area) => (
          <article key={area.titleEn} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="font-medium">{locale === "ar" ? area.titleAr : area.titleEn}</h3>
            <p className="mt-2 text-sm text-zinc-400">{locale === "ar" ? area.detailAr : area.detailEn}</p>
          </article>
        ))}
      </div>
      <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <h3 className="font-medium">{t.arabicIntel.saudiFocus}</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {brief.saudiHighlights.map((s) => (
            <li key={s.symbol}>
              <span className="font-medium">{s.symbol}</span> — {locale === "ar" ? s.noteAr : s.noteEn}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
