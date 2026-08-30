"use client";

import Link from "next/link";
import { MkCard, MkPageHeader } from "@/components/marketing/marketing-shell";
import { CREATIVE_TABS } from "@/lib/marketing/nav";

const STUDIO_LINKS = [
  {
    href: "/dashboard/marketing/creative/videos",
    title: "استوديو الفيديو",
    desc: "Runway · Veo · Kling · Luma · Pika · HeyGen · Hailuo",
  },
  {
    href: "/dashboard/marketing/creative/images",
    title: "استوديو الصور",
    desc: "OpenAI · Imagen · Ideogram · Leonardo",
  },
  {
    href: "/dashboard/marketing/creative/copy/providers",
    title: "نصوص إبداعية",
    desc: "OpenAI · Claude · Gemini",
  },
] as const;

export default function CreativeStudioPage() {
  return (
    <div dir="rtl" className="text-stone-100">
      <MkPageHeader
        title="Creative Studio"
        desc="اختر استوديو المحتوى — الفيديو يستخدم المزودين المتصلين من قاعدة البيانات"
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {CREATIVE_TABS.map((t) => (
          <span key={t} className="rounded-full bg-stone-800 px-3 py-1.5 text-xs text-stone-300">
            {t}
          </span>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STUDIO_LINKS.map((s) => (
          <Link key={s.href} href={s.href}>
            <MkCard className="h-full border-stone-700 bg-stone-950/80 transition hover:border-amber-600/50">
              <h3 className="font-bold text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-stone-400">{s.desc}</p>
              <p className="mt-3 text-xs text-amber-400">فتح الاستوديو →</p>
            </MkCard>
          </Link>
        ))}
      </div>
      <MkCard className="mt-6 border-stone-700 bg-stone-950/80">
        <p className="text-sm text-stone-300">
          لربط Runway أو غيره:{" "}
          <Link href="/dashboard/marketing/creative/videos/providers" className="text-amber-400 underline">
            مزودو توليد الفيديو
          </Link>
        </p>
      </MkCard>
    </div>
  );
}
