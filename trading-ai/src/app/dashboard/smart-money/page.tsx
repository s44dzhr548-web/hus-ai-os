"use client";

import { SmartMoneyClient } from "@/components/smart-money-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function SmartMoneyPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.smartMoney.title} subtitle={t.smartMoney.subtitle} />
      <SmartMoneyClient />
    </div>
  );
}
