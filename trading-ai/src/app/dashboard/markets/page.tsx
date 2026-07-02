"use client";

import { MarketsClient } from "@/components/markets-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function MarketsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.markets.title} subtitle={t.markets.subtitle} />
      <MarketsClient />
    </div>
  );
}
