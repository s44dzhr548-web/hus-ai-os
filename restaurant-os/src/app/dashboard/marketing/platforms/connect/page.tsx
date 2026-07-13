"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

interface AdPlatform {
  key: string;
  labelAr: string;
  status: string;
  oauthReady: boolean;
  developerSetupRequired: boolean;
  accountName: string | null;
  accountIdMasked: string | null;
  scopes: string[];
  tokenExpiresAt: string | null;
  lastSyncAt: string | null;
  oauthUrl: string | null;
}

export default function AdPlatformsConnectPage() {
  const [platforms, setPlatforms] = useState<AdPlatform[]>([]);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    fetch("/api/marketing/providers?section=ads")
      .then((r) => r.json())
      .then((d) => {
        setPlatforms(d.platforms ?? []);
        setCanManage(d.canManageSecrets);
      });
  }, []);

  if (!platforms.length) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title="ربط منصات الإعلان" desc="OAuth رسمي فقط — لا كلمات مرور" />
      <div className="grid gap-4 lg:grid-cols-2">
        {platforms.map((p) => (
          <MkCard key={p.key}>
            <div className="mb-2 flex justify-between">
              <h3 className="font-bold">{p.labelAr}</h3>
              <MkBadge type={p.status === "CONNECTED" ? "real" : "not_connected"} />
            </div>
            {p.developerSetupRequired && (
              <p className="mb-2 text-xs text-amber-400">يتطلب إعداد حساب المطور (Client ID/Secret في Staging)</p>
            )}
            {p.accountName && <p className="text-sm">الحساب: {p.accountName}</p>}
            {p.accountIdMasked && <p className="text-xs opacity-60">ID: {p.accountIdMasked}</p>}
            {p.scopes.length > 0 && <p className="text-xs opacity-60">صلاحيات: {p.scopes.join(", ")}</p>}
            {p.tokenExpiresAt && <p className="text-xs opacity-60">انتهاء الرمز: {new Date(p.tokenExpiresAt).toLocaleDateString("ar-SA")}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {canManage && p.oauthReady && p.oauthUrl && (
                <a href={p.oauthUrl} className="rounded bg-blue-700 px-3 py-1.5 text-xs text-white">
                  تسجيل الدخول والربط
                </a>
              )}
              {canManage && p.status === "CONNECTED" && (
                <>
                  <button type="button" disabled className="rounded border px-2 py-1 text-xs opacity-60">اختبار المزامنة</button>
                  <button type="button" disabled className="rounded border px-2 py-1 text-xs opacity-60">إعادة الربط</button>
                </>
              )}
            </div>
          </MkCard>
        ))}
      </div>
    </div>
  );
}
