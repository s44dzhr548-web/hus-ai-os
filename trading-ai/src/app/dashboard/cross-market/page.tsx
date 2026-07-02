"use client";

import { CrossMarketClient } from "@/components/cross-market-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function CrossMarketPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.crossMarket.title} subtitle={t.crossMarket.subtitle} />
      <CrossMarketClient />
    </div>
  );
}
