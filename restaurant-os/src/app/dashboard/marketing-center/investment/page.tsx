"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui";
import { McCard } from "@/components/marketing-center/mc-shell";
import { formatCurrency } from "@/lib/utils";

export default function InvestmentPage() {
  const [platforms, setPlatforms] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketing-center/data")
      .then((r) => r.json())
      .then((d) => setPlatforms(d.platforms || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">استثمار التسويق</h1>
      <p className="mb-6 text-sm opacity-70">قيم placeholder — Phase 1</p>
      <McCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-stone-700 text-right text-xs opacity-60">
              <th className="p-3">المنصة</th>
              <th className="p-3">الميزانية</th>
              <th className="p-3">المنفق</th>
              <th className="p-3">عملاء متوقع</th>
              <th className="p-3">حجوزات</th>
              <th className="p-3">إيراد</th>
              <th className="p-3">ROI</th>
              <th className="p-3">ربح</th>
              <th className="p-3">ثقة</th>
            </tr>
          </thead>
          <tbody>
            {platforms.map((p) => (
              <tr key={String(p.id)} className="border-b border-stone-800/50 hover:bg-stone-800/30">
                <td className="p-3 font-medium">{String(p.labelAr)}</td>
                <td className="p-3">{formatCurrency(Number(p.budgetAllocated))}</td>
                <td className="p-3">{formatCurrency(Number(p.spent))}</td>
                <td className="p-3">{String(p.expectedCustomers)}</td>
                <td className="p-3">{String(p.expectedReservations)}</td>
                <td className="p-3">{formatCurrency(Number(p.expectedRevenue))}</td>
                <td className="p-3">{String(p.expectedRoi)}%</td>
                <td className="p-3">{formatCurrency(Number(p.expectedProfit))}</td>
                <td className="p-3">{String(p.confidenceScore)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </McCard>
    </div>
  );
}
