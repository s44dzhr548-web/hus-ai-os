"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const META_CONNECT_HREF = "/api/integrations/meta/connect";

type PlatformCard = {
  key: string;
  labelAr: string;
  brandColor: string;
  logoLetter: string;
  status: string;
  statusLabel: string;
  connectionState?: string;
  connectionStateLabel?: string;
  integrationReady: boolean;
  showConnectButton?: boolean;
  connectUrl?: string | null;
  businessName: string | null;
  accountName: string | null;
  accountId: string | null;
  currency: string | null;
  timezone: string | null;
  lastSync: string | null;
  syncStatus?: string | null;
};

const STATE_BADGE_CLASS: Record<string, string> = {
  NOT_CONFIGURED: "bg-stone-600/30 text-stone-300",
  READY_TO_CONNECT: "bg-sky-600/30 text-sky-200",
  CONNECTING: "bg-amber-600/30 text-amber-200",
  CONNECTED: "bg-emerald-600/30 text-emerald-300",
  TOKEN_EXPIRED: "bg-orange-600/30 text-orange-200",
  ERROR: "bg-red-600/30 text-red-300",
  PENDING_SETUP: "bg-amber-600/30 text-amber-300",
  NOT_CONNECTED: "bg-red-600/20 text-red-300",
};

function badgeClass(p: PlatformCard): string {
  const state = p.connectionState || p.status;
  return STATE_BADGE_CLASS[state] ?? "bg-stone-600/30 text-stone-300";
}

function displayLabel(p: PlatformCard): string {
  return p.connectionStateLabel || p.statusLabel;
}

function metaConnectionState(p: PlatformCard): string {
  return p.connectionState || p.status;
}

function metaNeedsConnectButton(p: PlatformCard): boolean {
  const state = metaConnectionState(p);
  if (state === "NOT_CONFIGURED" || state === "CONNECTED" || state === "CONNECTING") {
    return false;
  }
  if (
    state === "READY_TO_CONNECT" ||
    state === "TOKEN_EXPIRED" ||
    state === "ERROR" ||
    p.showConnectButton
  ) {
    return true;
  }
  return state === "NOT_CONNECTED" && p.integrationReady;
}

function MetaAdsConnectLink({
  href,
  disabled,
  className,
}: {
  href: string;
  disabled?: boolean;
  className?: string;
}) {
  const classes = cn(
    "inline-flex w-full min-h-[44px] items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold shadow-md transition-colors",
    disabled
      ? "cursor-not-allowed bg-stone-700 text-stone-400 opacity-70"
      : "bg-[#0081FB] text-white hover:bg-[#006FE0] active:bg-[#005FC2]",
    className
  );

  if (disabled) {
    return (
      <span
        role="button"
        aria-disabled="true"
        data-testid="meta-ads-connect-button"
        className={classes}
      >
        ربط حساب Meta
      </span>
    );
  }

  return (
    <a
      href={href}
      data-testid="meta-ads-connect-button"
      className={classes}
    >
      ربط حساب Meta Ads
    </a>
  );
}

type PlatformsClientProps = {
  initialPlatforms?: PlatformCard[];
  initialCanConnect?: boolean;
  initialCanEdit?: boolean;
};

export default function PlatformsClient({
  initialPlatforms = [],
  initialCanConnect = false,
}: PlatformsClientProps) {
  const searchParams = useSearchParams();
  const [platforms, setPlatforms] = useState<PlatformCard[]>(initialPlatforms);
  const [canConnect, setCanConnect] = useState(initialCanConnect);
  const [loading, setLoading] = useState(initialPlatforms.length === 0);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAccounts, setPendingAccounts] = useState<Array<{
    accountId: string;
    accountName: string;
    businessName: string | null;
    currency: string | null;
  }>>([]);

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
    if (initialPlatforms.length === 0) {
      void load();
    }
  }, [initialPlatforms.length, load]);

  useEffect(() => {
    if (searchParams.get("success") === "1") setMessage("✓ تم ربط حساب Meta Ads بنجاح");
    const err = searchParams.get("error");
    if (err === "oauth_denied") setMessage("تم إلغاء تسجيل الدخول إلى Meta");
    else if (err === "oauth_failed") setMessage("خطأ في الربط — تحقق من Meta App ID وRedirect URI");
    else if (err) setMessage("تعذّر إكمال الربط — حاول مجدداً");
    if (searchParams.get("selectAccount") === "meta") {
      void fetch("/api/marketing/connections/meta/select-account")
        .then((r) => r.json())
        .then((d) => setPendingAccounts(d.accounts || []));
    }
  }, [searchParams]);

  async function selectAdAccount(accountId: string) {
    setBusy("select-account");
    const res = await fetch("/api/marketing/connections/meta/select-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    const data = await res.json();
    setBusy("");
    if (res.ok) {
      setPendingAccounts([]);
      setMessage(`✓ تم ربط حساب ${data.account?.accountName || accountId}`);
      await load();
    } else {
      setMessage(data.error || "تعذّر اختيار الحساب");
    }
  }

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

  function renderMetaActions(p: PlatformCard) {
    const state = metaConnectionState(p);
    const connectHref = p.connectUrl || META_CONNECT_HREF;

    if (state === "NOT_CONFIGURED") {
      return (
        <p className="text-sm text-stone-400">
          Meta Ads غير مهيأ — يحتاج مسؤول المنصة إعداد META_APP_ID وMETA_APP_SECRET.
        </p>
      );
    }

    if (state === "CONNECTING" || pendingAccounts.length > 0) {
      return (
        <p className="text-sm text-amber-200">جاري الربط — اختر حساب الإعلانات أدناه.</p>
      );
    }

    if (state === "CONNECTED") {
      return (
        <>
          <Button
            size="sm"
            variant="outline"
            loading={busy === `${p.key}-sync`}
            onClick={() => action(p.key, "sync")}
          >
            Sync Now
          </Button>
          {canConnect && (
            <>
              <a
                href={connectHref}
                className="inline-flex items-center justify-center rounded-lg border border-stone-500 bg-stone-800 px-3 py-1.5 text-sm font-medium text-stone-100 hover:bg-stone-700"
              >
                إعادة الربط
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
        </>
      );
    }

    if (metaNeedsConnectButton(p)) {
      return (
        <div className="w-full space-y-2">
          <MetaAdsConnectLink href={connectHref} disabled={!canConnect} />
          {!canConnect && (
            <p className="text-xs text-stone-500">صلاحية المالك أو المدير مطلوبة للربط.</p>
          )}
        </div>
      );
    }

    return null;
  }

  function renderGenericActions(p: PlatformCard) {
    const connected = p.status === "CONNECTED";
    const pending = p.status === "PENDING_SETUP";
    const connectHref = p.connectUrl || `/api/marketing/connections/${p.key.toLowerCase()}/oauth`;

    if (canConnect && !pending && !connected && p.integrationReady) {
      return (
        <a href={connectHref}>
          <Button size="sm">Connect Account</Button>
        </a>
      );
    }
    if (canConnect && pending) {
      return (
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
      );
    }
    if (canConnect && connected) {
      return (
        <>
          <Button size="sm" variant="outline" loading={busy === `${p.key}-sync`} onClick={() => action(p.key, "sync")}>
            Sync Now
          </Button>
          <a href={connectHref}>
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
      );
    }
    return null;
  }

  if (loading && platforms.length === 0) return <MkLoading />;

  return (
    <div className="space-y-6 pb-16">
      <MkPageHeader
        title="منصات الإعلان"
        desc="اربط حساباتك الإعلانية — Meta Ads عبر OAuth الرسمي"
      />

      {message && (
        <p className="rounded-lg bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{message}</p>
      )}

      {pendingAccounts.length > 0 && (
        <div className="rounded-2xl border border-amber-700/50 bg-amber-950/20 p-5">
          <h3 className="mb-3 font-semibold text-amber-100">اختر حساب الإعلانات</h3>
          <div className="space-y-2">
            {pendingAccounts.map((a) => (
              <button
                key={a.accountId}
                type="button"
                disabled={!!busy}
                onClick={() => void selectAdAccount(a.accountId)}
                className="flex w-full items-center justify-between rounded-lg bg-stone-900/80 px-4 py-3 text-start text-sm hover:bg-stone-800"
              >
                <span>
                  <span className="font-medium">{a.accountName}</span>
                  {a.businessName && <span className="block text-xs text-stone-400">{a.businessName}</span>}
                </span>
                <span className="text-xs text-stone-500" dir="ltr">{a.accountId}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {platforms.map((p) => {
          const isMeta = p.key === "META";
          const connected = p.connectionState === "CONNECTED" || p.status === "CONNECTED";
          const showMetaConnect = isMeta && metaNeedsConnectButton(p);

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
                        badgeClass(p)
                      )}
                    >
                      {displayLabel(p)}
                    </span>
                  </div>
                </div>
              </div>

              {connected ? (
                <div className="mb-4 space-y-1.5 text-sm text-stone-300">
                  {p.businessName && <p><span className="text-stone-500">Business:</span> {p.businessName}</p>}
                  {p.accountName && <p><span className="text-stone-500">Ad Account:</span> {p.accountName}</p>}
                  {p.accountId && <p dir="ltr"><span className="text-stone-500">Account ID:</span> {p.accountId}</p>}
                  {p.currency && <p><span className="text-stone-500">Currency:</span> {p.currency}</p>}
                  {p.lastSync && (
                    <p className="text-xs text-stone-500">
                      Last Sync: {new Date(p.lastSync).toLocaleString("ar-SA")}
                    </p>
                  )}
                </div>
              ) : isMeta && metaConnectionState(p) === "NOT_CONFIGURED" ? (
                <p className="mb-4 text-sm text-stone-400">
                  أضف متغيرات META_APP_ID وMETA_APP_SECRET وMETA_ADS_REDIRECT_URI على الخادم.
                </p>
              ) : showMetaConnect ? (
                <p className="mb-4 text-sm text-stone-400">
                  OAuth جاهز — اضغط الزر أدناه لبدء ربط حساب Meta Ads.
                </p>
              ) : !connected ? (
                <p className="mb-4 text-sm text-stone-400">
                  {p.integrationReady
                    ? "اربط حسابك للبدء في إنشاء الحملات."
                    : "يحتاج مسؤول المنصة لتفعيل الربط."}
                </p>
              ) : null}

              <div className={cn("flex flex-wrap gap-2", showMetaConnect && "w-full")}>
                {isMeta ? renderMetaActions(p) : renderGenericActions(p)}
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
