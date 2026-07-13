"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui";
import { McMetric } from "@/components/marketing-center/mc-shell";
import { formatCurrency } from "@/lib/utils";

export default function PerformancePage() {
  const [a, setA] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketing-center/data")
      .then((r) => r.json())
      .then((d) => setA(d.analytics || {}))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">مراقبة الأداء</h1>
      <p className="mb-6 text-sm opacity-70">Dashboard placeholder — لا API خارجي</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <McMetric label="CTR" value={`${a.ctr ?? 0}%`} />
        <McMetric label="CPC" value={formatCurrency(Number(a.cpc ?? 0))} />
        <McMetric label="CPA" value={formatCurrency(Number(a.cpa ?? 0))} />
        <McMetric label="ROAS" value={`${a.roas ?? 0}x`} accent />
        <McMetric label="ROI" value={`${a.roi ?? 0}%`} accent />
        <McMetric label="حجوزات" value={a.reservations ?? 0} />
        <McMetric label="طلبات" value={a.orders ?? 0} />
        <McMetric label="عملاء" value={a.customers ?? 0} />
        <McMetric label="إيراد" value={formatCurrency(Number(a.revenue ?? 0))} />
        <McMetric label="ربح" value={formatCurrency(Number(a.profit ?? 0))} />
      </div>
    </div>
  );
}
