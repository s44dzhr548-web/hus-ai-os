"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkLoading, MkMetric, MkPageHeader } from "@/components/marketing/marketing-shell";
import { formatCurrency } from "@/lib/utils";

type Metric = { value: number | string; label: string; labelAr: string };

function badgeType(label: string): "simulation" | "demo" | "not_connected" {
  if (label === "real" || label === "بيانات فعلية") return "demo";
  if (label === "not_connected" || label === "غير مربوط") return "not_connected";
  return "simulation";
}

export default function CommandCenterPage() {
  const [data, setData] = useState<Record<string, Metric> | null>(null);

  useEffect(() => {
    fetch("/api/marketing/command?section=executive").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <MkLoading />;

  const rows: [string, keyof typeof data][] = [
    ["ميزانية اليوم", "todayBudget"],
    ["ميزانية الأسبوع", "weekBudget"],
    ["ميزانية الشهر", "monthBudget"],
    ["المصروف الفعلي", "actualSpend"],
    ["إنفاق الشهر", "monthSpend"],
    ["الميزانية المتبقية", "remainingBudget"],
    ["إيرادات التسويق", "marketingRevenue"],
    ["الربح بعد الإعلان", "profitAfterAds"],
    ["عملاء جدد", "newCustomers"],
    ["عملاء عائدون", "returningCustomers"],
    ["حجوزات", "reservationsAttributed"],
    ["طلبات", "ordersAttributed"],
    ["متوسط الفاتورة", "averageOrderValue"],
    ["CPA", "cpa"],
    ["تكلفة الحجز", "costPerReservation"],
    ["تكلفة الطلب", "costPerOrder"],
    ["ROI", "roi"],
    ["ROAS", "roas"],
    ["Conversion Rate", "conversionRate"],
    ["Campaign Health", "campaignHealthScore"],
    ["AI Marketing Score", "aiMarketingScore"],
    ["AI Confidence", "aiConfidenceScore"],
    ["أفضل منصة", "bestPlatform"],
    ["أسوأ منصة", "worstPlatform"],
    ["أفضل حملة", "bestCampaign"],
    ["أهم فرصة", "topOpportunity"],
    ["أهم مشكلة", "topProblem"],
    ["آخر قرار AI", "lastAiDecision"],
    ["اتصالات المنصات", "platformConnections"],
  ];

  return (
    <div>
      <MkPageHeader title="AI Marketing Command Center" desc="مركز القيادة التنفيذي — Phase 2" />
      <p className="mb-4 text-xs text-amber-500">{(data as { disclaimer?: string }).disclaimer ?? ""}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map(([label, key]) => {
          const metric = data[key];
          if (!metric) return null;
          const isMoney = /ميزانية|إيراد|ربح|إنفاق|متوسط|تكلفة/.test(label);
          return (
            <MkMetric
              key={key}
              label={label}
              value={isMoney && typeof metric.value === "number" ? formatCurrency(metric.value) : String(metric.value)}
              badge={badgeType(metric.label)}
            />
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
        <MkBadge type="simulation" /> محاكاة
        <MkBadge type="demo" /> بيانات فعلية
        <MkBadge type="not_connected" /> غير مربوط
      </div>
    </div>
  );
}
