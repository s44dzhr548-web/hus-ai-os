"use client";
import { SymbolIntelligenceClient } from "@/components/symbol-intelligence-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function WhyNowPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.whyNow.title} subtitle={t.whyNow.subtitle} /><SymbolIntelligenceClient module="why-now" /></div>);
}
