"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { MARKETING_AGENTS } from "@/lib/marketing/nav";

export default function AiBrainHubPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/marketing/command?section=brain").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title="AI Marketing Brain" desc="OpenAI · Claude · Gemini · Mistral · DeepSeek · Grok · Perplexity" />
      <MkCard className="mb-4">
        <p className="text-sm">افتراضي: {String((data.features as Record<string, string>)?.defaultAi ?? "—")}</p>
        <p className="text-sm">احتياطي: {String((data.features as Record<string, string>)?.fallbackAi ?? "—")}</p>
        <p className="mt-2 text-xs text-amber-500">{String(data.label)}</p>
      </MkCard>
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MARKETING_AGENTS.map((a) => (
          <MkCard key={a.id} className="text-xs">{a.labelAr}</MkCard>
        ))}
      </div>
      <Link href="/dashboard/marketing/ai-brain/providers" className="inline-block rounded bg-amber-600 px-4 py-2 text-sm text-white">
        إدارة المزودات والمفاتيح
      </Link>
      <Link href="/dashboard/marketing/ai-brain/routing" className="mr-3 inline-block rounded border px-4 py-2 text-sm">
        توجيه المزودات
      </Link>
    </div>
  );
}
