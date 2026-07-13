"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function CustomerJourneyPage() {
  const [data, setData] = useState<{ stages?: Array<{ key: string; labelAr: string; count: number }>; models?: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/marketing/command?section=attribution").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title="Customer Journey & Attribution" desc="Ad → … → Return visit" />
      <MkCard className="mb-4">
        <p className="text-xs opacity-70">Models: {(data.models ?? []).join(" · ")}</p>
      </MkCard>
      <div className="space-y-2">
        {(data.stages ?? []).map((s) => (
          <MkCard key={s.key} className="flex justify-between">
            <span>{s.labelAr}</span>
            <div className="flex gap-2"><span className="font-bold">{s.count}</span><MkBadge type="simulation" /></div>
          </MkCard>
        ))}
      </div>
    </div>
  );
}
