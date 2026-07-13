"use client";

import Link from "next/link";
import { MkCard, MkPageHeader } from "@/components/marketing/marketing-shell";

export function StudioShell({
  title,
  desc,
  providersHref,
  formats,
}: {
  title: string;
  desc: string;
  providersHref: string;
  formats: string[];
}) {
  return (
    <div>
      <MkPageHeader title={title} desc={desc} />
      <MkCard className="mb-4">
        <Link href={providersHref} className="text-sm text-amber-400">إدارة المزودات والمفاتيح →</Link>
        <p className="mt-2 text-xs opacity-60">لا توليد خارجي حتى ربط credentials صالحة</p>
      </MkCard>
      <div className="mb-4 flex flex-wrap gap-2">
        {formats.map((f) => (
          <span key={f} className="rounded-full bg-stone-800 px-3 py-1 text-xs">{f}</span>
        ))}
      </div>
      <MkCard className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Prompt<textarea className="mt-1 w-full rounded border bg-transparent px-2 py-1" rows={3} placeholder="وصف المحتوى…" /></label>
        <label className="text-sm">Negative prompt<textarea className="mt-1 w-full rounded border bg-transparent px-2 py-1" rows={2} /></label>
        <label className="text-sm">Aspect ratio<select className="mt-1 w-full rounded border bg-transparent px-2 py-1"><option>1:1</option><option>9:16</option><option>16:9</option></select></label>
        <label className="text-sm">Variations<input type="number" defaultValue={1} className="mt-1 w-full rounded border bg-transparent px-2 py-1" /></label>
        <p className="text-xs text-amber-500 sm:col-span-2">تقدير التكلفة · وقت التوليد · معاينة · مسودة · موافقة — Phase 2</p>
        <button type="button" disabled className="rounded bg-amber-600 px-4 py-2 text-sm text-white opacity-50 sm:col-span-2">توليد (يتطلب مزود متصل)</button>
      </MkCard>
    </div>
  );
}
