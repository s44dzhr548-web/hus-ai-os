"use client";

import { useEffect, useState } from "react";
import type { RiskGuardianState } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { StatCard, Badge } from "./trading-shell";

export function RiskGuardianClient() {
  const { t } = useI18n();
  const [guardian, setGuardian] = useState<RiskGuardianState | null>(null);

  async function load() {
    const res = await fetch("/api/risk/guardian");
    const data = await res.json();
    setGuardian(data.guardian);
  }

  useEffect(() => {
    load();
  }, []);

  async function emergencyStop(active: boolean) {
    await fetch("/api/risk/guardian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "emergency_stop", active }),
    });
    load();
  }

  if (!guardian) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => emergencyStop(true)} className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300">
          {t.riskGuardian.emergencyStop}
        </button>
        <button type="button" onClick={() => emergencyStop(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">
          {t.riskGuardian.resume}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t.riskGuardian.canTrade} value={guardian.canTrade ? t.riskGuardian.yes : t.riskGuardian.no} />
        <StatCard label={t.riskGuardian.maxRisk} value={`${guardian.maxRiskPerTradePct}%`} />
        <StatCard label={t.riskGuardian.dailyLimit} value={`${guardian.dailyLossLimitPct}%`} />
      </div>
      {guardian.blockedReasons.length > 0 && (
        <section className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <h3 className="font-medium text-red-300">{t.riskGuardian.blocked}</h3>
          <ul className="mt-2 list-disc ps-5 text-sm text-zinc-400">
            {guardian.blockedReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.riskGuardian.allowedMarkets}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {guardian.allowedMarkets.map((m) => (
            <Badge key={m} tone="neutral">{m}</Badge>
          ))}
        </div>
      </section>
    </div>
  );
}
