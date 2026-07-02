"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { Badge } from "./trading-shell";

type Profile = {
  id: string;
  nameEn: string;
  nameAr: string;
  strengthsEn: string[];
  strengthsAr: string[];
  weaknessesEn: string[];
  weaknessesAr: string[];
  featuresEn: string[];
  featuresAr: string[];
  pricingEn: string;
  pricingAr: string;
  marketsEn: string;
  marketsAr: string;
  aiLevelEn: string;
  aiLevelAr: string;
  realTimeData: boolean;
  brokerIntegration: boolean;
  uniqueFeaturesEn: string[];
  uniqueFeaturesAr: string[];
};

export function EnterpriseCompetitorsClient() {
  const { t, locale } = useI18n();
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    fetch(`/api/market/competitors/enterprise?lang=${locale}`).then((r) => r.json()).then((d) => setProfiles(d.enterprise ?? []));
  }, [locale]);

  if (!profiles.length) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">{t.disclaimer.body}</div>
      {profiles.map((p) => (
        <article key={p.id} className={`rounded-xl border p-5 ${p.id === "husai" ? "border-emerald-500/30 bg-emerald-500/5" : "border-zinc-800 bg-zinc-900/60"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{locale === "ar" ? p.nameAr : p.nameEn}</h3>
            {p.id === "husai" && <Badge tone="buy">HUSAI</Badge>}
            {p.realTimeData && <Badge tone="buy">{t.enterpriseCompetitors.realTime}</Badge>}
            {p.brokerIntegration && <Badge tone="hold">{t.enterpriseCompetitors.broker}</Badge>}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2 text-sm">
            <div>
              <p className="text-xs text-zinc-500">{t.enterpriseCompetitors.strengths}</p>
              <ul className="mt-1 list-disc ps-4 text-zinc-300">{(locale === "ar" ? p.strengthsAr : p.strengthsEn).map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t.enterpriseCompetitors.weaknesses}</p>
              <ul className="mt-1 list-disc ps-4 text-zinc-400">{(locale === "ar" ? p.weaknessesAr : p.weaknessesEn).map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t.enterpriseCompetitors.features}</p>
              <p className="mt-1 text-zinc-300">{(locale === "ar" ? p.featuresAr : p.featuresEn).join(" · ")}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t.enterpriseCompetitors.pricing}</p>
              <p className="mt-1">{locale === "ar" ? p.pricingAr : p.pricingEn}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t.enterpriseCompetitors.markets}</p>
              <p className="mt-1">{locale === "ar" ? p.marketsAr : p.marketsEn}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t.enterpriseCompetitors.aiLevel}</p>
              <p className="mt-1">{locale === "ar" ? p.aiLevelAr : p.aiLevelEn}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-emerald-400/80">{(locale === "ar" ? p.uniqueFeaturesAr : p.uniqueFeaturesEn).join(" · ")}</p>
        </article>
      ))}
    </div>
  );
}
