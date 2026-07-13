"use client";

import { useEffect, useState } from "react";
import { MonitoringShell } from "@/components/monitoring/monitoring-shell";
import { Button, Card, LoadingSpinner } from "@/components/ui";
import { Download } from "lucide-react";

export function MonitoringLoginHistoryPage() {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/monitoring?section=login-history")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <MonitoringShell description="سجل دخول/خروج الموظفين — غير قابل للتعديل">
      <div className="mb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open("/api/monitoring/export?type=login-history&format=csv", "_blank")}
        >
          <Download className="h-4 w-4" />
          تصدير
        </Button>
      </div>
      <Card className="divide-y p-0">
        {logs.map((l) => (
          <div key={String(l.id)} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <span className="font-medium">{String(l.staffName || "—")}</span>
            <span className={l.action === "LOGIN" ? "text-emerald-600" : "text-slate-500"}>
              {l.action === "LOGIN" ? "دخول" : "خروج"}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(String(l.createdAt)).toLocaleString("ar-SA")}
            </span>
          </div>
        ))}
      </Card>
    </MonitoringShell>
  );
}
