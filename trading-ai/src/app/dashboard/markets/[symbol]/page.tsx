"use client";

import { useParams } from "next/navigation";
import { CompanyProfileClient } from "@/components/company-profile-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function CompanyProfilePage() {
  const params = useParams();
  const symbolParam = decodeURIComponent(String(params.symbol ?? ""));
  const { t } = useI18n();

  return (
    <div>
      <PageHeader title={t.companyProfile.title} subtitle={symbolParam} />
      <CompanyProfileClient symbolParam={symbolParam} />
    </div>
  );
}
