"use client";

import { SettingsClient } from "@/components/settings-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function SettingsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />
      <SettingsClient />
    </div>
  );
}
