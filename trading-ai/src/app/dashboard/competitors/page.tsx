"use client";
import { EnterpriseCompetitorsClient } from "@/components/enterprise-competitors-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function DashboardCompetitorsPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.enterpriseCompetitors.title} subtitle={t.enterpriseCompetitors.subtitle} /><EnterpriseCompetitorsClient /></div>);
}
