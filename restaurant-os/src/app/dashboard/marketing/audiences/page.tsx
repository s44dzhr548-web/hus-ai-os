"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function AudiencesPage() {
  const [audiences, setAudiences] = useState<Array<{ id: string; name: string; count: number; label: string }>>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/marketing/data?section=audiences")
      .then((r) => r.json())
      .then((d) => {
        setAudiences(d.audiences ?? []);
        setNote(d.consentNote ?? "");
      });
  }, []);

  if (!audiences.length) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title="العملاء والجمهور" desc="شرائح مع احترام موافقة التسويق" />
      <p className="mb-4 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-300">{note}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {audiences.map((a) => (
          <MkCard key={a.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{a.name}</p>
              <p className="text-lg font-bold tabular-nums">{a.count}</p>
            </div>
            <MkBadge type={a.label === "محاكاة" ? "simulation" : "demo"} />
          </MkCard>
        ))}
      </div>
    </div>
  );
}
