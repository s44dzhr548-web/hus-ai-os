"use client";

import { MarketHealthClient } from "@/components/market-health-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function MarketHealthPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.marketHealth.title} subtitle={t.marketHealth.subtitle} />
      <MarketHealthClient />
    </div>
  );
}
