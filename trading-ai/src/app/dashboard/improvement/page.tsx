"use client";
import { ImprovementClient } from "@/components/improvement-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function ImprovementPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.improvement.title} subtitle={t.improvement.subtitle} /><ImprovementClient /></div>);
}
