"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function IntegrationsPage() {
  const [items, setItems] = useState<Array<Record<string, string | null>>>([]);

  useEffect(() => {
    fetch("/api/marketing/data?section=integrations")
      .then((r) => r.json())
      .then((d) => setItems(d.integrations ?? []));
  }, []);

  if (!items.length) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title="ربط المنصات" desc="لا OAuth · لا API Keys · Phase 2" />
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((i) => (
          <MkCard key={String(i.key)}>
            <div className="mb-2 flex justify-between">
              <h3 className="font-bold">{i.labelAr}</h3>
              <MkBadge type="not_connected" />
            </div>
            <p className="text-xs opacity-70">الصلاحيات: {i.permissions}</p>
            <p className="text-xs opacity-70">مزامنة: {i.syncData}</p>
            <p className="text-xs opacity-70">آخر مزامنة: {i.lastSync ?? "—"}</p>
            <button type="button" disabled className="mt-3 rounded bg-stone-700 px-3 py-1.5 text-xs opacity-60">
              {i.connect}
            </button>
          </MkCard>
        ))}
      </div>
    </div>
  );
}
