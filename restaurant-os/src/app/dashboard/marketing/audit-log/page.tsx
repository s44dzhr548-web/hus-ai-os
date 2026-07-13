"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<Array<{ action: string; entityType?: string; createdAt: string; label?: string }>>([]);

  useEffect(() => {
    fetch("/api/marketing/command?section=audit").then((r) => r.json()).then((d) => setLogs(d.logs ?? []));
  }, []);

  if (!logs.length) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title="سجل التدقيق" desc="Connection · Key update · Provider change · Generation" />
      <div className="space-y-2">
        {logs.map((l, i) => (
          <MkCard key={i} className="flex flex-wrap justify-between gap-2 text-sm">
            <span>{l.action} · {l.entityType ?? "—"}</span>
            <div className="flex gap-2">
              <span className="text-xs opacity-60">{new Date(l.createdAt).toLocaleString("ar-SA")}</span>
              <MkBadge type={l.label === "بيانات فعلية" ? "demo" : "simulation"} />
            </div>
          </MkCard>
        ))}
      </div>
    </div>
  );
}
