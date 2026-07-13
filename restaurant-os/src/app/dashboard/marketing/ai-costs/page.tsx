"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkMetric, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function AiCostsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/marketing/providers?section=costs").then((r) => r.json()).then(setData);
  }, []);

  async function save() {
    if (!data?.settings) return;
    setBusy(true);
    await fetch("/api/marketing/providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "costs", settings: data.settings }),
    });
    setBusy(false);
  }

  if (!data) return <MkLoading />;

  const settings = data.settings as Record<string, number | boolean>;
  const byProvider = (data.byProvider ?? {}) as Record<string, number>;

  return (
    <div>
      <MkPageHeader title="التحكم بتكلفة AI" desc="ميزانية · حدود · تنبيهات · موافقة قبل التوليد المكلف" />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MkMetric label="ميزانية يومية" value={`${settings.dailyBudget} ر.س`} badge="simulation" />
        <MkMetric label="ميزانية شهرية" value={`${settings.monthlyBudget} ر.س`} badge="simulation" />
        <MkMetric label="الإنفاق الشهري" value={`${data.monthSpent} ر.س`} badge="demo" />
        <MkMetric label="المتبقي" value={`${data.remaining} ر.س`} badge="simulation" />
      </div>
      <MkCard className="mb-4 grid gap-3 sm:grid-cols-2">
        {[
          ["maxCostPerImage", "حد الصورة (ر.س)"],
          ["maxCostPerVideo", "حد الفيديو (ر.س)"],
          ["maxDailyAiCost", "حد يومي (ر.س)"],
          ["maxMonthlyAiCost", "حد شهري (ر.س)"],
          ["requireApprovalAbove", "موافقة فوق (ر.س)"],
          ["hardSpendingLimit", "حد صارم (ر.س)"],
        ].map(([key, label]) => (
          <label key={key} className="text-sm">
            {label}
            <input
              type="number"
              className="mt-1 w-full rounded border bg-transparent px-2 py-1"
              value={Number(settings[key] ?? 0)}
              onChange={(e) =>
                setData({ ...data, settings: { ...settings, [key]: Number(e.target.value) } })
              }
            />
          </label>
        ))}
      </MkCard>
      <MkCard className="mb-4">
        <h3 className="mb-2 font-semibold">التكلفة حسب المزود</h3>
        {Object.entries(byProvider).map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm"><span>{k}</span><span>{v} ر.س</span></div>
        ))}
        {!Object.keys(byProvider).length && <p className="text-xs opacity-60">لا استخدام مسجّل بعد</p>}
      </MkCard>
      {(data.alerts as string[])?.map((a) => (
        <p key={a} className="mb-2 text-xs text-amber-400">{a}</p>
      ))}
      <button type="button" disabled={busy} onClick={save} className="rounded bg-amber-600 px-4 py-2 text-sm text-white">حفظ الحدود</button>
    </div>
  );
}
