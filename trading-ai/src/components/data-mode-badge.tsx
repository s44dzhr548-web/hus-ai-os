"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

export function DataModeBadge() {
  const { t } = useI18n();
  const [mode, setMode] = useState<string>("mock");

  useEffect(() => {
    fetch("/api/compliance")
      .then((r) => r.json())
      .then((d) => setMode(d.dataMode ?? "mock"));
  }, []);

  const label =
    mode === "live" ? t.market.liveData : mode === "mixed" ? t.market.mixedData : t.demoMode;

  return (
    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
      {label}
    </span>
  );
}
