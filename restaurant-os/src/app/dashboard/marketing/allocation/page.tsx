"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function AllocationPage() {
  const [budget, setBudget] = useState(500);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  function load(custom?: Record<string, number>) {
    fetch("/api/marketing/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "distribution", budget, overrides: custom }),
    }).then((r) => r.json()).then(setData);
  }

  useEffect(() => { load(); }, []);

  const splits = (data?.splits ?? []) as Array<{ platform: string; labelAr: string; percent: number; amount: number }>;

  return (
    <div>
      <MkPageHeader title="Budget Distribution AI" desc="Meta 40% · TikTok 25% · Google 20% · Snap 10% · Reserve 5%" />
      <MkCard className="mb-4 flex flex-wrap gap-3">
        <input type="number" className="rounded border bg-transparent px-2 py-1" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
        <button type="button" onClick={() => load()} className="rounded bg-amber-600 px-3 py-1 text-sm text-white">إعادة حساب</button>
      </MkCard>
      {!data ? <MkLoading /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {splits.map((s) => (
            <MkCard key={s.platform}>
              <div className="mb-2 flex justify-between"><h3 className="font-bold">{s.labelAr}</h3><MkBadge type="simulation" /></div>
              <p className="text-sm">{s.percent}% · {s.amount} ر.س</p>
              <input type="number" className="mt-2 w-full rounded border bg-transparent px-2 py-1 text-sm" value={overrides[s.platform] ?? s.amount}
                onChange={(e) => {
                  const next = { ...overrides, [s.platform]: Number(e.target.value) };
                  setOverrides(next);
                  load(next);
                }} />
            </MkCard>
          ))}
        </div>
      )}
    </div>
  );
}
