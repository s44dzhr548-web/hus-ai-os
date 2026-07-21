"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MkBadge, MkCard, MkEmpty, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui";
import { fetchWithTimeout, isAbortError } from "@/lib/fetch-with-timeout";
import { CAMPAIGN_WORKFLOW_STATUSES, RESTAURANT_GOALS } from "@/lib/marketing/nav";

const FETCH_TIMEOUT_MS = 15000;

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  objective: string;
  audience: string;
  budget: number;
  platform: string;
  schedule: string;
  cta: string;
  approval: string;
};

function goalLabel(goal: string): string {
  const label = RESTAURANT_GOALS.find((g) => g.id === goal)?.labelAr;
  return label ?? (goal || "—");
}

function statusLabel(status: string): string {
  return CAMPAIGN_WORKFLOW_STATUSES.find((s) => s.id === status)?.labelAr ?? status;
}

function formatSchedule(start?: string | null, end?: string | null): string {
  if (!start && !end) return "—";
  const fmt = (d: string) => new Date(d).toLocaleDateString("ar-SA");
  if (start && end) return `${fmt(start)} — ${fmt(end)}`;
  return start ? fmt(start) : end ? fmt(end) : "—";
}

function mapCampaign(c: Record<string, unknown>): CampaignRow {
  const audienceJson = c.audienceJson as Record<string, unknown> | null;
  const audience =
    typeof audienceJson?.label === "string"
      ? audienceJson.label
      : c.ageMin || c.ageMax
        ? `${c.ageMin ?? "—"}–${c.ageMax ?? "—"}`
        : "—";

  const status = String(c.status ?? "DRAFT");
  return {
    id: String(c.id),
    name: String(c.name ?? "—"),
    status: statusLabel(status),
    objective: goalLabel(String(c.goal ?? "")),
    audience,
    budget: Number(c.budget ?? 0),
    platform: String(c.platform ?? "—"),
    schedule: formatSchedule(c.scheduleStart as string, c.scheduleEnd as string),
    cta: String(c.cta ?? "—"),
    approval: status === "APPROVED" || status === "ACTIVE" ? "موافَق عليه" : "بانتظار الموافقة",
  };
}

function resolveErrorMessage(res: Response | null, data: Record<string, unknown>, err: unknown): string {
  if (isAbortError(err)) {
    return "انتهت مهلة تحميل الحملات — تحقق من الاتصال وحاول مجدداً.";
  }
  if (res?.status === 401) {
    return "انتهت جلسة الدخول — سجّل الدخول مرة أخرى.";
  }
  if (res?.status === 403) {
    return typeof data.error === "string" ? data.error : "ليس لديك صلاحية الوصول لمركز التسويق.";
  }
  if (res?.status === 400) {
    return typeof data.error === "string" ? data.error : "لم يتم تحديد المطعم — اختر مطعماً من القائمة.";
  }
  if (res && res.status >= 500) {
    return typeof data.error === "string" ? data.error : "خطأ في الخادم — حاول مجدداً بعد قليل.";
  }
  if (res && !res.ok) {
    return typeof data.error === "string" ? data.error : "تعذّر تحميل الحملات.";
  }
  return "تعذّر تحميل الحملات — تحقق من الاتصال وحاول مجدداً.";
}

export default function CampaignBuilderPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let res: Response | null = null;
    let data: Record<string, unknown> = {};
    try {
      res = await fetchWithTimeout("/api/marketing/campaigns", { timeoutMs: FETCH_TIMEOUT_MS });
      data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setError(resolveErrorMessage(res, data, null));
        setCampaigns([]);
        return;
      }
      const list = Array.isArray(data.campaigns) ? data.campaigns : [];
      setCampaigns(list.map((c) => mapCampaign(c as Record<string, unknown>)));
    } catch (err) {
      setError(resolveErrorMessage(res, data, err));
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <MkLoading />;

  if (error) {
    return (
      <div>
        <MkPageHeader title="إدارة الحملات" desc="عرض وإدارة حملاتك الإعلانية" />
        <MkCard className="py-10 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <Button type="button" className="mt-4" onClick={() => void load()}>
            إعادة المحاولة
          </Button>
        </MkCard>
      </div>
    );
  }

  return (
    <div>
      <MkPageHeader title="إدارة الحملات" desc="عرض وإدارة حملاتك الإعلانية" />
      {!campaigns.length ? (
        <MkEmpty title="لا توجد حملات بعد — أنشئ حملتك الأولى" />
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <MkCard key={c.id}>
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-bold">{c.name}</h3>
                <div className="flex gap-2">
                  <span className="text-xs">{c.status}</span>
                  <MkBadge type="simulation" />
                </div>
              </div>
              <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                <div><dt className="opacity-60">Objective</dt><dd>{c.objective}</dd></div>
                <div><dt className="opacity-60">Audience</dt><dd>{c.audience}</dd></div>
                <div><dt className="opacity-60">Budget</dt><dd>{c.budget} ر.س</dd></div>
                <div><dt className="opacity-60">Platform</dt><dd>{c.platform}</dd></div>
                <div><dt className="opacity-60">Schedule</dt><dd>{c.schedule}</dd></div>
                <div><dt className="opacity-60">CTA</dt><dd>{c.cta}</dd></div>
                <div><dt className="opacity-60">Approval</dt><dd>{c.approval}</dd></div>
              </dl>
            </MkCard>
          ))}
        </div>
      )}
      <Link href="/dashboard/marketing/campaigns/new" className="mt-4 inline-block">
        <Button type="button">+ حملة جديدة</Button>
      </Link>
    </div>
  );
}
