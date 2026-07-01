"use client";

import { useI18n } from "@/lib/i18n/context";

export function DisclaimerBanner() {
  const { t } = useI18n();
  return (
    <div className="border-b border-amber-900/50 bg-amber-950/40 px-4 py-3 text-center text-sm text-amber-200">
      <strong>{t.disclaimer.title}</strong> {t.disclaimer.body}
    </div>
  );
}
