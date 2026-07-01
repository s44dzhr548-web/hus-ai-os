"use client";

import { BacktestClient } from "@/components/backtest-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function BacktestPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.backtest.title} subtitle={t.backtest.subtitle} />
      <BacktestClient />
    </div>
  );
}
