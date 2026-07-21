"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  PageHeader,
  Card,
  Button,
  LoadingSpinner,
  Badge,
  Input,
} from "@/components/ui";
import { RESTAURANT_AI_ROLES } from "@/lib/restaurant-ai-access/constants";

type Dashboard = {
  title: string;
  restaurantId?: string;
  openAiStatus: string;
  openAiModel: string;
  servicePaused: boolean;
  enabledServices: { id: string; labelAr: string }[];
  usage: {
    dailyRequests: number;
    monthlyRequests: number;
    estimatedMonthlyCostSar: number;
  };
  limits: {
    dailyRequestLimit: number;
    monthlyRequestLimit: number;
    monthlyCostLimitSar: number;
  };
  remaining: {
    dailyRequests: number;
    monthlyRequests: number;
    monthlyCostSar: number;
  };
};

export default function RestaurantAiSettingsPage() {
  const { data: session } = useSession();
  const isPlatformAdmin = Boolean(session?.user?.isPlatformAdmin);
  const [data, setData] = useState<Dashboard | null>(null);
  const [restaurantId, setRestaurantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [dailyLimit, setDailyLimit] = useState("200");
  const [monthlyLimit, setMonthlyLimit] = useState("3000");
  const [costLimit, setCostLimit] = useState("500");

  const load = useCallback(async () => {
    setLoading(true);
    const url = isPlatformAdmin && restaurantId
      ? `/api/restaurants/ai-access?restaurantId=${encodeURIComponent(restaurantId)}`
      : "/api/restaurants/ai-access";
    const res = await fetch(url);
    const json = await res.json();
    if (res.ok) {
      setData(json);
      if (json.restaurantId) setRestaurantId(json.restaurantId);
      setEditRoles(json.enabledServices?.map((s: { id: string }) => s.id) ?? []);
      setDailyLimit(String(json.limits?.dailyRequestLimit ?? 200));
      setMonthlyLimit(String(json.limits?.monthlyRequestLimit ?? 3000));
      setCostLimit(String(json.limits?.monthlyCostLimitSar ?? 500));
    }
    setLoading(false);
  }, [isPlatformAdmin, restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveConfig() {
    if (!isPlatformAdmin || !restaurantId) return;
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/restaurants/ai-access", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        enabledRoles: editRoles,
        dailyRequestLimit: Number(dailyLimit),
        monthlyRequestLimit: Number(monthlyLimit),
        monthlyCostLimitSar: Number(costLimit),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok) {
      setData(json);
      setMsg("تم حفظ إعدادات AI Access");
    } else {
      setMsg(json.error || "فشل الحفظ");
    }
  }

  async function togglePause(paused: boolean) {
    if (!isPlatformAdmin || !restaurantId) return;
    setSaving(true);
    const res = await fetch("/api/restaurants/ai-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, servicePaused: paused }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg(paused ? "تم إيقاف الخدمة" : "تم تفعيل الخدمة");
      load();
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div dir="rtl">
      <PageHeader
        title="الذكاء الاصطناعي"
        description="AI Access — استخدام OpenAI المركزي من AI Brain (بدون مفتاح في حساب المطعم)"
      />
      <p className="mb-4 text-sm text-stone-500">
        <Link href="/dashboard/settings" className="underline">
          ← الإعدادات
        </Link>
      </p>

      {msg && (
        <p className="mb-3 rounded-lg border border-emerald-700/40 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-200">
          {msg}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">حالة OpenAI</h3>
          <div className="space-y-2 text-sm">
            <p>
              الحالة:{" "}
              <Badge variant={data?.openAiStatus === "متصل" ? "success" : "danger"}>
                {data?.openAiStatus ?? "—"}
              </Badge>
            </p>
            <p>الموديل: {data?.openAiModel ?? "—"}</p>
            <p>
              الخدمة:{" "}
              {data?.servicePaused ? (
                <span className="text-red-400">موقوفة</span>
              ) : (
                <span className="text-emerald-400">نشطة</span>
              )}
            </p>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">الخدمات المفعلة</h3>
          {data?.enabledServices?.length ? (
            <ul className="space-y-1 text-sm">
              {data.enabledServices.map((s) => (
                <li key={s.id}>✓ {s.labelAr}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">لا توجد خدمات مفعّلة</p>
          )}
          <p className="mt-3 text-xs text-stone-500">
            مهندس المنصة الذكي غير متاح على مستوى المطعم — مالك المنصة فقط.
          </p>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">الاستخدام</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>اليوم: {data?.usage.dailyRequests ?? 0} طلب</p>
            <p>الشهر: {data?.usage.monthlyRequests ?? 0} طلب</p>
            <p>التكلفة التقديرية: {data?.usage.estimatedMonthlyCostSar ?? 0} ر.س</p>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">الحد المتبقي</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>يومي: {data?.remaining.dailyRequests ?? 0} طلب</p>
            <p>شهري: {data?.remaining.monthlyRequests ?? 0} طلب</p>
            <p>تكلفة: {data?.remaining.monthlyCostSar ?? 0} ر.س</p>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            الحدود: {data?.limits.dailyRequestLimit} / يوم · {data?.limits.monthlyRequestLimit} / شهر ·{" "}
            {data?.limits.monthlyCostLimitSar} ر.س
          </p>
        </Card>
      </div>

      {isPlatformAdmin && (
        <Card className="mt-6 max-w-2xl">
          <h3 className="mb-3 font-semibold">إدارة AI Access (Platform Owner)</h3>
          <p className="mb-4 text-xs text-stone-500">المطعم: {restaurantId || "—"}</p>
          <div className="mb-4 space-y-2">
            {RESTAURANT_AI_ROLES.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editRoles.includes(r.id)}
                  onChange={(e) =>
                    setEditRoles(
                      e.target.checked
                        ? [...editRoles, r.id]
                        : editRoles.filter((x) => x !== r.id)
                    )
                  }
                />
                {r.labelAr}
              </label>
            ))}
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Input
              label="حد يومي"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              dir="ltr"
            />
            <Input
              label="حد شهري"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              dir="ltr"
            />
            <Input
              label="حد التكلفة (ر.س)"
              value={costLimit}
              onChange={(e) => setCostLimit(e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveConfig} loading={saving}>
              حفظ الصلاحيات والحدود
            </Button>
            <Button
              variant="outline"
              onClick={() => togglePause(true)}
              disabled={saving || data?.servicePaused}
            >
              إيقاف الخدمة
            </Button>
            <Button
              variant="outline"
              onClick={() => togglePause(false)}
              disabled={saving || !data?.servicePaused}
            >
              تفعيل الخدمة
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
