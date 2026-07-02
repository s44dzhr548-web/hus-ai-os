"use client";

import { SimulationClient } from "@/components/simulation-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function SimulationPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.simulation.title} subtitle={t.simulation.subtitle} />
      <SimulationClient />
    </div>
  );
}
