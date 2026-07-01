"use client";

import { ReportsClient } from "@/components/reports-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function ReportsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.reports.title} subtitle={t.reports.subtitle} />
      <ReportsClient />
    </div>
  );
}
