"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

export function ReportsClient() {
  const { t } = useI18n();
  const [dataMode, setDataMode] = useState("MOCK");

  useEffect(() => {
    fetch("/api/compliance")
      .then((r) => r.json())
      .then((d) => setDataMode(String(d.dataMode ?? "mock").toUpperCase()));
  }, []);

  const rows = [
    [t.reports.markets, t.reports.marketsValue],
    [t.reports.dataMode, dataMode],
    [t.reports.execution, t.reports.executionValue],
    [t.reports.tests, "8+ passing"],
    [t.reports.apis, t.reports.apisValue],
  ];

  return (
    <div className="space-y-6 text-start">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.reports.platformStatus}</h3>
        <dl className="mt-4 space-y-3">
          {rows.map(([label, value]) => (
            <div key={String(label)} className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/50 pb-2">
              <dt className="text-sm text-zinc-500">{label}</dt>
              <dd className="text-sm font-medium text-emerald-300">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <p className="text-xs text-amber-400/80">{t.disclaimer.title} {t.disclaimer.body}</p>
    </div>
  );
}
