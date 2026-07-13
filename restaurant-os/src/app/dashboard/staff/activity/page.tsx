"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, LoadingSpinner, PageHeader } from "@/components/ui";
import { Download } from "lucide-react";

type StaffRow = {
  userId: string;
  name: string;
  email: string;
  role: string;
  customersRegistered: number;
  tablesAssigned: number;
  sessionsStarted: number;
  sessionsClosed: number;
  reservationsCreated: number;
  editsPerformed: number;
  firstActivityDisplay: string;
  lastActivityDisplay: string;
  totalGuests: number;
  avgSessionDurationDisplay: string;
  loginHours: number;
};

export default function StaffActivityPage() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/staff-activity?section=summary")
      .then((r) => r.json())
      .then((d) => setRows(d.staff ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="سجل نشاط المستخدمين"
        description="تتبع أداء الموظفين وتسجيل العملاء والجلسات"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/staff/login-history">
              <Button variant="outline">سجل الدخول</Button>
            </Link>
            <Link href="/dashboard/staff/audit">
              <Button variant="outline">سجل التدقيق</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => window.open("/api/staff-activity/export?type=summary&format=csv", "_blank")}
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
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-right text-xs">
                <th className="px-3 py-2">الاسم</th>
                <th className="px-3 py-2">البريد</th>
                <th className="px-3 py-2">الدور</th>
                <th className="px-3 py-2">عملاء مسجلون</th>
                <th className="px-3 py-2">طاولات معينة</th>
                <th className="px-3 py-2">جلسات بدأها</th>
                <th className="px-3 py-2">جلسات أنهاها</th>
                <th className="px-3 py-2">حجوزات</th>
                <th className="px-3 py-2">تعديلات</th>
                <th className="px-3 py-2">إجمالي الضيوف</th>
                <th className="px-3 py-2">متوسط الجلسة</th>
                <th className="px-3 py-2">أول نشاط</th>
                <th className="px-3 py-2">آخر نشاط</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.userId} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2 text-gray-600">{s.email}</td>
                  <td className="px-3 py-2">{s.role}</td>
                  <td className="px-3 py-2">{s.customersRegistered}</td>
                  <td className="px-3 py-2">{s.tablesAssigned}</td>
                  <td className="px-3 py-2">{s.sessionsStarted}</td>
                  <td className="px-3 py-2">{s.sessionsClosed}</td>
                  <td className="px-3 py-2">{s.reservationsCreated}</td>
                  <td className="px-3 py-2">{s.editsPerformed}</td>
                  <td className="px-3 py-2">{s.totalGuests}</td>
                  <td className="px-3 py-2">{s.avgSessionDurationDisplay}</td>
                  <td className="px-3 py-2 text-xs">{s.firstActivityDisplay}</td>
                  <td className="px-3 py-2 text-xs">{s.lastActivityDisplay}</td>
                  <td className="px-3 py-2">
                    <Link href={`/dashboard/staff/activity/${s.userId}`}>
                      <Button size="sm" variant="outline">التفاصيل</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
