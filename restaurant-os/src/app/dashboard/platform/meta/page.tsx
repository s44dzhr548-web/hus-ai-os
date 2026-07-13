"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input, Card, LoadingSpinner, Badge } from "@/components/ui";
import { ArrowRight, CheckCircle2, XCircle, Bell } from "lucide-react";

type HealthItem = { id: string; label: string; ok: boolean; detail: string };
type Alert = { id: string; title: string; message: string; createdAt: string };

type MetaView = {
  facebookAppName: string | null;
  clientId: string | null;
  hasClientSecret: boolean;
  redirectUri: string;
  webhookUrl: string;
  hasWebhookVerifyToken: boolean;
  configSource: string;
  oauthReady: boolean;
  encryptionReady: boolean;
  pendingAlerts: Alert[];
  health: HealthItem[];
};

export default function PlatformMetaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [testResult, setTestResult] = useState("");
  const [view, setView] = useState<MetaView | null>(null);
  const [form, setForm] = useState({
    facebookAppName: "",
    clientId: "",
    clientSecret: "",
    webhookVerifyToken: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/platform/meta");
    const data = await res.json();
    if (res.ok) {
      setView(data);
      setForm({
        facebookAppName: data.facebookAppName || "",
        clientId: data.clientId || "",
        clientSecret: "",
        webhookVerifyToken: "",
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.isPlatformAdmin) load();
  }, [session]);

  async function save() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/platform/meta", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error || "فشل الحفظ");
      return;
    }
    setView(data);
    setForm((f) => ({ ...f, clientSecret: "", webhookVerifyToken: "" }));
    setMessage("تم حفظ إعدادات Meta");
  }

  async function testConnection() {
    setTesting(true);
    setTestResult("");
    const res = await fetch("/api/platform/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test_connection" }),
    });
    const data = await res.json();
    setTesting(false);
    setTestResult(data.ok ? `✓ ${data.message}${data.appName ? ` (${data.appName})` : ""}` : `✗ ${data.message}`);
    if (data.health) setView((v) => (v ? { ...v, health: data.health } : v));
  }

  if (status === "loading" || loading) return <LoadingSpinner />;
  if (!session?.user?.isPlatformAdmin) {
    return <div className="rounded-xl bg-white p-8 text-center shadow">Access denied</div>;
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/platform" className="inline-flex items-center gap-1 text-sm text-emerald-700">
        <ArrowRight className="h-4 w-4" /> إدارة المنصة
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">إعداد Meta / WhatsApp</h1>
        <p className="mt-1 text-sm text-gray-600">لوحة مسؤول المنصة — بيانات OAuth و Webhook (Super Admin)</p>
      </div>

      {view?.pendingAlerts && view.pendingAlerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2 font-medium text-amber-900">
            <Bell className="h-4 w-4" /> طلبات تفعيل من المطاعم
          </div>
          <ul className="space-y-2 text-sm">
            {view.pendingAlerts.map((a) => (
              <li key={a.id} className="rounded bg-white/80 px-3 py-2">
                <strong>{a.title}</strong> — {a.message}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Facebook App</h2>
        <label className="block text-sm">
          <span className="text-gray-600">اسم التطبيق (اختياري)</span>
          <Input
            value={form.facebookAppName}
            onChange={(e) => setForm({ ...form, facebookAppName: e.target.value })}
            className="mt-1"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Client ID</span>
          <Input
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            className="mt-1 font-mono text-sm"
            dir="ltr"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">
            Client Secret {view?.hasClientSecret && "(محفوظ — اتركه فارغاً للإبقاء على القيمة الحالية)"}
          </span>
          <Input
            type="password"
            value={form.clientSecret}
            onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
            placeholder={view?.hasClientSecret ? "••••••••" : ""}
            className="mt-1 font-mono text-sm"
            dir="ltr"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Redirect URI (للنسخ إلى Meta Developer Console)</span>
          <Input readOnly value={view?.redirectUri || ""} className="mt-1 font-mono text-xs" dir="ltr" />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Webhook URL</span>
          <Input readOnly value={view?.webhookUrl || ""} className="mt-1 font-mono text-xs" dir="ltr" />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">
            Webhook Verify Token{" "}
            {view?.hasWebhookVerifyToken && "(محفوظ — اتركه فارغاً للإبقاء)"}
          </span>
          <Input
            type="password"
            value={form.webhookVerifyToken}
            onChange={(e) => setForm({ ...form, webhookVerifyToken: e.target.value })}
            placeholder={view?.hasWebhookVerifyToken ? "••••••••" : ""}
            className="mt-1 font-mono text-sm"
            dir="ltr"
          />
        </label>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={save} loading={saving}>
            Save
          </Button>
          <Button variant="outline" onClick={testConnection} loading={testing}>
            Test Connection
          </Button>
        </div>
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        {testResult && <p className="text-sm text-gray-700">{testResult}</p>}
        {view && (
          <p className="text-xs text-gray-500">
            المصدر: {view.configSource === "database" ? "قاعدة البيانات" : view.configSource === "environment" ? "متغيرات البيئة" : "غير مُعد"}
            {view.encryptionReady ? "" : " · تشفير الرموز غير جاهز"}
          </p>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Health Check</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(view?.health || []).map((h) => (
            <div key={h.id} className="flex items-start gap-3 rounded-lg border p-3">
              {h.ok ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{h.label}</span>
                  <Badge variant={h.ok ? "success" : "warning"}>{h.ok ? "PASS" : "PENDING"}</Badge>
                </div>
                <p className="mt-1 text-xs text-gray-600">{h.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
