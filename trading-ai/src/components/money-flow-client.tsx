"use client";

import { useEffect, useState } from "react";
import type { SmartMoneyFlowMap } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";

export function MoneyFlowClient() {
  const { t, locale } = useI18n();
  const [flow, setFlow] = useState<SmartMoneyFlowMap | null>(null);

  useEffect(() => {
    fetch("/api/intelligence/platform?type=smart-money")
      .then((r) => r.json())
      .then(setFlow);
  }, []);

  if (!flow) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <p className="text-sm text-zinc-500">{flow.period}</p>
      <div className="grid gap-3 sm:grid-cols-4">
        {flow.nodes.map((n) => (
          <div key={n.asset} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="font-medium">{locale === "ar" ? n.assetAr : n.asset}</p>
            <p className={`mt-2 text-2xl font-semibold ${n.direction === "in" ? "text-emerald-400" : n.direction === "out" ? "text-red-400" : "text-zinc-400"}`}>
              {n.flowPct > 0 ? "+" : ""}{n.flowPct}%
            </p>
          </div>
        ))}
      </div>
      <p className="text-sm text-zinc-400">{locale === "ar" ? flow.summaryAr : flow.summaryEn}</p>
    </div>
  );
}
