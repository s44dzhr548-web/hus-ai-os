"use client";
import { ArabicIntelClient } from "@/components/arabic-intel-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function ArabicIntelPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.arabicIntel.title} subtitle={t.arabicIntel.subtitle} /><ArabicIntelClient /></div>);
}
