"use client";

import { useEffect, useState } from "react";
import { MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function ProviderRoutingPage() {
  const [routing, setRouting] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/marketing/providers?section=routing").then((r) => r.json()).then((d) => setRouting(d.routing));
  }, []);

  async function save() {
    setBusy(true);
    await fetch("/api/marketing/providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "routing", rules: routing }),
    });
    setBusy(false);
  }

  if (!routing) return <MkLoading />;

  const rules = (routing.rules as Array<{ task: string; provider: string }>) ?? [];

  return (
    <div>
      <MkPageHeader title="توجيه المزودات" desc="Primary · Backup · Cheapest · Quality · Failover" />
      <MkCard className="mb-4 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(routing.autoSelect)} onChange={(e) => setRouting({ ...routing, autoSelect: e.target.checked })} />
          اختيار تلقائي للمزود
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(routing.failoverToBackup)} onChange={(e) => setRouting({ ...routing, failoverToBackup: e.target.checked })} />
          التبديل للاحتياطي عند الفشل
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(routing.stopIfCostExceedsLimit)} onChange={(e) => setRouting({ ...routing, stopIfCostExceedsLimit: e.target.checked })} />
          إيقاف التوليد عند تجاوز حد التكلفة
        </label>
      </MkCard>
      <MkCard className="mb-4">
        <h3 className="mb-2 font-semibold">قواعد المهام</h3>
        <ul className="space-y-1 text-sm">
          {rules.map((r) => (
            <li key={r.task}>{r.task} → {r.provider}</li>
          ))}
        </ul>
      </MkCard>
      <button type="button" disabled={busy} onClick={save} className="rounded bg-amber-600 px-4 py-2 text-sm text-white">حفظ التوجيه</button>
    </div>
  );
}
