"use client";
import { ResearchAgentClient } from "@/components/research-agent-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function ResearchPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.researchAgent.title} subtitle={t.researchAgent.subtitle} /><ResearchAgentClient /></div>);
}
