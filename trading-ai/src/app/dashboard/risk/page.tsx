"use client";

import { RiskClient } from "@/components/risk-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function RiskPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.risk.title} subtitle={t.risk.subtitle} />
      <RiskClient />
    </div>
  );
}
