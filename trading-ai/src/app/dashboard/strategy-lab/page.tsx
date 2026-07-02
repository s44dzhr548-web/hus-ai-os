"use client";

import { StrategyLabClient } from "@/components/strategy-lab-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function StrategyLabPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.strategyLab.title} subtitle={t.strategyLab.subtitle} />
      <StrategyLabClient />
    </div>
  );
}
