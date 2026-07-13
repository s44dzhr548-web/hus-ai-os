"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, LoadingSpinner, PageHeader, Badge } from "@/components/ui";
import { Download } from "lucide-react";

type LoginRow = {
  userName: string;
  loginDate: string;
  loginTime: string;
  logoutDate: string;
  logoutTime: string;
  sessionDurationDisplay: string;
  device: string;
  browser: string;
  ipAddress: string;
  loginSuccess: boolean;
  failureReason?: string | null;
  endReason?: string | null;
};

export default function StaffLoginHistoryPage() {
  const [rows, setRows] = useState<LoginRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/staff-activity?section=login-history")
      .then((r) => r.json())
      .then((d) => setRows(d.rows ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="سجل تسجيل الدخول والخروج"
        description="تاريخ الجلسات والأجهزة"
        action={
          <div className="flex gap-2">
            <Link href="/dashboard/staff/activity">
              <Button variant="outline">نشاط الموظفين</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() =>
                window.open("/api/staff-activity/export?type=login-history&format=csv", "_blank")
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
                <th className="px-3 py-2">المستخدم</th>
                <th className="px-3 py-2">تاريخ الدخول</th>
                <th className="px-3 py-2">وقت الدخول</th>
                <th className="px-3 py-2">تاريخ الخروج</th>
                <th className="px-3 py-2">وقت الخروج</th>
                <th className="px-3 py-2">مدة الجلسة</th>
                <th className="px-3 py-2">الجهاز</th>
                <th className="px-3 py-2">المتصفح</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="px-3 py-2 font-medium">{r.userName}</td>
                  <td className="px-3 py-2">{r.loginDate}</td>
                  <td className="px-3 py-2">{r.loginTime}</td>
                  <td className="px-3 py-2">{r.logoutDate}</td>
                  <td className="px-3 py-2">{r.logoutTime}</td>
                  <td className="px-3 py-2">{r.sessionDurationDisplay}</td>
                  <td className="px-3 py-2">{r.device}</td>
                  <td className="px-3 py-2">{r.browser}</td>
                  <td className="px-3 py-2 text-xs">{r.ipAddress}</td>
                  <td className="px-3 py-2">
                    <Badge variant={r.loginSuccess ? "default" : "danger"}>
                      {r.loginSuccess ? "نجاح" : "فailed"}
                    </Badge>
                    {r.failureReason && (
                      <p className="text-xs text-red-600">{r.failureReason}</p>
                    )}
                    {r.endReason && (
                      <p className="text-xs text-gray-500">{r.endReason}</p>
                    )}
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
