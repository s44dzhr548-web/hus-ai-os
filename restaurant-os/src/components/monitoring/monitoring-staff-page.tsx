"use client";

import { useEffect, useState } from "react";
import { MonitoringShell } from "@/components/monitoring/monitoring-shell";
import { Button, Card, LoadingSpinner } from "@/components/ui";
import { Download } from "lucide-react";

export function MonitoringStaffPage() {
  const [staff, setStaff] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/monitoring?section=staff")
      .then((r) => r.json())
      .then((d) => setStaff(d.staff ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <MonitoringShell description="ترتيب تلقائي — أفضل 10 موظفين">
      <div className="mb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open("/api/monitoring/export?type=staff&format=csv", "_blank")}
        >
          <Download className="h-4 w-4" />
          تصدير
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-right text-xs">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">الموظف</th>
              <th className="px-2 py-2">اليوم</th>
              <th className="px-2 py-2">الأسبوع</th>
              <th className="px-2 py-2">الشهر</th>
              <th className="px-2 py-2">طاولات</th>
              <th className="px-2 py-2">جلسات</th>
              <th className="px-2 py-2">متوسط خدمة</th>
              <th className="px-2 py-2">متوسط إقامة</th>
              <th className="px-2 py-2">ساعات عمل</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s, i) => (
              <tr key={String(s.staffId)} className="border-b">
                <td className="px-2 py-2">{i + 1}</td>
                <td className="px-2 py-2 font-medium">{String(s.name)}</td>
                <td className="px-2 py-2">{String(s.customersToday)}</td>
                <td className="px-2 py-2">{String(s.customersWeek)}</td>
                <td className="px-2 py-2">{String(s.customersMonth)}</td>
                <td className="px-2 py-2">{String(s.tablesAssigned)}</td>
                <td className="px-2 py-2">{String(s.sessionsCompleted)}</td>
                <td className="px-2 py-2">{String(s.avgServiceMinutes)} د</td>
                <td className="px-2 py-2">{String(s.avgStayMinutes)} د</td>
                <td className="px-2 py-2">{String(s.workingHours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MonitoringShell>
  );
}
