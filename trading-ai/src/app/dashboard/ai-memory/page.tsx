"use client";
import { PerformanceClient } from "@/components/performance-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function AIMemoryPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.aiMemory.title} subtitle={t.aiMemory.subtitle} /><PerformanceClient /></div>);
}
