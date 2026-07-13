"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, LoadingSpinner, PageHeader, Badge } from "@/components/ui";
import { Download } from "lucide-react";

type AuditRow = {
  id: string;
  actionLabel: string;
  staffName: string;
  date: string;
  time: string;
  previousValue?: string | null;
  newValue?: string | null;
  result: string;
  ipAddress?: string | null;
};

export default function StaffAuditPage() {
  const [events, setEvents] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/staff-activity?section=audit")
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="سجل التدقيق"
        description="سجل غير قابل للتعديل — جميع إجراءات النظام"
        action={
          <div className="flex gap-2">
            <Link href="/dashboard/staff/activity">
              <Button variant="outline">نشاط الموظفين</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() =>
                window.open("/api/staff-activity/export?type=audit&format=csv", "_blank")
              }
            >
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-right text-xs">
                <th className="px-3 py-2">التاريخ</th>
                <th className="px-3 py-2">الوقت</th>
                <th className="px-3 py-2">الإجراء</th>
                <th className="px-3 py-2">الموظف</th>
                <th className="px-3 py-2">قبل</th>
                <th className="px-3 py-2">بعد</th>
                <th className="px-3 py-2">النتيجة</th>
                <th className="px-3 py-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className="px-3 py-2">{e.date}</td>
                  <td className="px-3 py-2">{e.time}</td>
                  <td className="px-3 py-2 font-medium">{e.actionLabel}</td>
                  <td className="px-3 py-2">{e.staffName}</td>
                  <td className="px-3 py-2 max-w-[120px] truncate text-xs">{e.previousValue ?? "—"}</td>
                  <td className="px-3 py-2 max-w-[120px] truncate text-xs">{e.newValue ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant={e.result === "success" ? "default" : "danger"}>
                      {e.result === "success" ? "نجاح" : "فشل"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">{e.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
