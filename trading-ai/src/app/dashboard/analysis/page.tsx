"use client";

import { AnalysisClient } from "@/components/analysis-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function AnalysisPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.analysis.title} subtitle={t.analysis.subtitle} />
      <AnalysisClient />
    </div>
  );
}
