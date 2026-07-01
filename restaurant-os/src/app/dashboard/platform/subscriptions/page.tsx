"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Button,
  Input,
  Select,
  Modal,
  LoadingSpinner,
  Badge,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { Crown, Settings2, Pause, Play, CalendarPlus, Shield } from "lucide-react";

interface PlanRow {
  id: string;
  label: string;
  price: number;
  limits: Record<string, unknown>;
}

interface RestaurantSub {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  owner: { name: string | null; email: string };
  subscription: {
    plan: string;
    status: string;
    startDate: string;
    endDate?: string | null;
    limitOverrides?: Record<string, unknown> | null;
  } | null;
  usage: { branches: number; tables: number; categories: number };
  limits: Record<string, number | boolean | null>;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "نشط",
  TRIAL: "تجريبي",
  SUSPENDED: "معلق",
  EXPIRED: "منتهي",
  CANCELLED: "ملغي",
  PAST_DUE: "متأخر",
};

const PLAN_LABELS: Record<string, string> = {
  FREE: "مجاني",
  BASIC: "أساسي",
  PRO: "احترافي",
  ENTERPRISE: "مؤسسات",
};

export default function PlatformSubscriptionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RestaurantSub | null>(null);
  const [actionLoading, setActionLoading] = useState("");
  const [extendDays, setExtendDays] = useState("30");
  const [overrideBranch, setOverrideBranch] = useState("");

  function load() {
    fetch("/api/platform/subscriptions")
      .then((r) => r.json())
      .then((data) => {
        setPlans(data.plans || []);
        setRestaurants(data.restaurants || []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.isPlatformAdmin) load();
  }, [session]);

  async function patchSubscription(
    restaurantId: string,
    body: Record<string, unknown>
  ) {
    setActionLoading(restaurantId + (body.action as string));
    await fetch("/api/platform/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, ...body }),
    });
    setActionLoading("");
    load();
    if (selected?.id === restaurantId) {
      const res = await fetch("/api/platform/subscriptions");
      const data = await res.json();
      setSelected(data.restaurants?.find((r: RestaurantSub) => r.id === restaurantId) || null);
    }
  }

  if (status === "loading" || loading) return <LoadingSpinner />;
  if (!session?.user?.isPlatformAdmin) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow">
        <p className="text-gray-600">ليس لديك صلاحية الوصول.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الاشتراكات والصلاحيات</h1>
        <p className="text-sm text-gray-500">إدارة خطط المطاعم والحدود والتعليق</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-xl bg-white p-4 shadow ring-1 ring-gray-100">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-emerald-600" />
              <h3 className="font-bold">{plan.label}</h3>
            </div>
            <p className="mt-1 text-sm text-gray-500">{plan.id}</p>
            <ul className="mt-3 space-y-1 text-xs text-gray-600">
              <li>فروع: {String(plan.limits.branches ?? "∞")}</li>
              <li>طاولات: {String(plan.limits.tables ?? "∞")}</li>
              <li>تصنيفات: {String(plan.limits.categories ?? "∞")}</li>
              <li>منتجات: {String(plan.limits.items ?? "∞")}</li>
              <li>فيديو: {plan.limits.video ? "✓" : "✗"}</li>
              <li>واتساب: {plan.limits.whatsapp ? "✓" : "✗"}</li>
              <li>تحليلات: {plan.limits.analytics ? "✓" : "✗"}</li>
            </ul>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow">
        <table className="w-full min-w-[960px] text-right text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3">المطعم</th>
              <th className="px-4 py-3">المالك</th>
              <th className="px-4 py-3">الخطة</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3">الانتهاء</th>
              <th className="px-4 py-3">الاستخدام</th>
              <th className="px-4 py-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-gray-600">{r.owner.email}</td>
                <td className="px-4 py-3">
                  {PLAN_LABELS[r.subscription?.plan || "FREE"] || r.subscription?.plan}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      r.subscription?.status === "ACTIVE" || r.subscription?.status === "TRIAL"
                        ? "success"
                        : "danger"
                    }
                  >
                    {STATUS_LABELS[r.subscription?.status || "TRIAL"] || r.subscription?.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.subscription?.endDate
                    ? formatDate(r.subscription.endDate)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {r.usage.branches}ف · {r.usage.tables}ط · {r.usage.categories}ت
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                      <Settings2 className="h-3 w-3" /> إدارة
                    </Button>
                    <Link href={`/dashboard/platform/restaurants/${r.id}/permissions`}>
                      <Button size="sm" variant="outline">
                        <Shield className="h-3 w-3" /> Permissions
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `اشتراك: ${selected.name}` : ""}
      >
        {selected && (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">الخطة الحالية</dt>
                <dd className="font-bold">
                  {PLAN_LABELS[selected.subscription?.plan || "FREE"]}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">تاريخ البداية</dt>
                <dd>
                  {selected.subscription?.startDate
                    ? formatDate(selected.subscription.startDate)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">تاريخ الانتهاء</dt>
                <dd>
                  {selected.subscription?.endDate
                    ? formatDate(selected.subscription.endDate)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">حالة المطعم</dt>
                <dd>{selected.isActive ? "نشط" : "معلق"}</dd>
              </div>
            </dl>

            <div className="rounded-lg bg-gray-50 p-3 text-xs">
              <p className="font-semibold">الاستخدام / الحد</p>
              <p>
                فروع {selected.usage.branches}/{String(selected.limits.branches ?? "∞")} · طاولات{" "}
                {selected.usage.tables}/{String(selected.limits.tables ?? "∞")} · تصنيفات{" "}
                {selected.usage.categories}/{String(selected.limits.categories ?? "∞")}
              </p>
            </div>

            <Select
              label="ترقية / تخفيض"
              defaultValue={selected.subscription?.plan || "FREE"}
              onChange={(e) =>
                patchSubscription(selected.id, {
                  action:
                    ["FREE", "BASIC"].includes(e.target.value) &&
                    ["PRO", "ENTERPRISE"].includes(selected.subscription?.plan || "")
                      ? "downgrade"
                      : "upgrade",
                  plan: e.target.value,
                })
              }
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                loading={actionLoading === selected.id + "suspend"}
                onClick={() => patchSubscription(selected.id, { action: "suspend" })}
              >
                <Pause className="h-3 w-3" /> تعليق
              </Button>
              <Button
                size="sm"
                variant="outline"
                loading={actionLoading === selected.id + "activate"}
                onClick={() => patchSubscription(selected.id, { action: "activate" })}
              >
                <Play className="h-3 w-3" /> تفعيل
              </Button>
              <div className="flex items-end gap-2">
                <Input
                  label="تمديد (أيام)"
                  type="number"
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  className="w-24"
                />
                <Button
                  size="sm"
                  loading={actionLoading === selected.id + "extend"}
                  onClick={() =>
                    patchSubscription(selected.id, {
                      action: "extend",
                      extendDays: parseInt(extendDays) || 30,
                    })
                  }
                >
                  <CalendarPlus className="h-3 w-3" /> تمديد
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <p className="mb-2 font-semibold">تجاوز الحدود (Override)</p>
              <Input
                label="حد الفروع (اتركه فارغاً للافتراضي)"
                type="number"
                value={overrideBranch}
                onChange={(e) => setOverrideBranch(e.target.value)}
              />
              <Button
                size="sm"
                className="mt-2"
                loading={actionLoading === selected.id + "override"}
                onClick={() =>
                  patchSubscription(selected.id, {
                    action: "override",
                    limitOverrides: {
                      ...(selected.subscription?.limitOverrides || {}),
                      ...(overrideBranch
                        ? { branches: parseInt(overrideBranch) }
                        : {}),
                    },
                  })
                }
              >
                حفظ التجاوز
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
