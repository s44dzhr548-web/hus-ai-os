"use client";

import { useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { BUDGET_GOALS } from "@/lib/marketing/nav";

export default function SimulationPage() {
  const [form, setForm] = useState({
    budget: 500,
    goal: "INCREASE_SALES",
    city: "الرياض",
    durationDays: 7,
    timeOfDay: "all",
    isWeekend: false,
    restaurantType: "lounge",
    averageOrderValue: 120,
    profitMargin: 32,
    existingCustomers: 500,
    reservationConversionRate: 0.35,
  });
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const res = await fetch("/api/marketing/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setResult(await res.json());
    setBusy(false);
  }

  const totals = (result?.totals ?? {}) as Record<string, number | string>;

  return (
    <div>
      <MkPageHeader title="محاكاة النتائج" desc="محرك محاكاة شفّاف — معادلات قابلة للاستبدال" />
      <MkCard className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["budget", "الميزانية"],
          ["city", "المدينة"],
          ["durationDays", "مدة الحملة (أيام)"],
          ["averageOrderValue", "متوسط الفاتورة"],
          ["profitMargin", "هامش الربح %"],
          ["existingCustomers", "عدد العملاء الحالي"],
          ["reservationConversionRate", "معدل تحويل الحجز"],
        ].map(([key, label]) => (
          <label key={key} className="text-sm">
            {label}
            <input
              className="mt-1 w-full rounded border bg-transparent px-2 py-1"
              value={String(form[key as keyof typeof form])}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  [key]: ["budget", "durationDays", "averageOrderValue", "profitMargin", "existingCustomers"].includes(key)
                    ? Number(e.target.value)
                    : key === "reservationConversionRate"
                      ? Number(e.target.value)
                      : e.target.value,
                }))
              }
            />
          </label>
        ))}
        <label className="text-sm">
          الهدف
          <select className="mt-1 w-full rounded border bg-transparent px-2 py-1" value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}>
            {BUDGET_GOALS.map((g) => (
              <option key={g.id} value={g.id}>{g.labelAr}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isWeekend} onChange={(e) => setForm((f) => ({ ...f, isWeekend: e.target.checked }))} />
          نهاية الأسبوع
        </label>
        <button type="button" disabled={busy} onClick={run} className="rounded-lg bg-amber-600 px-4 py-2 text-white sm:col-span-2">
          {busy ? "جاري المحاكاة…" : "تشغيل المحاكاة"}
        </button>
      </MkCard>

      {busy && <MkLoading />}

      {result && (
        <>
          <p className="mb-4 rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
            {String(result.label)}
          </p>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(totals).map(([k, v]) => (
              <MkCard key={k}>
                <p className="text-xs opacity-60">{k}</p>
                <p className="text-lg font-bold">{String(v)}</p>
                <MkBadge type="simulation" />
              </MkCard>
            ))}
          </div>
          <MkCard>
            <h3 className="mb-2 font-semibold">الافتراضات</h3>
            <ul className="list-inside list-disc text-xs opacity-80">
              {(result.assumptions as string[])?.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </MkCard>
        </>
      )}
    </div>
  );
}
