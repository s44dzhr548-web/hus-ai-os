"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { McCard, McMetric } from "@/components/marketing-center/mc-shell";
import { formatCurrency } from "@/lib/utils";

interface SimResult {
  platforms: { labelAr: string; amount: number; expectedCustomers: number }[];
  totalCustomers: number;
  expectedRevenue: number;
  expectedProfit: number;
  expectedRoi: number;
}

export default function SimulationPage() {
  const [budget, setBudget] = useState(500);
  const [result, setResult] = useState<SimResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const res = await fetch("/api/marketing-center/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget }),
    });
    const data = await res.json();
    setResult(data.simulation);
    setBusy(false);
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">محرك المحاكاة</h1>
      <p className="mb-6 text-sm opacity-70">Simulation only — لا تنفيذ إعلانات</p>

      <McCard className="mb-6 max-w-xs">
        <label className="text-xs opacity-60">الميزانية (SAR)</label>
        <input
          type="number"
          className="mt-2 w-full rounded-lg border border-stone-600/30 bg-transparent px-3 py-2 text-xl font-bold"
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
        />
        <Button className="mt-4 w-full" onClick={run} disabled={busy}>
          {busy ? "..." : "تشغيل المحاكاة AI"}
        </Button>
      </McCard>

      {result && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {result.platforms.map((p) => (
              <McCard key={p.labelAr}>
                <p className="font-semibold text-amber-400">{p.labelAr}</p>
                <p className="text-sm opacity-60">{formatCurrency(p.amount)}</p>
                <p className="mt-2 text-lg font-bold">{p.expectedCustomers} عميل</p>
              </McCard>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <McMetric label="إيراد متوقع" value={formatCurrency(result.expectedRevenue)} accent />
            <McMetric label="ربح متوقع" value={formatCurrency(result.expectedProfit)} accent />
            <McMetric label="ROI متوقع" value={`${result.expectedRoi}%`} accent />
          </div>
        </>
      )}
    </div>
  );
}
