"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/marketing/data?section=settings")
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  if (!settings) return <MkLoading />;

  const fields = [
    ["defaultBudget", "الميزانية الافتراضية"],
    ["currency", "العملة"],
    ["defaultGoal", "الهدف الافتراضي"],
    ["targetCity", "المدينة"],
    ["targetRadius", "نطاق الاستهداف (كم)"],
    ["approvalRequired", "موافقة قبل التنفيذ"],
    ["aiFrequency", "تكرار توصيات AI"],
    ["consentRules", "قواعد الموافقة"],
    ["profitMargin", "هامش الربح %"],
    ["averageOrderValue", "متوسط الفاتورة"],
  ] as const;

  return (
    <div>
      <MkPageHeader title="إعدادات التسويق" desc="إعدادات داخل وحدة التسويق فقط" />
      <MkCard className="max-w-xl space-y-3">
        {fields.map(([key, label]) => (
          <div key={key} className="flex justify-between border-b border-stone-700/30 pb-2 text-sm">
            <span className="opacity-70">{label}</span>
            <span>{String(settings[key] ?? "—")}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm">
          <span className="opacity-70">المنصات المفضلة</span>
          <span>{(settings.preferredPlatforms as string[])?.join(" · ")}</span>
        </div>
        <MkBadge type="simulation" />
      </MkCard>
    </div>
  );
}
