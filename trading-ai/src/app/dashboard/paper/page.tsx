"use client";

import { PaperClient } from "@/components/paper-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function PaperPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.paper.title} subtitle={t.paper.subtitle} />
      <PaperClient />
    </div>
  );
}
