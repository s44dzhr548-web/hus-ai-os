"use client";

import { ScenariosClient } from "@/components/scenarios-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function ScenariosPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.scenarios.title} subtitle={t.scenarios.subtitle} />
      <ScenariosClient />
    </div>
  );
}
