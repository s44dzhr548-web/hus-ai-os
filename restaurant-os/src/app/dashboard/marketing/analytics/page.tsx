"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function AnalyticsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/marketing/command?section=analytics").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <MkLoading />;

  const sections = [
    ["daily", "يومي"],
    ["weekly", "أسبوعي"],
    ["monthly", "شهري"],
    ["platformComparison", "مقارنة المنصات"],
    ["campaignComparison", "مقارنة الحملات"],
    ["customerSource", "مصدر العملاء"],
    ["revenueSource", "مصدر الإيراد"],
    ["reservationSource", "مصدر الحجوزات"],
  ] as const;

  return (
    <div>
      <MkPageHeader title="تحليلات التسويق" desc="Charts — Phase 2 محاكاة" />
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map(([key, title]) => (
          <MkCard key={key}>
            <div className="mb-2 flex justify-between">
              <h3 className="font-semibold">{title}</h3>
              <MkBadge type="simulation" />
            </div>
            <pre className="max-h-40 overflow-auto text-xs opacity-80">{JSON.stringify(data[key], null, 2)}</pre>
          </MkCard>
        ))}
      </div>
    </div>
  );
}
