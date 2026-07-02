"use client";

import { useEffect, useState } from "react";
import { LanguageSwitcher } from "./language-switcher";
import { useI18n } from "@/lib/i18n/context";
import type { DataAdapter } from "@/types/trading";

export function SettingsClient() {
  const { t } = useI18n();
  const [providers, setProviders] = useState<DataAdapter[]>([]);

  useEffect(() => {
    fetch("/api/compliance")
      .then((r) => r.json())
      .then((d) => setProviders(d.adapters ?? []));
  }, []);

  return (
    <div className="space-y-6 text-start">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.settings.language}</h3>
        <p className="mt-1 text-sm text-zinc-500">{t.settings.languageHint}</p>
        <div className="mt-4">
          <LanguageSwitcher />
        </div>
      </section>
      <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <h3 className="font-medium">{t.settings.demoMode}</h3>
        <p className="mt-2 text-sm text-zinc-400">{t.settings.demoDesc}</p>
        <p className="mt-2 text-xs text-amber-300">🔒 {t.settings.locked}</p>
      </section>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.settings.providers}</h3>
        <ul className="mt-4 space-y-3">
          {providers.map((p) => (
            <li key={p.id} className="rounded-lg border border-zinc-800/80 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs uppercase text-zinc-500">{p.status}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{p.description}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.settings.compliance}</h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-400">
          <li>✓ {t.settings.paperOnly}</li>
          <li>✓ {t.settings.brokerDisabled}</li>
          <li>✓ {t.settings.auditLog}</li>
          <li>✓ {t.disclaimer.body}</li>
        </ul>
      </section>
    </div>
  );
}
