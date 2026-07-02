"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

export function DataModeBadge() {
  const { t } = useI18n();
  const [mode, setMode] = useState<string>("live");
  const [realMode, setRealMode] = useState(true);

  useEffect(() => {
    fetch("/api/market/providers/status")
      .then((r) => r.json())
      .then((d) => {
        setMode(d.runtimeMode ?? d.dataMode ?? "live");
        setRealMode(d.realMarketDataMode !== false);
      });
  }, []);

  const label = !realMode
    ? t.demoMode
    : mode === "live"
      ? t.market.liveData
      : mode === "mixed"
        ? t.market.mixedData
        : t.demoMode;

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs ${
        mode === "live" && realMode
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-300"
      }`}
    >
      {label}
    </span>
  );
}
