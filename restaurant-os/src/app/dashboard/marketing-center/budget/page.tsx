"use client";

import { useEffect, useState } from "react";
import { Button, LoadingSpinner } from "@/components/ui";
import { McCard } from "@/components/marketing-center/mc-shell";
import { formatCurrency } from "@/lib/utils";

export default function BudgetPage() {
  const [daily, setDaily] = useState(500);
  const [weekly, setWeekly] = useState(3500);
  const [monthly, setMonthly] = useState(15000);
  const [distribution, setDistribution] = useState<{ platform: string; labelAr: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetch("/api/marketing-center/budget")
      .then((r) => r.json())
      .then((d) => {
        setDaily(d.daily);
        setWeekly(d.weekly);
        setMonthly(d.monthly);
        setDistribution(d.distribution || []);
      });

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/marketing-center/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily, weekly, monthly }),
    });
    const d = await res.json();
    setDistribution(d.distribution || []);
    setSaving(false);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">الميزانية الذكية</h1>
      <p className="mb-6 text-sm opacity-70">أدخل الميزانية — AI يوزّعها (توصية فقط)</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "يومي", value: daily, set: setDaily },
          { label: "أسبوعي", value: weekly, set: setWeekly },
          { label: "شهري", value: monthly, set: setMonthly },
        ].map(({ label, value, set }) => (
          <McCard key={label}>
            <label className="text-xs opacity-60">{label} (SAR)</label>
            <input
              type="number"
              className="mt-2 w-full rounded-lg border border-stone-600/30 bg-transparent px-3 py-2 text-lg font-bold"
              value={value}
              onChange={(e) => set(Number(e.target.value))}
            />
          </McCard>
        ))}
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? "..." : "حفظ + توزيع AI"}
      </Button>

      <McCard className="mt-6">
        <h2 className="mb-4 font-semibold text-amber-400">توزيع AI الموصى به</h2>
        <div className="space-y-3">
          {distribution.map((d) => (
            <div key={d.platform} className="flex items-center gap-3">
              <span className="w-24 text-sm">{d.labelAr}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-800">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-amber-500 to-amber-300 transition-all duration-700"
                  style={{ width: `${Math.min(100, (d.amount / daily) * 100)}%` }}
                />
              </div>
              <span className="w-20 text-left text-sm font-mono">{formatCurrency(d.amount)}</span>
            </div>
          ))}
        </div>
      </McCard>
    </div>
  );
}
