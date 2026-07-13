"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

const STEPS = [
  { n: 1, title: "Marketing Brain", href: "/dashboard/marketing/ai-brain/providers" },
  { n: 2, title: "مزود الصور", href: "/dashboard/marketing/creative/images/providers" },
  { n: 3, title: "مزود الفيديو", href: "/dashboard/marketing/creative/videos/providers" },
  { n: 4, title: "مزود الصوت", href: "/dashboard/marketing/creative/audio/providers" },
  { n: 5, title: "منصات الإعلان", href: "/dashboard/marketing/platforms/connect" },
  { n: 6, title: "افتراضي/احتياطي", href: "/dashboard/marketing/ai-brain/routing" },
  { n: 7, title: "حدود الإنفاق", href: "/dashboard/marketing/ai-costs" },
  { n: 8, title: "اختبار شامل", action: "test" },
];

export default function ConnectionWizardPage() {
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  async function runTest() {
    setLoading(true);
    const res = await fetch("/api/marketing/providers?section=wizard");
    setResult(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    if (STEPS[step]?.action === "test") runTest();
  }, [step]);

  return (
    <div>
      <MkPageHeader title="معالج ربط الخدمات" desc="8 خطوات — من Brain إلى اختبار شامل" />
      <div className="mb-6 flex gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setStep(i)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${step === i ? "bg-amber-600 text-white" : "bg-stone-800"}`}
          >
            {s.n}. {s.title}
          </button>
        ))}
      </div>
      <MkCard>
        {STEPS[step]?.action === "test" ? (
          loading ? <MkLoading /> : result ? (
            <div className="space-y-3 text-sm">
              <p className="font-semibold">نتيجة الاختبار</p>
              <pre className="overflow-x-auto rounded bg-stone-950 p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
              <p className="text-amber-400">{String(result.recommendation)}</p>
            </div>
          ) : null
        ) : (
          <>
            <p className="mb-4">الخطوة {STEPS[step]?.n}: {STEPS[step]?.title}</p>
            <Link href={STEPS[step]?.href ?? "#"} className="rounded bg-amber-600 px-4 py-2 text-sm text-white">
              فتح الإعداد
            </Link>
          </>
        )}
        <div className="mt-4 flex gap-2">
          <button type="button" disabled={step <= 0} onClick={() => setStep((s) => s - 1)} className="rounded border px-3 py-1 text-sm">السابق</button>
          <button type="button" disabled={step >= STEPS.length - 1} onClick={() => setStep((s) => s + 1)} className="rounded bg-amber-600 px-3 py-1 text-sm text-white">التالي</button>
        </div>
      </MkCard>
    </div>
  );
}
