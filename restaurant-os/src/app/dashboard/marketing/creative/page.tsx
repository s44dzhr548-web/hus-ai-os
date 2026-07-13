"use client";

import { useState } from "react";
import Link from "next/link";
import { MkBadge, MkCard, MkPageHeader } from "@/components/marketing/marketing-shell";
import { CREATIVE_TABS } from "@/lib/marketing/nav";

export default function CreativeStudioPage() {
  const [tab, setTab] = useState(0);
  const [provider, setProvider] = useState("");

  return (
    <div>
      <MkPageHeader title="Creative Studio" desc="Select provider before generate — Phase 2" />
      <MkCard className="mb-4">
        <label className="text-sm">مزود التوليد
          <select className="mt-1 w-full rounded border bg-transparent px-2 py-1" value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="">— اختر المزود —</option>
            <option value="image">Image provider</option>
            <option value="video">Video provider</option>
            <option value="copy">Copy provider</option>
          </select>
        </label>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Link href="/dashboard/marketing/creative/images/providers">صور</Link>
          <Link href="/dashboard/marketing/creative/videos/providers">فيديو</Link>
          <Link href="/dashboard/marketing/creative/copy/providers">نصوص</Link>
        </div>
      </MkCard>
      <div className="mb-4 flex gap-1 overflow-x-auto pb-2">
        {CREATIVE_TABS.map((t, i) => (
          <button key={t} type="button" onClick={() => setTab(i)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${tab === i ? "bg-amber-600 text-white" : "bg-stone-800"}`}>{t}</button>
        ))}
      </div>
      <MkCard className="py-16 text-center">
        <MkBadge type="simulation" />
        <p className="mt-2 text-sm opacity-60">{CREATIVE_TABS[tab]} — مسودة · {provider || "لم يُختر مزود"}</p>
        <button type="button" disabled={!provider} className="mt-4 rounded bg-amber-600 px-4 py-2 text-sm text-white disabled:opacity-40">توليد (Phase 2)</button>
      </MkCard>
    </div>
  );
}
