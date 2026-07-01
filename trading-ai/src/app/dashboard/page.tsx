"use client";

import { OverviewClient } from "@/components/overview-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function DashboardPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.overview.title} subtitle={t.overview.subtitle} />
      <OverviewClient />
    </div>
  );
}
