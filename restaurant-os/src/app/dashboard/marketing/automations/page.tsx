"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function AutomationsPage() {
  const [rules, setRules] = useState<Array<{ id: string; labelAr: string; isEnabled: boolean; status?: string }>>([]);

  useEffect(() => {
    fetch("/api/marketing/command?section=automation").then((r) => r.json()).then((d) => setRules(d.rules ?? []));
  }, []);

  if (!rules.length) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title="Automation Center" desc="All rules OFF until enabled — no execution" />
      <p className="mb-4 rounded border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">جميع الأتمتة متوقفة حتى التفعيل الصريح</p>
      <MkCard className="mb-4 flex items-center justify-between border-emerald-800/40 bg-emerald-950/20">
        <div>
          <p className="font-medium text-emerald-100">أتمتة واتساب بعد الزيارة</p>
          <p className="text-xs text-emerald-200/80">SESSION_COMPLETED — شكر + تقييم بعد إنهاء الجلسة</p>
        </div>
        <a
          href="/dashboard/marketing/whatsapp?tab=automation"
          className="rounded border border-emerald-600 px-3 py-1.5 text-sm text-emerald-300 hover:bg-emerald-900/40"
        >
          إعداد في واتساب الأعمال
        </a>
      </MkCard>
      <div className="space-y-2">
        {rules.map((r) => (
          <MkCard key={r.id} className="flex items-center justify-between">
            <span>{r.labelAr}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs">{r.isEnabled ? "مفعل" : r.status ?? "غير مفعل"}</span>
              <MkBadge type="simulation" />
              <button type="button" disabled className="rounded border px-2 py-1 text-xs opacity-50">تفعيل</button>
            </div>
          </MkCard>
        ))}
      </div>
    </div>
  );
}
