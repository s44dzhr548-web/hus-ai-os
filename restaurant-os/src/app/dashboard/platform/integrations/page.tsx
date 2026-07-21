"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input, Card, LoadingSpinner, Badge } from "@/components/ui";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";

type Integration = {
  key: string;
  label: string;
  labelAr: string;
  brandColor: string;
  clientId: string | null;
  hasClientSecret: boolean;
  redirectUri: string;
  webhookUrl: string;
  hasWebhookVerifyToken: boolean;
  oauthReady: boolean;
  isEnabled: boolean;
  source: string;
};

export default function PlatformIntegrationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selected, setSelected] = useState("META");
  const [form, setForm] = useState({
    clientId: "",
    clientSecret: "",
    webhookVerifyToken: "",
    displayName: "",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  const SAVE_TIMEOUT_MS = 15000;

  async function apiFetch(path: string, init?: RequestInit) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);
    try {
      const res = await fetch(path, { ...init, signal: controller.signal });
      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        data = { error: "استجابة غير صالحة من الخادم" };
      }
      return { res, data };
    } finally {
      clearTimeout(timer);
    }
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/platform/integrations");
    const data = await res.json();
    if (res.ok) {
      setIntegrations(data.integrations || []);
      const cur = data.integrations?.find((i: Integration) => i.key === selected) || data.integrations?.[0];
      if (cur) {
        setSelected(cur.key);
        setForm({ clientId: cur.clientId || "", clientSecret: "", webhookVerifyToken: "", displayName: cur.label });
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.isPlatformAdmin) load();
  }, [session]);

  const current = integrations.find((i) => i.key === selected);

  useEffect(() => {
    if (current) {
      setForm((f) => ({ ...f, clientId: current.clientId || "", displayName: current.label, clientSecret: "", webhookVerifyToken: "" }));
    }
  }, [selected, current?.key]);

  async function save() {
    setSaving(true);
    setMessage("");
    setMessageIsError(false);
    try {
      const { res, data } = await apiFetch("/api/platform/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformKey: selected, ...form }),
      });
      if (!res.ok) {
        setMessageIsError(true);
        setMessage(String(data.error || "فشل الحفظ"));
        return;
      }
      setIntegrations((data.integrations as Integration[]) || []);
      setMessageIsError(false);
      setMessage("تم الحفظ");
    } catch (e) {
      setMessageIsError(true);
      setMessage(
        e instanceof Error && e.name === "AbortError"
          ? "انتهت مهلة الحفظ (١٥ ثانية) — حاول مرة أخرى"
          : "تعذّر الاتصال بالخادم"
      );
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setMessageIsError(false);
    try {
      const { res, data } = await apiFetch("/api/platform/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_connection", platformKey: selected }),
      });
      const ok = Boolean(data.ok);
      setMessageIsError(!ok);
      setMessage(ok ? `✓ ${String(data.message || "")}` : `✗ ${String(data.message || data.error || "فشل")}`);
    } catch (e) {
      setMessageIsError(true);
      setMessage(
        e instanceof Error && e.name === "AbortError"
          ? "انتهت مهلة الاختبار (١٥ ثانية)"
          : "تعذّر الاتصال بالخادم"
      );
    } finally {
      setTesting(false);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Platform Integrations</h1>
        <p className="mt-1 text-sm text-gray-600">إعداد OAuth و Webhooks لجميع منصات الإعلان — Super Admin فقط</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {integrations.map((i) => (
          <button
            key={i.key}
            type="button"
            onClick={() => setSelected(i.key)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${selected === i.key ? "ring-2 ring-emerald-500" : "opacity-80"}`}
            style={{ backgroundColor: i.brandColor, color: i.key === "SNAPCHAT" ? "#000" : "#fff" }}
          >
            {i.labelAr}
            {i.oauthReady ? " ✓" : ""}
          </button>
        ))}
      </div>

      {current && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{current.label}</h2>
            <Badge variant={current.oauthReady ? "success" : "warning"}>
              {current.oauthReady ? "OAuth Ready" : "Pending"}
            </Badge>
          </div>

          <label className="block text-sm">
            {selected === "META" ? "Meta App ID (META_APP_ID)" : "Client ID"}
            <Input
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              placeholder={selected === "META" ? "123456789012345" : ""}
              className="mt-1 font-mono text-sm"
              dir="ltr"
            />
          </label>
          <label className="block text-sm">
            Client Secret {current.hasClientSecret && "(محفوظ)"}
            <Input type="password" value={form.clientSecret} onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} placeholder="••••••••" className="mt-1" dir="ltr" />
          </label>
          <label className="block text-sm">
            Redirect URI (read-only)
            <Input readOnly value={current.redirectUri} className="mt-1 font-mono text-xs" dir="ltr" />
          </label>
          <label className="block text-sm">
            Webhook URL (read-only)
            <Input readOnly value={current.webhookUrl} className="mt-1 font-mono text-xs" dir="ltr" />
          </label>
          <label className="block text-sm">
            Webhook Verify Token {current.hasWebhookVerifyToken && "(محفوظ)"}
            <Input type="password" value={form.webhookVerifyToken} onChange={(e) => setForm({ ...form, webhookVerifyToken: e.target.value })} className="mt-1" dir="ltr" />
          </label>

          <div className="flex gap-2">
            <Button onClick={save} loading={saving}>Save</Button>
            <Button variant="outline" onClick={test} loading={testing}>Test Connection</Button>
          </div>
          {message && (
            <p className={`text-sm ${messageIsError ? "text-red-600" : "text-gray-700"}`}>{message}</p>
          )}
          <p className="text-xs text-gray-500">Source: {current.source}</p>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="mb-3 font-semibold">Health Overview</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {integrations.map((i) => (
            <div key={i.key} className="flex items-center gap-2 text-sm">
              {i.oauthReady ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-amber-500" />}
              {i.labelAr} — {i.oauthReady ? "PASS" : "PENDING"}
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-gray-500">
        Meta/WhatsApp legacy config: <Link href="/dashboard/platform/meta" className="text-emerald-700 underline">Meta Admin</Link>
      </p>
    </div>
  );
}
