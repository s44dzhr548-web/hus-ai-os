"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MonitoringShell } from "@/components/monitoring/monitoring-shell";
import { Button, Card, LoadingSpinner } from "@/components/ui";
import { Download, ExternalLink } from "lucide-react";

export function MonitoringVisitsPage() {
  const [visits, setVisits] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customers?view=visits&preset=today")
      .then((r) => r.json())
      .then((d) => setVisits(Array.isArray(d.visits) ? d.visits : d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <MonitoringShell description="سجل زيارات العملاء — للقراءة فقط">
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/dashboard/customers?view=visits">
          <Button size="sm" variant="outline">
            <ExternalLink className="h-4 w-4" />
            سجل العملاء الكامل
          </Button>
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open("/api/customers/export?type=visits", "_blank")}
        >
          <Download className="h-4 w-4" />
          تصدير CSV
        </Button>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-right text-xs">
              <th className="px-3 py-2">العميل</th>
              <th className="px-3 py-2">طاولة</th>
              <th className="px-3 py-2">وصول</th>
              <th className="px-3 py-2">مغادرة</th>
              <th className="px-3 py-2">الفاتورة</th>
              <th className="px-3 py-2">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {visits.slice(0, 100).map((v) => (
              <tr key={String(v.id)} className="border-b">
                <td className="px-3 py-2">{String(v.customerName)}</td>
                <td className="px-3 py-2">#{String(v.tableNumber ?? "—")}</td>
                <td className="px-3 py-2 text-xs">
                  {v.arrivalTime ? new Date(String(v.arrivalTime)).toLocaleString("ar-SA") : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {v.endTime ? new Date(String(v.endTime)).toLocaleString("ar-SA") : "—"}
                </td>
                <td className="px-3 py-2">{String(v.totalBill ?? 0)}</td>
                <td className="px-3 py-2">{String(v.visitStatus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </MonitoringShell>
  );
}
