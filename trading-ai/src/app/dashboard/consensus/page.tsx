"use client";
import { ConsensusClient } from "@/components/consensus-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function ConsensusPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.consensus.title} subtitle={t.consensus.subtitle} /><ConsensusClient /></div>);
}
