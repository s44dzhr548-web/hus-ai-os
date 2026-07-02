"use client";
import { AIDebateClient } from "@/components/ai-debate-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function AIDebatePage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.aiDebate.title} subtitle={t.aiDebate.subtitle} /><AIDebateClient /></div>);
}
