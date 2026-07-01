"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

export function RiskClient() {
  const { t } = useI18n();
  const [data, setData] = useState<{
    rules: { rule: string; value: string; description: string }[];
    assessment: {
      symbol: string;
      stopLoss: number;
      takeProfit: number;
      positionSize: number;
      withinLimits: boolean;
      violations: string[];
    };
  } | null>(null);

  useEffect(() => {
    fetch("/api/risk?symbol=AAPL&equity=100000")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-200">
        {t.risk.banner}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {data.rules.map((r) => (
          <div key={r.rule} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{r.rule}</span>
              <span className="text-emerald-400">{r.value}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{r.description}</p>
          </div>
        ))}
      </div>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">
          {t.risk.sampleAssessment} — {data.assessment.symbol}
        </h3>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <p>
            {t.risk.positionSize}: {data.assessment.positionSize} {t.risk.shares}
          </p>
          <p>
            {t.risk.stopLoss}: ${data.assessment.stopLoss}
          </p>
          <p>
            {t.risk.takeProfit}: ${data.assessment.takeProfit}
          </p>
        </div>
        <p className={`mt-3 text-sm ${data.assessment.withinLimits ? "text-emerald-400" : "text-red-400"}`}>
          {data.assessment.withinLimits ? t.risk.withinLimits : data.assessment.violations.join("; ")}
        </p>
      </section>
    </div>
  );
}
