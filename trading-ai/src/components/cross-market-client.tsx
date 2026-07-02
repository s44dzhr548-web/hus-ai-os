"use client";

import { useEffect, useState } from "react";
import type { CrossMarketChain, CrossMarketRelation } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { Badge } from "./trading-shell";

export function CrossMarketClient() {
  const { t, locale } = useI18n();
  const [relations, setRelations] = useState<CrossMarketRelation[]>([]);
  const [chains, setChains] = useState<CrossMarketChain[]>([]);

  useEffect(() => {
    fetch("/api/intelligence/cross-market")
      .then((r) => r.json())
      .then((d) => {
        setRelations(d.relations ?? []);
        setChains(d.chains ?? []);
      });
  }, []);

  if (!chains.length && !relations.length) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-8 text-start">
      <section>
        <h3 className="mb-4 font-medium">{t.crossMarket.chains}</h3>
        <div className="grid gap-4">
          {chains.map((chain) => (
            <article key={chain.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <h4 className="font-medium">{locale === "ar" ? chain.titleAr : chain.titleEn}</h4>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                {chain.nodes.map((node, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <Badge tone="neutral">{locale === "ar" ? node.labelAr : node.labelEn}</Badge>
                    {i < chain.nodes.length - 1 && <span className="text-emerald-400">↓</span>}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <p>{t.crossMarket.correlation}: {(chain.correlationScore * 100).toFixed(0)}%</p>
                <p>{t.crossMarket.impact}: {(chain.impactScore * 100).toFixed(0)}%</p>
                <p>{t.crossMarket.direction}: {chain.expectedDirection}</p>
                <p>{t.common.confidence}: {(chain.confidence * 100).toFixed(0)}%</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-4 font-medium">{t.crossMarket.relations}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {relations.map((r) => (
            <article key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <h4 className="font-medium">{locale === "ar" ? r.titleAr : r.titleEn}</h4>
              <p className="mt-2 text-sm text-zinc-400">{locale === "ar" ? r.descriptionAr : r.descriptionEn}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
