"use client";

import { OpportunitiesClient } from "@/components/opportunities-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function OpportunitiesPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.opportunities.title} subtitle={t.opportunities.subtitle} />
      <OpportunitiesClient />
    </div>
  );
}
