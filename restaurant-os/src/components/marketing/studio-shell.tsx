"use client";

import Link from "next/link";
import { MkCard, MkPageHeader } from "@/components/marketing/marketing-shell";
import { darkFieldClass } from "@/components/marketing/dark-form-controls";

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
    <div dir="rtl" className="text-stone-100">
      <MkPageHeader title={title} desc={desc} />
      <MkCard className="mb-4 border-stone-700 bg-stone-950/80">
        <Link href={providersHref} className="text-sm text-amber-400 hover:text-amber-300">
          إدارة المزودات والمفاتيح →
        </Link>
        <p className="mt-2 text-xs text-stone-400">اربط مزود الصور ثم استخدم الاستوديو المخصص عند التفعيل.</p>
      </MkCard>
      <div className="mb-4 flex flex-wrap gap-2">
        {formats.map((f) => (
          <span key={f} className="rounded-full bg-stone-800 px-3 py-1 text-xs text-stone-300">
            {f}
          </span>
        ))}
      </div>
      <MkCard className="grid gap-3 border-stone-700 bg-stone-950/80 sm:grid-cols-2">
        <label className="text-sm text-stone-200">
          Prompt
          <textarea
            className={`${darkFieldClass()} mt-1 min-h-[80px]`}
            rows={3}
            placeholder="وصف المحتوى…"
            disabled
          />
        </label>
        <label className="text-sm text-stone-200">
          Negative prompt
          <textarea className={`${darkFieldClass()} mt-1`} rows={2} disabled />
        </label>
        <p className="text-xs text-stone-500 sm:col-span-2">توليد الصور من الاستوديو — قريبًا. استخدم مزودي الصور للربط.</p>
        <button
          type="button"
          disabled
          className="rounded-lg bg-stone-700 px-4 py-2 text-sm text-stone-400 sm:col-span-2"
        >
          توليد الصور (يتطلب مزود متصل)
        </button>
      </MkCard>
    </div>
  );
}
