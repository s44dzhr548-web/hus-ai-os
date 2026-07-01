"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Input,
  Select,
  Modal,
  LoadingSpinner,
  Badge,
} from "@/components/ui";
import { OwnerDetailsModal } from "@/components/platform/owner-details-modal";
import { formatDate } from "@/lib/utils";
import { STATUS_LABELS, statusBadgeVariant } from "@/lib/subscription-display";
import type { SubscriptionStatus } from "@prisma/client";
import {
  Plus,
  LogIn,
  ExternalLink,
  User,
  Shield,
  Play,
  Pause,
  CalendarPlus,
  Rocket,
} from "lucide-react";

interface RestaurantRow {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  isActive: boolean;
  owner: { id: string; name: string; email: string };
  plan: string;
  status: string;
  startDate: string;
  endDate: string | null;
  daysRemaining: number | null;
  isExpired: boolean;
  expiryLabel: string;
  branches: number;
  createdAt: string;
}

interface Plan {
  id: string;
  label: string;
  price: number;
}

interface CreatedOwner {
  email: string;
  password: string;
  restaurantId: string;
  loginVerified: boolean;
  onboardingUrl?: string;
  links?: {
    dashboardUrl: string;
    menuUrl: string;
    qrUrl: string;
  };
}

export default function PlatformAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<{
    stats: {
      restaurants: number;
      users: number;
      ordersToday: number;
      mrr: number;
      activeSubscriptions: number;
      trialSubscriptions: number;
    };
    restaurants: RestaurantRow[];
    plans: Plan[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rowAction, setRowAction] = useState("");
  const [testingLogin, setTestingLogin] = useState(false);
  const [createdOwner, setCreatedOwner] = useState<CreatedOwner | null>(null);
  const [planDraft, setPlanDraft] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    restaurantName: "",
    restaurantNameAr: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    phone: "",
    plan: "FREE",
    trialDays: "14",
  });

  function load() {
    fetch("/api/platform")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        const drafts: Record<string, string> = {};
        (d.restaurants || []).forEach((r: RestaurantRow) => {
          drafts[r.id] = r.plan;
        });
        setPlanDraft(drafts);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.isPlatformAdmin) return;
    load();
  }, [session]);

  async function patchRestaurant(
    restaurantId: string,
    body: Record<string, unknown>
  ) {
    setRowAction(restaurantId + (body.action as string));
    const res = await fetch("/api/platform", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, ...body }),
    });
    setRowAction("");
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "فشل التحديث");
      return;
    }
    load();
  }

  async function openRestaurantDashboard(restaurantId: string) {
    setRowAction(restaurantId + "-dash");
    try {
      const res = await fetch("/api/restaurants/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      if (!res.ok) throw new Error("switch failed");
      window.location.href = "/dashboard/onboarding";
    } catch {
      alert("فشل فتح لوحة المطعم");
    } finally {
      setRowAction("");
    }
  }

  async function impersonateOwner(restaurantId: string) {
    setRowAction(restaurantId + "-onboard");
    try {
      const res = await fetch(`/api/platform/restaurants/${restaurantId}/impersonate`, {
        method: "POST",
      });
      const { token } = await res.json();
      if (!res.ok || !token) throw new Error("impersonate failed");

      await signOut({ redirect: false });
      const result = await signIn("credentials", {
        impersonationToken: token,
        email: " ",
        password: " ",
        redirect: false,
      });
      if (result?.error) throw new Error("signin failed");

      window.location.href = "/dashboard/onboarding";
    } catch {
      alert("فشل الدخول كمالك");
    } finally {
      setRowAction("");
    }
  }

  async function createRestaurant(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/platform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantName: form.restaurantName,
        restaurantNameAr: form.restaurantNameAr,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        phone: form.phone,
        plan: form.plan,
        trialDays: parseInt(form.trialDays) || 14,
        password: form.ownerPassword || undefined,
        testLogin: true,
      }),
    });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) {
      alert(result.error || "فشل الإنشاء");
      return;
    }

    setCreatedOwner({
      email: result.ownerEmail,
      password: result.tempPassword,
      restaurantId: result.restaurantId,
      loginVerified: result.loginVerified,
      onboardingUrl: result.onboardingUrl,
      links: result.links,
    });
    setModalOpen(false);
    setForm({
      restaurantName: "",
      restaurantNameAr: "",
      ownerName: "",
      ownerEmail: "",
      ownerPassword: "",
      phone: "",
      plan: "FREE",
      trialDays: "14",
    });
    load();
  }

  async function testOwnerLogin() {
    if (!createdOwner) return;
    setTestingLogin(true);
    try {
      await signOut({ redirect: false });
      const result = await signIn("credentials", {
        email: createdOwner.email,
        password: createdOwner.password,
        redirect: false,
      });
      if (result?.error) {
        alert("تعذر تسجيل الدخول كمالك");
        return;
      }
      window.location.href = createdOwner.onboardingUrl || "/dashboard/onboarding";
    } finally {
      setTestingLogin(false);
    }
  }

  if (status === "loading" || loading) return <LoadingSpinner />;
  if (!session?.user?.isPlatformAdmin) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow">
        <p className="text-gray-600">ليس لديك صلاحية الوصول لإدارة المنصة.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المنصة — Phase 1</h1>
          <p className="text-sm text-gray-500">
            إنشاء المطاعم · تفعيل الاشتراكات · إدارة الخطط والتجربة
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/platform/billing">
            <Button variant="outline" size="sm">الإيرادات</Button>
          </Link>
          <Link href="/dashboard/platform/security">
            <Button variant="outline" size="sm">الأمان</Button>
          </Link>
          <Link href="/dashboard/platform/subscriptions">
            <Button variant="outline" size="sm">الاشتراكات</Button>
          </Link>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة مطعم
          </Button>
        </div>
      </div>

      {createdOwner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-semibold text-emerald-800">تم إنشاء المطعم — جاهز للتأهيل</p>
          <p className="mt-2 font-mono text-xs" dir="ltr">Email: {createdOwner.email}</p>
          <p className="font-mono text-xs" dir="ltr">Password: {createdOwner.password}</p>
          {createdOwner.links && (
            <div className="mt-2 space-y-1 font-mono text-xs" dir="ltr">
              <p>Menu: {createdOwner.links.menuUrl}</p>
              <p>QR: {createdOwner.links.qrUrl}</p>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" loading={testingLogin} onClick={testOwnerLogin}>
              <Rocket className="h-4 w-4" /> Open Onboarding
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDetailsId(createdOwner.restaurantId)}>
              <User className="h-4 w-4" /> Owner Details
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCreatedOwner(null)}>إغلاق</Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "المطاعم", value: data?.stats.restaurants ?? 0 },
          { label: "اشتراكات نشطة", value: data?.stats.activeSubscriptions ?? 0 },
          { label: "تجريبي", value: data?.stats.trialSubscriptions ?? 0 },
          { label: "المستخدمون", value: data?.stats.users ?? 0 },
          { label: "طلبات اليوم", value: data?.stats.ordersToday ?? 0 },
          { label: "MRR (ر.س)", value: data?.stats.mrr ?? 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-4 shadow">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow">
        <table className="w-full min-w-[1200px] text-right text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-3">المطعم</th>
              <th className="px-3 py-3">المالك</th>
              <th className="px-3 py-3">الخطة</th>
              <th className="px-3 py-3">حالة الاشتراك</th>
              <th className="px-3 py-3">انتهاء الاشتراك</th>
              <th className="px-3 py-3">المطعم</th>
              <th className="px-3 py-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {data?.restaurants.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-3">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.slug}</p>
                </td>
                <td className="px-3 py-3 text-xs text-gray-600">{r.owner.email}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <Select
                      value={planDraft[r.id] || r.plan}
                      onChange={(e) => setPlanDraft({ ...planDraft, [r.id]: e.target.value })}
                      className="min-w-[100px] text-xs"
                    >
                      {data.plans.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={rowAction === r.id + "set_plan"}
                      onClick={() =>
                        patchRestaurant(r.id, {
                          action: "set_plan",
                          plan: planDraft[r.id] || r.plan,
                        })
                      }
                    >
                      حفظ
                    </Button>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={statusBadgeVariant(r.status as SubscriptionStatus, r.isExpired)}>
                    {STATUS_LABELS[r.status as keyof typeof STATUS_LABELS] || r.status}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-xs">
                  {r.endDate ? formatDate(r.endDate) : "—"}
                  <p className={r.isExpired ? "text-red-600" : "text-gray-500"}>{r.expiryLabel}</p>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={r.isActive ? "success" : "danger"}>
                    {r.isActive ? "مفعّل" : "معطّل"}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" loading={rowAction === r.id + "activate"} onClick={() => patchRestaurant(r.id, { action: "activate" })} title="تفعيل"><Play className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" loading={rowAction === r.id + "disable"} onClick={() => patchRestaurant(r.id, { action: "disable" })} title="تعطيل"><Pause className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" loading={rowAction === r.id + "extend_trial"} onClick={() => patchRestaurant(r.id, { action: "extend_trial", trialDays: 14 })} title="تمديد 14 يوم"><CalendarPlus className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => setDetailsId(r.id)}><User className="h-3 w-3" /></Button>
                    <Link href={`/dashboard/platform/restaurants/${r.id}/permissions`}><Button size="sm" variant="outline"><Shield className="h-3 w-3" /></Button></Link>
                    <Button size="sm" variant="outline" loading={rowAction === r.id + "-onboard"} onClick={() => impersonateOwner(r.id)}><Rocket className="h-3 w-3" /></Button>
                    <Button size="sm" loading={rowAction === r.id + "-dash"} onClick={() => openRestaurantDashboard(r.id)}><ExternalLink className="h-3 w-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OwnerDetailsModal restaurantId={detailsId} onClose={() => setDetailsId(null)} onUpdated={load} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة مطعم جديد">
        <form onSubmit={createRestaurant} className="space-y-4">
          <Input label="اسم المطعم (إنجليزي)" value={form.restaurantName} onChange={(e) => setForm({ ...form, restaurantName: e.target.value })} required />
          <Input label="اسم المطعم (عربي)" value={form.restaurantNameAr} onChange={(e) => setForm({ ...form, restaurantNameAr: e.target.value })} />
          <Input label="اسم المالك" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} required />
          <Input label="بريد المالك" type="email" dir="ltr" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} required />
          <Input label="كلمة مرور المالك (اختياري)" type="text" dir="ltr" value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} />
          <Input label="الجوال" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label="الخطة الابتدائية" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
            {data?.plans.map((p) => (
              <option key={p.id} value={p.id}>{p.label} — {p.price} ر.س</option>
            ))}
          </Select>
          <Input label="أيام التجربة" type="number" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} />
          <Button type="submit" className="w-full" loading={saving}>إنشاء المطعم وحساب المالك</Button>
        </form>
      </Modal>
    </div>
  );
}
