"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { Button, Modal, LoadingSpinner } from "@/components/ui";
import { MediaUploader } from "@/components/media/media-uploader";
import {
  welcomeMessage,
  credentialsBlock,
} from "@/lib/restaurant-links";
import {
  LogIn,
  ExternalLink,
  Copy,
  KeyRound,
  User,
  Link2,
  MessageSquare,
  Shield,
} from "lucide-react";

export interface OwnerDetailsData {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    plan: string;
    status: string;
  };
  owner: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  links: {
    dashboardUrl: string;
    menuUrl: string;
    qrUrl: string;
    branchUrl: string;
  };
}

interface OwnerDetailsModalProps {
  restaurantId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function OwnerDetailsModal({
  restaurantId,
  onClose,
  onUpdated,
}: OwnerDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OwnerDetailsData | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  function load() {
    if (!restaurantId) return;
    setLoading(true);
    fetch(`/api/platform/restaurants/${restaurantId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLogoUrl(d.restaurant?.logoUrl || "");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (restaurantId) load();
  }, [restaurantId]);

  async function resetPassword() {
    if (!restaurantId) return;
    setActionLoading("reset");
    const res = await fetch(
      `/api/platform/restaurants/${restaurantId}/reset-password`,
      { method: "POST" }
    );
    const result = await res.json();
    setActionLoading("");
    if (!res.ok) {
      alert(result.error || "فشل إعادة التعيين");
      return;
    }
    setTempPassword(result.tempPassword);
  }

  async function loginAsOwner(openDashboard = false) {
    if (!restaurantId) return;
    setActionLoading(openDashboard ? "dashboard" : "login");

    try {
      if (tempPassword && data) {
        await signOut({ redirect: false });
        const result = await signIn("credentials", {
          email: data.owner.email,
          password: tempPassword,
          redirect: false,
        });
        if (result?.error) {
          alert("فشل تسجيل الدخول");
          return;
        }
        if (openDashboard) window.location.href = "/dashboard";
        else alert("✓ تم تسجيل الدخول كمالك");
        return;
      }

      const res = await fetch(
        `/api/platform/restaurants/${restaurantId}/impersonate`,
        { method: "POST" }
      );
      const { token } = await res.json();
      if (!res.ok || !token) {
        alert("فشل الدخول كمالك");
        return;
      }

      await signOut({ redirect: false });
      const result = await signIn("credentials", {
        impersonationToken: token,
        email: " ",
        password: " ",
        redirect: false,
      });
      if (result?.error) {
        alert("فشل فتح لوحة المالك");
        return;
      }
      if (openDashboard) window.location.href = "/dashboard";
      else alert("✓ تم تسجيل الدخول كمالك");
    } finally {
      setActionLoading("");
    }
  }

  async function saveLogo() {
    if (!restaurantId) return;
    setActionLoading("logo");
    await fetch(`/api/platform/restaurants/${restaurantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl }),
    });
    setActionLoading("");
    onUpdated?.();
    load();
  }

  const password = tempPassword || "(أعد تعيين كلمة المرور لعرضها)";

  const welcome = data
    ? welcomeMessage({
        restaurantName: data.restaurant.name,
        email: data.owner.email,
        password: tempPassword || password,
        dashboardUrl: data.links.dashboardUrl,
        menuUrl: data.links.menuUrl,
        qrUrl: data.links.qrUrl,
      })
    : "";

  const creds = data
    ? credentialsBlock({
        email: data.owner.email,
        password: tempPassword || password,
        dashboardUrl: data.links.dashboardUrl,
        menuUrl: data.links.menuUrl,
        qrUrl: data.links.qrUrl,
      })
    : "";

  return (
    <Modal
      open={!!restaurantId}
      onClose={onClose}
      title="تفاصيل المالك والمطعم"
    >
      {loading || !data ? (
        <LoadingSpinner />
      ) : (
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1 text-sm">
          <section className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <User className="h-4 w-4" /> بيانات المالك
            </h3>
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">المطعم</dt>
                <dd className="font-medium">{data.restaurant.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">اسم المالك</dt>
                <dd className="font-medium">{data.owner.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">البريد</dt>
                <dd className="font-mono text-xs" dir="ltr">
                  {data.owner.email}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">الدور</dt>
                <dd className="font-medium">{data.owner.role}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Link2 className="h-4 w-4" /> روابط المطعم
            </h3>
            <ul className="space-y-2 font-mono text-xs" dir="ltr">
              <li>
                <span className="text-gray-500">Dashboard: </span>
                <a href={data.links.dashboardUrl} className="text-emerald-700 underline" target="_blank" rel="noreferrer">
                  {data.links.dashboardUrl}
                </a>
              </li>
              <li>
                <span className="text-gray-500">Menu: </span>
                <a href={data.links.menuUrl} className="text-emerald-700 underline" target="_blank" rel="noreferrer">
                  {data.links.menuUrl}
                </a>
              </li>
              <li>
                <span className="text-gray-500">QR (Table 1): </span>
                <a href={data.links.qrUrl} className="text-emerald-700 underline" target="_blank" rel="noreferrer">
                  {data.links.qrUrl}
                </a>
              </li>
              <li>
                <span className="text-gray-500">Branch: </span>
                <a href={data.links.branchUrl} className="text-emerald-700 underline" target="_blank" rel="noreferrer">
                  {data.links.branchUrl}
                </a>
              </li>
            </ul>
          </section>

          <section className="rounded-lg border p-4">
            <h3 className="mb-2 font-semibold">شعار المطعم</h3>
            <MediaUploader
              mediaType="image"
              label="رفع الشعار"
              value={logoUrl}
              onChange={setLogoUrl}
              onClear={() => setLogoUrl("")}
              extraFormFields={{ restaurantId: data.restaurant.id }}
            />
            {logoUrl !== (data.restaurant.logoUrl || "") && (
              <Button
                size="sm"
                className="mt-2"
                loading={actionLoading === "logo"}
                onClick={saveLogo}
              >
                حفظ الشعار
              </Button>
            )}
          </section>

          {tempPassword && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="font-semibold text-amber-800">كلمة المرور الجديدة (تُعرض مرة واحدة)</p>
              <p className="mt-1 font-mono text-sm" dir="ltr">
                {tempPassword}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={async () => {
                  await copyText(tempPassword);
                  alert("تم النسخ");
                }}
              >
                <Copy className="h-3 w-3" /> نسخ كلمة المرور
              </Button>
            </div>
          )}

          <section className="rounded-lg border p-4">
            <h3 className="mb-2 flex items-center gap-2 font-semibold">
              <MessageSquare className="h-4 w-4" /> رسالة الترحيب
            </h3>
            <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs" dir="ltr">
              {welcome}
            </pre>
          </section>

          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/platform/restaurants/${data.restaurant.id}/permissions`}>
              <Button size="sm" variant="outline">
                <Shield className="h-4 w-4" />
                Permissions
              </Button>
            </Link>
            <Button
              size="sm"
              loading={actionLoading === "login"}
              onClick={() => loginAsOwner(false)}
            >
              <LogIn className="h-4 w-4" />
              Login as Owner
            </Button>
            <Button
              size="sm"
              loading={actionLoading === "dashboard"}
              onClick={() => loginAsOwner(true)}
            >
              <ExternalLink className="h-4 w-4" />
              Open Dashboard
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={actionLoading === "reset"}
              onClick={resetPassword}
            >
              <KeyRound className="h-4 w-4" />
              Reset Password
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await copyText(creds);
                alert("تم نسخ بيانات الدخول");
              }}
            >
              <Copy className="h-4 w-4" />
              Copy Credentials
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await copyText(welcome);
                alert("تم نسخ رسالة الترحيب");
              }}
            >
              <MessageSquare className="h-4 w-4" />
              Copy Welcome
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
