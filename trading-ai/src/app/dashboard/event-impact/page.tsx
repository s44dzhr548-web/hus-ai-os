"use client";
import { EventImpactClient } from "@/components/event-impact-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function EventImpactPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.eventImpact.title} subtitle={t.eventImpact.subtitle} /><EventImpactClient /></div>);
}
