"use client";

import { ProvidersClient } from "@/components/providers-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function ProvidersPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.providers.title} subtitle={t.providers.subtitle} />
      <ProvidersClient />
    </div>
  );
}
