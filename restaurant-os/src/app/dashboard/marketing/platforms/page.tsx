"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Array<Record<string, string | number>>>([]);

  useEffect(() => {
    fetch("/api/marketing/data?section=platforms")
      .then((r) => r.json())
      .then(setPlatforms);
  }, []);

  if (!platforms.length) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title="أداء المنصات" desc="Meta · TikTok · Snapchat · Google" />
      <div className="grid gap-4 lg:grid-cols-2">
        {platforms.filter((p) => ["META", "TIKTOK", "SNAPCHAT", "GOOGLE"].includes(String(p.key))).map((p) => (
          <MkCard key={String(p.key)}>
            <div className="mb-2 flex justify-between">
              <h3 className="font-bold">{p.labelAr}</h3>
              <MkBadge type="not_connected" />
            </div>
            <dl className="grid grid-cols-2 gap-1 text-xs">
              <dt>الميزانية</dt><dd>{p.budget} ر.س</dd>
              <dt>الإنفاق</dt><dd>{p.spend} ر.س</dd>
              <dt>عملاء</dt><dd>{p.customers}</dd>
              <dt>حجوزات</dt><dd>{p.reservations}</dd>
              <dt>طلبات</dt><dd>{p.orders}</dd>
              <dt>إيراد</dt><dd>{p.revenue} ر.س</dd>
              <dt>CPA</dt><dd>{p.cpa} ر.س</dd>
              <dt>ROI</dt><dd>{p.roi}%</dd>
              <dt>ROAS</dt><dd>{p.roas}</dd>
              <dt>ثقة</dt><dd>{p.confidence}%</dd>
            </dl>
            <p className="mt-2 text-[10px] text-amber-500">{p.status} · {p.label}</p>
          </MkCard>
        ))}
      </div>
    </div>
  );
}
