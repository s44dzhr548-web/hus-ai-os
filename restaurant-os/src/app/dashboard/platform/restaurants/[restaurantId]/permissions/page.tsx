"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button, Input, LoadingSpinner, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import {
  ArrowRight,
  RotateCcw,
  Save,
  Shield,
  History,
} from "lucide-react";

interface PermissionData {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    owner: { name: string | null; email: string };
  };
  subscription: {
    plan: string;
    status: string;
  } | null;
  planLabel: string;
  planDefaults: Record<string, number | boolean | null>;
  overrides: Record<string, number | boolean | null> | null;
  effective: Record<string, number | boolean | null>;
  usage: {
    branches: number;
    tables: number;
    categories: number;
    items: number;
    storageMb: number;
  };
  fields: {
    limits: { key: string; label: string; unit: string }[];
    features: { key: string; label: string }[];
  };
  auditLog: {
    id: string;
    createdAt: string;
    user: { name: string | null; email: string } | null;
    metadata: {
      reset?: boolean;
      changes?: {
        field: string;
        fieldLabel: string;
        oldDisplay: string;
        newDisplay: string;
      }[];
    };
  }[];
}

const PLAN_LABELS: Record<string, string> = {
  FREE: "مجاني",
  BASIC: "أساسي",
  PRO: "احترافي",
  ENTERPRISE: "مؤسسات",
};

function displayLimit(value: number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "∞";
  return String(value);
}

export default function RestaurantPermissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.restaurantId as string;

  const [data, setData] = useState<PermissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [limitDraft, setLimitDraft] = useState<Record<string, string>>({});
  const [featureDraft, setFeatureDraft] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    if (!restaurantId) return;
    setLoading(true);
    fetch(`/api/platform/restaurants/${restaurantId}/permissions`)
      .then((r) => r.json())
      .then((d: PermissionData) => {
        setData(d);
        const limits: Record<string, string> = {};
        for (const field of d.fields.limits) {
          const override = d.overrides?.[field.key];
          if (override !== undefined && override !== null) {
            limits[field.key] = String(override);
          } else {
            limits[field.key] = "";
          }
        }
        setLimitDraft(limits);

        const features: Record<string, boolean> = {};
        for (const field of d.fields.features) {
          features[field.key] = Boolean(d.effective[field.key]);
        }
        setFeatureDraft(features);
      })
      .finally(() => setLoading(false));
  }, [restaurantId]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.isPlatformAdmin) load();
  }, [session, load]);

  async function savePermissions() {
    if (!data) return;
    setSaving(true);

    const res = await fetch(
      `/api/platform/restaurants/${restaurantId}/permissions`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limits: limitDraft, features: featureDraft }),
      }
    );

    setSaving(false);
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "فشل الحفظ");
      return;
    }
    load();
  }

  async function resetToDefaults() {
    if (!confirm("إعادة جميع الصلاحيات إلى افتراضيات الخطة؟")) return;
    setResetting(true);
    const res = await fetch(
      `/api/platform/restaurants/${restaurantId}/permissions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      }
    );
    setResetting(false);
    if (!res.ok) {
      alert("فشل إعادة التعيين");
      return;
    }
    load();
  }

  if (status === "loading" || loading) return <LoadingSpinner />;
  if (!session?.user?.isPlatformAdmin) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow">
        <p className="text-gray-600">ليس لديك صلاحية الوصول.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow">
        <p className="text-gray-600">المطعم غير موجود.</p>
      </div>
    );
  }

  const plan = data.subscription?.plan || "FREE";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/platform"
            className="mb-2 inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline"
          >
            <ArrowRight className="h-4 w-4" />
            العودة لإدارة المنصة
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Shield className="h-6 w-6 text-emerald-600" />
            صلاحيات المطعم
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {data.restaurant.name} — {data.restaurant.owner.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">
            الخطة: {PLAN_LABELS[plan] || data.planLabel}
          </Badge>
          <Button
            variant="outline"
            loading={resetting}
            onClick={resetToDefaults}
          >
            <RotateCcw className="h-4 w-4" />
            Reset To Plan Defaults
          </Button>
          <Button loading={saving} onClick={savePermissions}>
            <Save className="h-4 w-4" />
            حفظ الصلاحيات
          </Button>
        </div>
      </div>

      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
        يمكنك تفعيل أو تعطيل أي ميزة وتغيير أي حد بغض النظر عن الخطة. اترك حقل
        الحد فارغاً لاستخدام افتراضي الخطة (
        {PLAN_LABELS[plan]}).
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow ring-1 ring-gray-100">
          <h2 className="mb-4 font-bold text-gray-900">حدود الاستخدام</h2>
          <div className="space-y-4">
            {data.fields.limits.map((field) => {
              const used =
                data.usage[field.key as keyof typeof data.usage] ?? 0;
              const planDefault = data.planDefaults[field.key];
              const isOverridden =
                data.overrides?.[field.key] !== undefined &&
                data.overrides?.[field.key] !== null;

              return (
                <div key={field.key} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-medium">{field.label}</span>
                    <span className="text-xs text-gray-500">
                      مستخدم: {used} · افتراضي الخطة:{" "}
                      {displayLimit(planDefault as number | null)}
                      {isOverridden && (
                        <Badge variant="warning" className="mr-2">
                          مخصص
                        </Badge>
                      )}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    placeholder={`افتراضي: ${displayLimit(planDefault as number | null)}`}
                    value={limitDraft[field.key] ?? ""}
                    onChange={(e) =>
                      setLimitDraft({ ...limitDraft, [field.key]: e.target.value })
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow ring-1 ring-gray-100">
          <h2 className="mb-4 font-bold text-gray-900">الميزات</h2>
          <div className="space-y-2">
            {data.fields.features.map((field) => {
              const planDefault = Boolean(data.planDefaults[field.key]);
              const isOverridden =
                data.overrides?.[field.key] !== undefined &&
                data.overrides?.[field.key] !== planDefault;

              return (
                <label
                  key={field.key}
                  className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                >
                  <div>
                    <span className="font-medium">{field.label}</span>
                    <p className="text-xs text-gray-500">
                      افتراضي {PLAN_LABELS[plan]}:{" "}
                      {planDefault ? "مفعّل" : "معطّل"}
                      {isOverridden && " · مخصص"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-gray-300 text-emerald-600"
                    checked={featureDraft[field.key] ?? false}
                    onChange={(e) =>
                      setFeatureDraft({
                        ...featureDraft,
                        [field.key]: e.target.checked,
                      })
                    }
                  />
                </label>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-xl bg-white p-5 shadow ring-1 ring-gray-100">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
          <History className="h-5 w-5" />
          سجل التغييرات
        </h2>
        {data.auditLog.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد تغييرات مسجلة بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2">التاريخ</th>
                  <th className="px-3 py-2">المستخدم</th>
                  <th className="px-3 py-2">الحقل</th>
                  <th className="px-3 py-2">القيمة السابقة</th>
                  <th className="px-3 py-2">القيمة الجديدة</th>
                </tr>
              </thead>
              <tbody>
                {data.auditLog.flatMap((entry) => {
                  const changes = entry.metadata?.changes || [];
                  if (changes.length === 0) {
                    return [
                      <tr key={entry.id} className="border-t">
                        <td className="px-3 py-2 text-xs">
                          {formatDate(entry.createdAt)}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {entry.user?.name || entry.user?.email || "—"}
                        </td>
                        <td colSpan={3} className="px-3 py-2 text-xs text-gray-500">
                          {entry.metadata?.reset
                            ? "إعادة تعيين لافتراضيات الخطة"
                            : "—"}
                        </td>
                      </tr>,
                    ];
                  }
                  return changes.map((change, idx) => (
                    <tr key={`${entry.id}-${idx}`} className="border-t">
                      {idx === 0 && (
                        <>
                          <td
                            className="px-3 py-2 text-xs align-top"
                            rowSpan={changes.length}
                          >
                            {formatDate(entry.createdAt)}
                          </td>
                          <td
                            className="px-3 py-2 text-xs align-top"
                            rowSpan={changes.length}
                          >
                            {entry.user?.name || entry.user?.email || "—"}
                          </td>
                        </>
                      )}
                      <td className="px-3 py-2">{change.fieldLabel}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {change.oldDisplay}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {change.newDisplay}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
