"use client";

import { useEffect, useState } from "react";
import type { ScenarioResult } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";

export function ScenariosClient() {
  const { t, locale } = useI18n();
  const [scenarios, setScenarios] = useState<ScenarioResult[]>([]);

  useEffect(() => {
    fetch("/api/intelligence/platform?type=scenarios")
      .then((r) => r.json())
      .then((d) => setScenarios(d.scenarios ?? []));
  }, []);

  if (!scenarios.length) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2 text-start">
      {scenarios.map((s) => (
        <article key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">{locale === "ar" ? s.questionAr : s.questionEn}</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {s.impacts.map((imp, i) => (
              <li key={i} className="flex justify-between">
                <span>{locale === "ar" ? imp.marketAr : imp.marketEn}</span>
                <span className={imp.magnitudePct >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {imp.magnitudePct > 0 ? "+" : ""}{imp.magnitudePct}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-zinc-500">{locale === "ar" ? s.summaryAr : s.summaryEn}</p>
        </article>
      ))}
    </div>
  );
}
