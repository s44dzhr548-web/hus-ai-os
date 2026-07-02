"use client";

import type { PriceDataStatus } from "@/lib/market/provider-manager/health";
import { useI18n } from "@/lib/i18n/context";

const TONES: Record<PriceDataStatus, string> = {
  live: "bg-emerald-500/20 text-emerald-300",
  delayed: "bg-sky-500/20 text-sky-300",
  cached: "bg-violet-500/20 text-violet-300",
  demo: "bg-amber-500/20 text-amber-300",
  estimated: "bg-zinc-700 text-zinc-300",
  unavailable: "bg-red-500/20 text-red-300",
};

export function PriceStatusBadge({ status }: { status: PriceDataStatus | string }) {
  const { t } = useI18n();
  const key = status as PriceDataStatus;
  const label = t.priceStatus[key] ?? status.toUpperCase();
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONES[key] ?? TONES.estimated}`}>
      {label}
    </span>
  );
}
