"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { BUDGET_GOALS } from "@/lib/marketing/nav";

export default function SmartBudgetPage() {
  const [form, setForm] = useState({ daily: 500, weekly: 3500, monthly: 15000, city: "الرياض", goal: "INCREASE_SALES", targetCustomers: 100, aov: 120, margin: 32 });
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  async function recommend() {
    setBusy(true);
    const res = await fetch("/api/marketing/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "budget", ...form, monthly: form.daily * 30, weekly: form.daily * 7 }),
    });
    setResult(await res.json());
    setBusy(false);
  }

  return (
    <div>
      <MkPageHeader title="Smart Budget Engine" desc="Phase 2 — AI recommendations (simulation)" />
      <MkCard className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["daily", "يومي"], ["weekly", "أسبوعي"], ["monthly", "شهري"], ["city", "المدينة"],
          ["targetCustomers", "عملاء مستهدفون"], ["aov", "متوسط الفاتورة"], ["margin", "هامش الربح %"],
        ].map(([k, label]) => (
          <label key={k} className="text-sm">{label}
            <input className="mt-1 w-full rounded border bg-transparent px-2 py-1" value={String(form[k as keyof typeof form])}
              onChange={(e) => setForm({ ...form, [k]: ["daily", "weekly", "monthly", "targetCustomers", "aov", "margin"].includes(k) ? Number(e.target.value) : e.target.value })} />
          </label>
        ))}
        <label className="text-sm">الهدف
          <select className="mt-1 w-full rounded border bg-transparent px-2 py-1" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
            {BUDGET_GOALS.map((g) => <option key={g.id} value={g.id}>{g.labelAr}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy} onClick={recommend} className="rounded bg-amber-600 px-4 py-2 text-white sm:col-span-2">{busy ? "…" : "توصيات AI"}</button>
      </MkCard>
      {result && (
        <MkCard>
          <MkBadge type="simulation" />
          <pre className="mt-2 overflow-x-auto text-xs">
            {JSON.stringify(
              result.recommendations ??
                (result.simulation as { totals?: unknown } | undefined)?.totals ??
                result,
              null,
              2
            )}
          </pre>
        </MkCard>
      )}
    </div>
  );
}
