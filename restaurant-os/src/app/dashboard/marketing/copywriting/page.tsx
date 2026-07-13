"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function CopywritingPage() {
  const [data, setData] = useState<{ formats?: Array<{ id: string; labelAr: string }>; providers?: unknown[] } | null>(null);

  useEffect(() => {
    fetch("/api/marketing/command?section=copy").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title="AI Copywriting" desc="Meta · Instagram · TikTok · Google · WhatsApp · Email" />
      <Link href="/dashboard/marketing/creative/copy/providers" className="mb-4 inline-block text-sm text-amber-400">مزودو الكتابة →</Link>
      <div className="grid gap-3 lg:grid-cols-2">
        {(data.formats ?? []).map((f) => (
          <MkCard key={f.id}>
            <div className="mb-2 flex justify-between"><span>{f.labelAr}</span><MkBadge type="simulation" /></div>
            <textarea className="w-full rounded border bg-transparent px-2 py-1 text-sm" rows={3} placeholder="مسودة…" disabled />
            <button type="button" disabled className="mt-2 rounded border px-2 py-1 text-xs opacity-50">توليد (Simulation Mode)</button>
          </MkCard>
        ))}
      </div>
    </div>
  );
}
