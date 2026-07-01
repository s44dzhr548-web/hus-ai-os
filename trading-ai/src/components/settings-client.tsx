"use client";

import { LanguageSwitcher } from "./language-switcher";
import { useI18n } from "@/lib/i18n/context";

export function SettingsClient() {
  const { t } = useI18n();

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
      </section>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.settings.compliance}</h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-400">
          <li>✓ {t.settings.paperOnly}</li>
          <li>✓ {t.settings.brokerDisabled}</li>
          <li>✓ {t.disclaimer.body}</li>
        </ul>
      </section>
    </div>
  );
}
