"use client";

import { useEffect, useState } from "react";
import type { EventImpactItem } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";

export function EventImpactClient() {
  const { t, locale } = useI18n();
  const [events, setEvents] = useState<EventImpactItem[]>([]);

  useEffect(() => {
    fetch("/api/intelligence/event-impact")
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []));
  }, []);

  if (!events.length) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2 text-start">
      {events.map((ev) => (
        <article key={ev.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">{locale === "ar" ? ev.driverAr : ev.driverEn}</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {ev.impacts.map((imp, i) => (
              <li key={i} className="flex justify-between">
                <span>{locale === "ar" ? imp.targetAr : imp.targetEn}</span>
                <span className={imp.direction === "up" ? "text-emerald-400" : imp.direction === "down" ? "text-red-400" : "text-zinc-400"}>
                  {(imp.score * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-zinc-500">{locale === "ar" ? ev.summaryAr : ev.summaryEn}</p>
        </article>
      ))}
    </div>
  );
}
