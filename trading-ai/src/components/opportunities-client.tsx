"use client";

import { useEffect, useState } from "react";
import type { OpportunityItem } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { RecommendationBadge } from "./trading-shell";

export function OpportunitiesClient() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<OpportunityItem[]>([]);

  useEffect(() => {
    fetch("/api/intelligence/platform?type=opportunities")
      .then((r) => r.json())
      .then((d) => setItems(d.opportunities ?? []));
  }, []);

  if (!items.length) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2 text-start">
      {items.map((o) => (
        <article key={o.symbol} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{o.symbol}</h3>
            <span className="text-emerald-400">{o.score}/100</span>
          </div>
          <p className="mt-1 text-xs uppercase text-zinc-500">{o.type}</p>
          <p className="mt-2 text-sm text-zinc-300">{locale === "ar" ? o.reasonAr : o.reasonEn}</p>
        </article>
      ))}
    </div>
  );
}
