"use client";

import { useEffect, useState } from "react";
import { MonitoringShell } from "@/components/monitoring/monitoring-shell";
import { Button, Card, LoadingSpinner } from "@/components/ui";
import { Download, Shield } from "lucide-react";

export function MonitoringAuditPage() {
  const [audit, setAudit] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/monitoring?section=audit")
      .then((r) => r.json())
      .then((d) => setAudit(d.audit ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <MonitoringShell description="سجل تدقيق ثابت — المالك: قراءة فقط">
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <Shield className="h-4 w-4" />
        لا يمكن للموظفين تعديل أو حذف سجل التدقيق. الحذف الدائم لمشرف المنصة فقط.
      </div>
      <div className="mb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open("/api/monitoring/export?type=audit&format=csv", "_blank")}
        >
          <Download className="h-4 w-4" />
          تصدير
        </Button>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-right text-xs">
              <th className="px-3 py-2">المصدر</th>
              <th className="px-3 py-2">الإجراء</th>
              <th className="px-3 py-2">التفاصيل</th>
              <th className="px-3 py-2">الفاعل</th>
              <th className="px-3 py-2">الوقت</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((a) => (
              <tr key={String(a.id)} className="border-b">
                <td className="px-3 py-2">{String(a.source)}</td>
                <td className="px-3 py-2 font-mono text-xs">{String(a.action)}</td>
                <td className="px-3 py-2 text-xs">{String(a.detail)}</td>
                <td className="px-3 py-2 text-xs">{String(a.actor ?? "—")}</td>
                <td className="px-3 py-2 text-xs">
                  {new Date(String(a.at)).toLocaleString("ar-SA")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </MonitoringShell>
  );
}
