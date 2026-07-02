"use client";
import { MarketBrainClient } from "@/components/market-brain-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function MarketBrainPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.marketBrain.title} subtitle={t.marketBrain.subtitle} /><MarketBrainClient /></div>);
}
