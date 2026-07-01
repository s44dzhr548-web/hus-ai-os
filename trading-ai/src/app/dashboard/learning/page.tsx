"use client";

import { LearningClient } from "@/components/learning-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function LearningPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.learning.title} subtitle={t.learning.subtitle} />
      <LearningClient />
    </div>
  );
}
