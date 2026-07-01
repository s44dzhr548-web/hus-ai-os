"use client";

import { useEffect, useState } from "react";
import type { Alert } from "@/types/trading";
import { RiskBadge } from "./trading-shell";

export function AlertsClient() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [meta, setMeta] = useState<{ emailNote?: string; whatsappStructure?: unknown[] }>({});

  useEffect(() => {
    fetch("/api/alerts").then((r) => r.json()).then((d) => {
      setAlerts(d.alerts ?? []);
      setMeta(d);
    });
  }, []);

  async function markRead(id: string) {
    await fetch("/api/alerts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setAlerts((a) => a.map((x) => (x.id === id ? { ...x, read: true } : x)));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
        <p>Dashboard alerts: active · Email: structure ready (SMTP pending) · WhatsApp: payload structure ready (API key pending)</p>
        {meta.emailNote && <p className="mt-1 text-xs text-zinc-500">{meta.emailNote}</p>}
      </div>
      <ul className="space-y-3">
        {alerts.map((a) => (
          <li
            key={a.id}
            className={`rounded-xl border p-4 ${a.read ? "border-zinc-800/50 bg-zinc-900/30 opacity-60" : "border-zinc-700 bg-zinc-900/60"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{a.message}</p>
              </div>
              <div className="flex items-center gap-2">
                <RiskBadge level={a.severity} />
                <span className="text-xs text-zinc-500">{a.channel}</span>
                {a.whatsappReady && <span className="text-xs text-emerald-500">WhatsApp-ready</span>}
                {!a.read && (
                  <button type="button" onClick={() => markRead(a.id)} className="text-xs text-emerald-400 hover:underline">
                    Mark read
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
