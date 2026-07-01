"use client";

import { AlertsClient } from "@/components/alerts-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function AlertsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.alerts.title} subtitle={t.alerts.subtitle} />
      <AlertsClient />
    </div>
  );
}
