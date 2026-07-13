"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Array<Record<string, string | number>>>([]);

  useEffect(() => {
    fetch("/api/marketing/data?section=opportunities")
      .then((r) => r.json())
      .then((d) => setItems(d.opportunities ?? []));
  }, []);

  if (!items.length) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title="الفرص التسويقية" desc="من بيانات Restaurant OS عند توفرها" />
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((o) => (
          <MkCard key={String(o.id)}>
            <div className="mb-2 flex justify-between">
              <h3 className="font-bold">{o.problem}</h3>
              <MkBadge type={o.dataLabel === "محاكاة" ? "simulation" : "demo"} />
            </div>
            <dl className="space-y-1 text-sm">
              <div><span className="opacity-60">السبب: </span>{o.cause}</div>
              <div><span className="opacity-60">الحملة: </span>{o.campaign}</div>
              <div><span className="opacity-60">الميزانية: </span>{o.budget} ر.س</div>
              <div><span className="opacity-60">الجمهور: </span>{o.audience}</div>
              <div><span className="opacity-60">المنصة: </span>{o.platform}</div>
              <div><span className="opacity-60">العائد: </span>{o.roi}</div>
            </dl>
          </MkCard>
        ))}
      </div>
    </div>
  );
}
