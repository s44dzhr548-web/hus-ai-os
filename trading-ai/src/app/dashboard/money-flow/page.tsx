"use client";
import { MoneyFlowClient } from "@/components/money-flow-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function MoneyFlowPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.smartMoney.title} subtitle={t.smartMoney.subtitle} /><MoneyFlowClient /></div>);
}
