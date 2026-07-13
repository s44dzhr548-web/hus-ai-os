"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function ReportsPage() {
  const [reports, setReports] = useState<Array<{ id: string; title: string; export: Record<string, string> }>>([]);

  useEffect(() => {
    fetch("/api/marketing/data?section=reports")
      .then((r) => r.json())
      .then((d) => setReports(d.reports ?? []));
  }, []);

  if (!reports.length) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title="التقارير" desc="تصدير PDF · CSV · Excel — قريبًا" />
      <div className="grid gap-3 sm:grid-cols-2">
        {reports.map((r) => (
          <MkCard key={r.id}>
            <div className="mb-2 flex justify-between">
              <h3 className="font-medium">{r.title}</h3>
              <MkBadge type="simulation" />
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(r.export).map(([fmt, status]) => (
                <button key={fmt} type="button" disabled className="rounded border px-2 py-1 text-xs opacity-60">
                  {fmt.toUpperCase()} — {status}
                </button>
              ))}
            </div>
          </MkCard>
        ))}
      </div>
    </div>
  );
}
