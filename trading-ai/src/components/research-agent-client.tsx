"use client";

import { useEffect, useState } from "react";
import type { ResearchNewsItem } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { Badge } from "./trading-shell";

export function ResearchAgentClient() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<ResearchNewsItem[]>([]);
  const [mode, setMode] = useState<"live" | "demo">("demo");

  useEffect(() => {
    fetch("/api/research/news").then((r) => r.json()).then((d) => {
      setItems(d.items ?? []);
      setMode(d.dataSource ?? "demo");
    });
  }, []);

  return (
    <div className="space-y-6 text-start">
      {mode === "demo" && <Badge tone="hold">{t.market.demoBadge}</Badge>}
      <ul className="space-y-4">
        {items.map((n) => (
          <li key={n.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="font-medium">{locale === "ar" ? n.headlineAr : n.headlineEn}</h3>
            <p className="mt-2 text-sm text-zinc-400">{locale === "ar" ? n.summaryAr : n.summaryEn}</p>
            <p className="mt-2 text-sm text-emerald-300/80">{locale === "ar" ? n.expectedImpactAr : n.expectedImpactEn}</p>
            <p className="mt-2 text-xs text-zinc-500">{t.researchAgent.assets}: {n.affectedAssets.join(", ")}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
