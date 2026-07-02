"use client";

import { useCallback, useEffect, useState } from "react";
import type { AutoPaperBotStatus } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { StatCard, Badge } from "./trading-shell";

export function AutoBotClient() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<AutoPaperBotStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/bot/status");
    setStatus(await res.json());
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  async function post(path: string, body?: Record<string, unknown>) {
    setLoading(true);
    const res = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setStatus(await res.json());
    setLoading(false);
  }

  if (!status) return <p className="text-zinc-500">{t.common.loading}</p>;

  const lifecycleLabel =
    status.lifecycleStatus === "running"
      ? t.autoBot.active
      : status.lifecycleStatus === "paused"
        ? t.autoBot.paused
        : status.lifecycleStatus === "error"
          ? t.autoBot.error
          : t.autoBot.stopped;

  return (
    <div className="space-y-6 text-start">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90">{t.autoBot.disclaimer}</div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => post("/api/bot/run")}
          disabled={loading || status.emergencyStop}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"
        >
          {loading ? t.common.loading : t.autoBot.runNow}
        </button>
        <button type="button" onClick={() => post("/api/bot/start")} disabled={loading} className="rounded-lg border border-emerald-700 px-4 py-2 text-sm">
          {t.autoBot.start}
        </button>
        <button type="button" onClick={() => post("/api/bot/stop")} disabled={loading} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">
          {t.autoBot.stop}
        </button>
        <button type="button" onClick={() => post("/api/bot", { action: "pause" })} disabled={loading} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">
          {t.autoBot.pause}
        </button>
        <button type="button" onClick={() => post("/api/bot", { action: "resume" })} disabled={loading} className="rounded-lg border border-sky-700 px-4 py-2 text-sm">
          {t.autoBot.resume}
        </button>
        <button
          type="button"
          onClick={() => post("/api/bot", { action: status.emergencyStop ? "clear_emergency" : "emergency_stop", active: true })}
          disabled={loading}
          className="rounded-lg border border-red-700 bg-red-950/30 px-4 py-2 text-sm text-red-200"
        >
          {status.emergencyStop ? t.autoBot.clearEmergency : t.autoBot.emergencyStopBtn}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard label={t.autoBot.status} value={lifecycleLabel} sub={t.autoBot.demoMode} />
        <StatCard label={t.autoBot.schedule} value={`${status.scheduleMinutes}m`} sub={status.nextRunAt ? new Date(status.nextRunAt).toLocaleString() : "—"} />
        <StatCard label={t.autoBot.lastRun} value={status.lastRunAt ? new Date(status.lastRunAt).toLocaleTimeString() : "—"} sub={t.autoBot.cronStatus} />
        <StatCard label={t.autoBot.maxTrades} value={String(status.maxTradesPerDay)} sub={`${status.tradesToday} ${t.autoBot.tradesToday}`} />
        <StatCard label={t.autoBot.positions} value={String(status.openPositions)} />
        <StatCard label={t.autoBot.pnl} value={`${status.todayPnlPct}%`} />
        <StatCard label={t.autoBot.emergencyStop} value={status.emergencyStop ? "ON" : "OFF"} />
        <StatCard label={t.autoBot.storage} value={status.storageBackend} sub={status.cronEnabled ? t.autoBot.cronOn : t.autoBot.cronOff} />
      </div>

      {status.lastError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="font-medium">{t.autoBot.lastError}</p>
          <p className="mt-1 text-red-200/80">{status.lastError}</p>
          <p className="mt-1 text-xs text-red-300/60">
            {t.autoBot.retries}: {status.consecutiveErrors}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">{t.autoBot.guardian}</h3>
          <p className="mt-2 text-sm text-zinc-400">
            {status.guardian.canTrade ? t.autoBot.guardianOk : status.guardian.blockedReasons.join(" · ")}
          </p>
          <ul className="mt-3 space-y-1 text-xs text-zinc-500">
            <li>{t.autoBot.sl}: {status.maxRiskPerTradePct}%</li>
            <li>{t.autoBot.dailyLoss}: {status.dailyLossLimitPct}%</li>
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">{t.autoBot.lastScan}</h3>
          <p className="mt-2 text-sm text-zinc-400">
            {status.lastScannedSymbols.length ? status.lastScannedSymbols.join(", ") : "—"}
          </p>
          {status.lastTrade && (
            <p className="mt-2 text-xs text-zinc-500">
              {t.autoBot.lastTrade}: {status.lastTrade.side.toUpperCase()} {status.lastTrade.symbol} ·{" "}
              {new Date(status.lastTrade.at).toLocaleString()}
            </p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium">{t.autoBot.activityLog}</h3>
          <button type="button" onClick={load} className="text-xs text-zinc-500 hover:text-zinc-300">
            {t.autoBot.refresh}
          </button>
        </div>
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
