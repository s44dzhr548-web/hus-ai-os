"use client";

import { useEffect, useState } from "react";
import type { AutoPaperBotStatus } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { StatCard, Badge } from "./trading-shell";

export function AutoBotClient() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<AutoPaperBotStatus | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/bot/status");
    setStatus(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function post(path: string) {
    setLoading(true);
    const res = await fetch(path, { method: "POST" });
    setStatus(await res.json());
    setLoading(false);
  }

  if (!status) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90">{t.autoBot.disclaimer}</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => post("/api/bot/run")} disabled={loading} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50">
          {loading ? t.common.loading : t.autoBot.runNow}
        </button>
        <button type="button" onClick={() => post("/api/bot/start")} className="rounded-lg border border-emerald-700 px-4 py-2 text-sm">{t.autoBot.start}</button>
        <button type="button" onClick={() => post("/api/bot/stop")} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">{t.autoBot.stop}</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard label={t.autoBot.status} value={status.running ? t.autoBot.active : t.autoBot.paused} sub={t.autoBot.demoMode} />
        <StatCard label={t.autoBot.schedule} value={`${status.scheduleMinutes}m`} sub={status.nextRunAt ? new Date(status.nextRunAt).toLocaleString() : "—"} />
        <StatCard label={t.autoBot.maxTrades} value={String(status.maxTradesPerDay)} sub={`${status.tradesToday} ${t.autoBot.tradesToday}`} />
        <StatCard label={t.autoBot.positions} value={String(status.openPositions)} />
        <StatCard label={t.autoBot.pnl} value={`${status.todayPnlPct}%`} />
        <StatCard label={t.autoBot.emergencyStop} value={status.emergencyStop ? "ON" : "OFF"} />
      </div>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.autoBot.activityLog}</h3>
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm">
          {status.activityLog.map((log) => (
            <li key={log.id} className="rounded-lg bg-zinc-950/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={log.success ? "buy" : "sell"}>{log.action}</Badge>
                <span className="text-xs text-zinc-500">{new Date(log.at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-zinc-400">{locale === "ar" ? log.detailAr : log.detailEn}</p>
              {log.symbol && <p className="text-xs text-zinc-600">{log.symbol}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
