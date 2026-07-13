"use client";

import { STATUS_LEGEND } from "@/lib/table-status";

export function TableStatusLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
      data-testid="table-status-legend"
    >
      <span className="font-medium text-slate-600">الحالة:</span>
      {STATUS_LEGEND.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: s.color }}
          />
          <span>{s.emoji}</span>
          <span className="text-slate-700">{s.labelAr}</span>
        </span>
      ))}
    </div>
  );
}
