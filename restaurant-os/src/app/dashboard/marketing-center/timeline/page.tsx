"use client";

import { McCard } from "@/components/marketing-center/mc-shell";
import { TIMELINE_STEPS } from "@/lib/marketing-center/constants";
import { CheckCircle2, Circle } from "lucide-react";

const DONE = 4;

export default function TimelinePage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">الجدول الزمني</h1>
      <p className="mb-6 text-sm opacity-70">مسار حملة تسويقية — Phase 1</p>
      <div className="relative space-y-0">
        {TIMELINE_STEPS.map((s, i) => {
          const done = i < DONE;
          return (
            <div key={s.step} className="flex gap-4 pb-8">
              <div className="flex flex-col items-center">
                {done ? (
                  <CheckCircle2 className="h-6 w-6 text-amber-500" />
                ) : (
                  <Circle className="h-6 w-6 text-stone-600" />
                )}
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className={`mt-1 w-0.5 flex-1 min-h-[2rem] ${done ? "bg-amber-600/50" : "bg-stone-700"}`} />
                )}
              </div>
              <McCard className="flex-1">
                <p className="font-semibold">{s.labelAr}</p>
                <p className="text-xs opacity-50">{s.step}</p>
              </McCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}
