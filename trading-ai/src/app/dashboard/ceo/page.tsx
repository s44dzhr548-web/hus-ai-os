"use client";
import { CEODashboardClient } from "@/components/ceo-dashboard-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function CEOPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.ceo.title} subtitle={t.ceo.subtitle} /><CEODashboardClient /></div>);
}
