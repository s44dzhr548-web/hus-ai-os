"use client";
import { ProviderConfigClient } from "@/components/provider-config-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";
export default function ProviderSettingsPage() {
  const { t } = useI18n();
  return (<div><PageHeader title={t.providerConfig.title} subtitle={t.providerConfig.subtitle} /><ProviderConfigClient /></div>);
}
