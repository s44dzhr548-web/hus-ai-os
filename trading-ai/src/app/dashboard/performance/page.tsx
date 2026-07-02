"use client";

import { PerformanceClient } from "@/components/performance-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function PerformancePage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.performance.title} subtitle={t.performance.subtitle} />
      <PerformanceClient />
    </div>
  );
}
