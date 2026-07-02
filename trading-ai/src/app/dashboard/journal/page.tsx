"use client";

import { JournalClient } from "@/components/journal-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function JournalPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.journal.title} subtitle={t.journal.subtitle} />
      <JournalClient />
    </div>
  );
}
