"use client";
import { StrategyMarketplaceClient } from "@/components/strategy-marketplace-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function StrategyMarketplacePage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.strategyMarketplace.title} subtitle={t.strategyMarketplace.subtitle} /><StrategyMarketplaceClient /></div>);
}
