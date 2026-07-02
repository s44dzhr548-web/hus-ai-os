"use client";
import { RiskGuardianClient } from "@/components/risk-guardian-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function RiskGuardianPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.riskGuardian.title} subtitle={t.riskGuardian.subtitle} /><RiskGuardianClient /></div>);
}
