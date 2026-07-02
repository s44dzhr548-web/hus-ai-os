"use client";
import { ProviderCostsClient } from "@/components/provider-costs-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function ProviderCostsPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.providerCosts.title} subtitle={t.providerCosts.subtitle} /><ProviderCostsClient /></div>);
}
