"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type PlatformCard = {
  key: string;
  labelAr: string;
  brandColor: string;
  logoLetter: string;
  status: "CONNECTED" | "NOT_CONNECTED" | "PENDING_SETUP";
  statusLabel: string;
  integrationReady: boolean;
  businessName: string | null;
  accountName: string | null;
  accountId: string | null;
  currency: string | null;
  timezone: string | null;
  lastSync: string | null;
};

export default function PlatformsClient() {
  const searchParams = useSearchParams();
  const [platforms, setPlatforms] = useState<PlatformCard[]>([]);
  const [canConnect, setCanConnect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/marketing/platforms");
    const data = await res.json();
    if (res.ok) {
      setPlatforms(data.platforms || []);
      setCanConnect(data.permissions?.canConnect ?? false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("success") === "1") setMessage("✓ Connected — تم ربط الحساب بنجاح");
    if (searchParams.get("error")) setMessage("تعذّر إكمال الربط — حاول مرة أخرى");
  }, [searchParams]);

  async function action(platform: string, act: string) {
    setBusy(`${platform}-${act}`);
    const res = await fetch("/api/marketing/platforms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act, platform }),
    });
    const data = await res.json();
    setBusy("");
    if (data.message) setMessage(data.message);
    if (data.platforms) setPlatforms(data.platforms);
    else await load();
  }

  if (loading) return <MkLoading />;

  return (
    <div className="space-y-6 pb-16">
      <MkPageHeader
        title="منصات الإعلان"
        desc="اربط حساباتك الإعلانية بضغطة واحدة — بدون إعدادات تقنية"
      />

      {message && (
        <p className="rounded-lg bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{message}</p>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {platforms.map((p) => {
          const connected = p.status === "CONNECTED";
          const pending = p.status === "PENDING_SETUP";

          return (
            <div
              key={p.key}
              className="rounded-2xl border border-stone-700/80 bg-stone-900/60 p-5 shadow-lg backdrop-blur"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-xl text-xl font-bold text-white shadow-md"
                    style={{ backgroundColor: p.brandColor }}
                  >
                    {p.logoLetter}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{p.labelAr}</h3>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                        connected
                          ? "bg-emerald-600/30 text-emerald-300"
                          : pending
                            ? "bg-amber-600/30 text-amber-300"
                            : "bg-red-600/20 text-red-300"
                      )}
                    >
                      {connected ? "Connected" : pending ? "بانتظار التفعيل" : "Not Connected"}
                    </span>
                  </div>
                </div>
              </div>

              {connected ? (
                <div className="mb-4 space-y-1.5 text-sm text-stone-300">
                  <p className="text-emerald-400 font-medium">✓ Connected</p>
                  {p.businessName && <p><span className="text-stone-500">Business:</span> {p.businessName}</p>}
                  {p.accountName && <p><span className="text-stone-500">Ad Account:</span> {p.accountName}</p>}
                  {p.accountId && <p dir="ltr"><span className="text-stone-500">Account ID:</span> {p.accountId}</p>}
                  {p.currency && <p><span className="text-stone-500">Currency:</span> {p.currency}</p>}
                  {p.timezone && <p><span className="text-stone-500">Timezone:</span> {p.timezone}</p>}
                  {p.lastSync && (
                    <p className="text-xs text-stone-500">
                      Last Sync: {new Date(p.lastSync).toLocaleString("ar-SA")}
                    </p>
                  )}
                </div>
              ) : pending ? (
                <p className="mb-4 text-sm text-stone-400">
                  يحتاج مسؤول المنصة لتفعيل الربط مرة واحدة فقط.
                </p>
              ) : (
                <p className="mb-4 text-sm text-stone-400">
                  اربط حسابك للبدء في إنشاء الحملات ومزامنة الأداء.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {canConnect && !pending && !connected && (
                  <a href={`/api/marketing/connections/${p.key.toLowerCase()}/oauth`}>
                    <Button size="sm">Connect Account</Button>
                  </a>
                )}
                {canConnect && pending && (
                  <>
                    <Button size="sm" variant="outline" loading={busy === `${p.key}-recheck`} onClick={() => load()}>
                      إعادة التحقق
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busy === `${p.key}-notify_admin`}
                      onClick={() => action(p.key, "notify_admin")}
                    >
                      إشعار مسؤول المنصة
                    </Button>
                  </>
                )}
                {canConnect && connected && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busy === `${p.key}-sync`}
                      onClick={() => action(p.key, "sync")}
                    >
                      Sync Now
                    </Button>
                    <a href={`/api/marketing/connections/${p.key.toLowerCase()}/oauth`}>
                      <Button size="sm" variant="outline">Reconnect</Button>
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busy === `${p.key}-disconnect`}
                      onClick={() => action(p.key, "disconnect")}
                    >
                      Disconnect
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/marketing/campaigns/new">
          <Button>Create Campaign</Button>
        </Link>
        <Link href="/dashboard/marketing/campaigns">
          <Button variant="outline">View Campaigns</Button>
        </Link>
      </div>
    </div>
  );
}
