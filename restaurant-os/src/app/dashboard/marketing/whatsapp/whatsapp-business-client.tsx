"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui";
import { DEFAULT_MESSAGE_BODY } from "@/lib/after-visit-whatsapp/types";
import { cn } from "@/lib/utils";

type TabId = "connection" | "templates" | "automation" | "delivery" | "history" | "health";

const TABS: { id: TabId; label: string }[] = [
  { id: "connection", label: "الاتصال" },
  { id: "templates", label: "القوالب" },
  { id: "automation", label: "الأتمتة" },
  { id: "delivery", label: "لوحة التسليم" },
  { id: "history", label: "سجل الرسائل" },
  { id: "health", label: "فحص الصحة" },
];

const STATUS_LABELS: Record<string, string> = {
  QUEUED: "في الانتظار",
  SENT: "تم الإرسال",
  DELIVERED: "تم التسليم",
  READ: "مقروء",
  FAILED: "فشل",
  OPTED_OUT: "إلغاء اشتراك",
  SKIPPED_NO_CONSENT: "بدون موافقة",
  SKIPPED_NO_PHONE: "بدون جوال",
  SKIPPED_NO_CONNECTION: "بدون ربط",
  SKIPPED_DISABLED: "متوقف",
  SKIPPED_DUPLICATE: "مكرر",
};

type DeliveryRow = {
  id: string;
  status: string;
  phone: string;
  templateName: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedReason: string | null;
  createdAt: string;
  visit?: { customerName: string; tableDisplayNumber: string | null };
};

export default function WhatsAppBusinessPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "connection";
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === initialTab) ? initialTab : "connection");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const [automation, setAutomation] = useState({
    isEnabled: false,
    delayMinutes: 5,
    templateName: "after_visit_thank_you",
    messageBody: DEFAULT_MESSAGE_BODY,
    reviewLinkBase: "",
    branchId: "",
    testPhone: "",
  });
  const [connection, setConnection] = useState({
    wabaId: "",
    phoneNumberId: "",
    businessPhone: "",
    accessToken: "",
    templateLanguage: "ar",
    hasToken: false,
    connected: false,
  });
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [templates, setTemplates] = useState<
    Array<{ name: string; language: string; status: string; category: string; lastUpdated: string | null }>
  >([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [delayOptions, setDelayOptions] = useState<{ minutes: number; labelAr: string }[]>([]);
  const [stats, setStats] = useState({
    queued: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    skipped: 0,
    optedOut: 0,
  });
  const [charts, setCharts] = useState({
    messagesPerDay: [] as { date: string; count: number }[],
    deliveryRate: 0,
    readRate: 0,
    failureRate: 0,
  });
  const [health, setHealth] = useState<
    Array<{ id: string; labelAr: string; ok: boolean; detail: string }>
  >([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookVerifyToken, setWebhookVerifyToken] = useState(false);
  const [encryptionReady, setEncryptionReady] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/marketing/whatsapp/business");
    const data = await res.json();
    if (res.ok) {
      setCanEdit(data.permissions?.canEdit ?? false);
      setAutomation({
        isEnabled: data.automation.isEnabled,
        delayMinutes: data.automation.delayMinutes,
        templateName: data.automation.templateName,
        messageBody: data.automation.messageBody || DEFAULT_MESSAGE_BODY,
        reviewLinkBase: data.automation.reviewLinkBase || "",
        branchId: data.automation.branchId || "",
        testPhone: data.automation.testPhone || "",
      });
      if (data.connection) {
        setConnection({
          wabaId: data.connection.wabaId || "",
          phoneNumberId: data.connection.phoneNumberId || "",
          businessPhone: data.connection.businessPhone || "",
          accessToken: "",
          templateLanguage: data.connection.templateLanguage || "ar",
          hasToken: data.connection.hasToken,
          connected: data.connection.connected,
        });
      }
      setDeliveries(data.deliveries || []);
      setTemplates(data.templates || []);
      setBranches(data.branches || []);
      setDelayOptions(data.delayOptions || []);
      setStats(data.stats || { queued: 0, sent: 0, delivered: 0, read: 0, failed: 0, skipped: 0, optedOut: 0 });
      setCharts(
        data.charts || { messagesPerDay: [], deliveryRate: 0, readRate: 0, failureRate: 0 }
      );
      setHealth(data.health || []);
      setWebhookUrl(data.webhookUrl || "");
      setWebhookVerifyToken(data.webhookVerifyToken);
      setEncryptionReady(data.encryptionReady);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = searchParams.get("tab") as TabId;
    if (t && TABS.some((x) => x.id === t)) setTab(t);
  }, [searchParams]);

  async function postAction(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/marketing/whatsapp/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "فشل العملية");
      return null;
    }
    return data;
  }

  async function saveConnection() {
    const data = await postAction("save_connection", {
      ...connection,
      templateName: automation.templateName,
    });
    if (data) {
      setMessage("تم حفظ اتصال WhatsApp Business");
      load();
    }
  }

  async function saveAutomation() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/marketing/whatsapp/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(automation),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "فشل الحفظ");
      return;
    }
    setMessage("تم حفظ إعدادات الأتمتة");
  }

  const filteredDeliveries = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return deliveries;
    return deliveries.filter(
      (d) =>
        d.phone.includes(q) ||
        d.templateName.toLowerCase().includes(q) ||
        d.visit?.customerName?.toLowerCase().includes(q) ||
        (STATUS_LABELS[d.status] || d.status).includes(q)
    );
  }, [deliveries, historySearch]);

  if (loading) return <MkLoading />;

  return (
    <div className="space-y-6 pb-12">
      <MkPageHeader
        title="واتساب الأعمال"
        desc="مركز إعداد WhatsApp Business Cloud API — الاتصال، القوالب، الأتمتة، والتسليم"
      />

      {!canEdit && (
        <p className="rounded border border-amber-800/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
          وضع القراءة فقط — تعديل الاتصال والأتمتة متاح للمالك فقط
        </p>
      )}

      {message && (
        <p className="rounded border border-emerald-800/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded border border-red-800/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <nav className="flex flex-wrap gap-2 border-b border-stone-700 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              tab === t.id
                ? "bg-emerald-600 text-white"
                : "bg-stone-800 text-stone-300 hover:bg-stone-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "connection" && (
        <MkCard className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{connection.connected ? "🟢" : "🔴"}</span>
            <div>
              <h2 className="text-lg font-semibold text-white">الاتصال</h2>
              <p className="text-sm text-gray-400">
                {connection.connected ? "Connected" : "Not Connected"}
              </p>
            </div>
          </div>
          {!encryptionReady && (
            <p className="text-xs text-amber-300">MARKETING_TOKEN_SECRET مطلوب لتشفير Access Token</p>
          )}
          <Field label="Business Account ID (WABA)" dir="ltr">
            <input
              value={connection.wabaId}
              disabled={!canEdit}
              onChange={(e) => setConnection({ ...connection, wabaId: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Phone Number ID" dir="ltr">
            <input
              value={connection.phoneNumberId}
              disabled={!canEdit}
              onChange={(e) => setConnection({ ...connection, phoneNumberId: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Access Token (encrypted at rest)" dir="ltr">
            <input
              type="password"
              value={connection.accessToken}
              disabled={!canEdit}
              onChange={(e) => setConnection({ ...connection, accessToken: e.target.value })}
              placeholder={connection.hasToken ? "•••••••• (leave blank to keep)" : "EAA..."}
              className={inputCls}
            />
          </Field>
          <Field label="Webhook URL (read-only)" dir="ltr">
            <input readOnly value={webhookUrl} className={inputCls} />
          </Field>
          <Field label="Webhook Verify Token" dir="ltr">
            <input
              readOnly
              value={
                webhookVerifyToken
                  ? "Configured in server env"
                  : "WHATSAPP_WEBHOOK_VERIFY_TOKEN not set"
              }
              className={inputCls}
            />
          </Field>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveConnection} loading={busy}>
                Connect WhatsApp / Save
              </Button>
              <Button
                variant="outline"
                loading={busy}
                onClick={async () => {
                  const data = await postAction("test_connection");
                  if (data) setMessage("اتصال Cloud API ناجح");
                }}
              >
                Test Connection
              </Button>
              <Button
                variant="outline"
                loading={busy}
                onClick={async () => {
                  const data = await postAction("disconnect");
                  if (data) {
                    setMessage("تم قطع الاتصال");
                    load();
                  }
                }}
              >
                Disconnect
              </Button>
            </div>
          )}
        </MkCard>
      )}

      {tab === "templates" && (
        <MkCard className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">القوالب المعتمدة</h2>
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  loading={busy}
                  onClick={async () => {
                    const data = await postAction("sync_templates");
                    if (data?.templates) {
                      setTemplates(data.templates);
                      setMessage(`تمت مزامنة ${data.templates.length} قالب`);
                    }
                  }}
                >
                  Sync Templates
                </Button>
              )}
              <a
                href="https://business.facebook.com/wa/manage/message-templates/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-stone-600 px-3 py-2 text-sm text-stone-200 hover:bg-stone-800"
              >
                Open Meta Manager
              </a>
            </div>
          </div>
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400">لا توجد قوالب — اربط WABA واضغط Sync Templates</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-300">
                <thead>
                  <tr className="border-b border-gray-700 text-xs uppercase text-gray-500">
                    <th className="py-2 pr-3 text-right">Template Name</th>
                    <th className="py-2 pr-3 text-right">Language</th>
                    <th className="py-2 pr-3 text-right">Status</th>
                    <th className="py-2 pr-3 text-right">Category</th>
                    <th className="py-2 pr-3 text-right">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={`${t.name}-${t.language}`} className="border-b border-gray-800">
                      <td className="py-2 pr-3 font-mono text-xs">{t.name}</td>
                      <td className="py-2 pr-3">{t.language}</td>
                      <td className="py-2 pr-3">{t.status}</td>
                      <td className="py-2 pr-3">{t.category}</td>
                      <td className="py-2 pr-3 text-xs">
                        {t.lastUpdated ? new Date(t.lastUpdated).toLocaleString("ar-SA") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </MkCard>
      )}

      {tab === "automation" && (
        <MkCard className="space-y-4">
          <h2 className="text-lg font-semibold text-white">أتمتة بعد الزيارة</h2>
          <label className="flex items-center gap-3 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={automation.isEnabled}
              disabled={!canEdit}
              onChange={(e) => setAutomation({ ...automation, isEnabled: e.target.checked })}
              className="h-4 w-4"
            />
            Enable Automation — رسالة شكر بعد إنهاء الجلسة
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm text-gray-400">Delay</legend>
            {delayOptions.map((d) => (
              <label key={d.minutes} className="flex items-center gap-2 text-sm text-gray-200">
                <input
                  type="radio"
                  name="delay"
                  disabled={!canEdit}
                  checked={automation.delayMinutes === d.minutes}
                  onChange={() => setAutomation({ ...automation, delayMinutes: d.minutes })}
                />
                {d.labelAr}
              </label>
            ))}
          </fieldset>
          <Field label="الفرع">
            <select
              value={automation.branchId}
              disabled={!canEdit}
              onChange={(e) => setAutomation({ ...automation, branchId: e.target.value })}
              className={inputCls}
            >
              <option value="">كل الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Review Link (base URL)" dir="ltr">
            <input
              value={automation.reviewLinkBase}
              disabled={!canEdit}
              onChange={(e) => setAutomation({ ...automation, reviewLinkBase: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Test Phone" dir="ltr">
            <input
              value={automation.testPhone}
              disabled={!canEdit}
              onChange={(e) => setAutomation({ ...automation, testPhone: e.target.value })}
              className={inputCls}
            />
          </Field>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveAutomation} loading={busy}>
                Save
              </Button>
              <Button
                variant="outline"
                loading={busy}
                onClick={async () => {
                  await saveAutomation();
                  const data = await postAction("test_send", { testPhone: automation.testPhone });
                  if (data) setMessage(`Test sent — ${data.messageId}`);
                }}
              >
                Send Test
              </Button>
            </div>
          )}
        </MkCard>
      )}

      {tab === "delivery" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {(
              [
                ["Queued", stats.queued],
                ["Sent", stats.sent],
                ["Delivered", stats.delivered],
                ["Read", stats.read],
                ["Failed", stats.failed],
                ["Skipped", stats.skipped],
                ["Opt-out", stats.optedOut],
              ] as const
            ).map(([label, val]) => (
              <MkCard key={label} className="text-center">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-2xl font-bold text-white">{val}</p>
              </MkCard>
            ))}
          </div>
          <MkCard className="grid gap-4 sm:grid-cols-3">
            <StatBar label="Delivery rate" value={charts.deliveryRate} color="bg-emerald-500" />
            <StatBar label="Read rate" value={charts.readRate} color="bg-blue-500" />
            <StatBar label="Failure rate" value={charts.failureRate} color="bg-red-500" />
          </MkCard>
          <MkCard>
            <h3 className="mb-3 text-sm font-medium text-gray-300">Messages per day (30d)</h3>
            {charts.messagesPerDay.length === 0 ? (
              <p className="text-sm text-gray-500">No sent messages yet</p>
            ) : (
              <div className="flex h-32 items-end gap-1">
                {charts.messagesPerDay.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-emerald-600/80"
                      style={{
                        height: `${Math.max(
                          8,
                          (d.count / Math.max(...charts.messagesPerDay.map((x) => x.count), 1)) * 100
                        )}%`,
                      }}
                      title={`${d.date}: ${d.count}`}
                    />
                    <span className="w-full truncate text-center text-[9px] text-gray-500">
                      {d.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </MkCard>
        </div>
      )}

      {tab === "history" && (
        <MkCard>
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="بحث: عميل، جوال، قالب، حالة..."
              className={cn(inputCls, "max-w-md")}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead>
                <tr className="border-b border-gray-700 text-xs uppercase text-gray-500">
                  <th className="py-2 pr-3 text-right">Customer</th>
                  <th className="py-2 pr-3 text-right">Phone</th>
                  <th className="py-2 pr-3 text-right">Visit</th>
                  <th className="py-2 pr-3 text-right">Template</th>
                  <th className="py-2 pr-3 text-right">Status</th>
                  <th className="py-2 pr-3 text-right">Sent</th>
                  <th className="py-2 pr-3 text-right">Delivered</th>
                  <th className="py-2 pr-3 text-right">Read</th>
                  <th className="py-2 pr-3 text-right">Failure</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((d) => (
                  <tr key={d.id} className="border-b border-gray-800">
                    <td className="py-2 pr-3">{d.visit?.customerName || "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs" dir="ltr">
                      {d.phone}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {d.visit?.tableDisplayNumber ? `T${d.visit.tableDisplayNumber}` : "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs">{d.templateName}</td>
                    <td className="py-2 pr-3">{STATUS_LABELS[d.status] || d.status}</td>
                    <td className="py-2 pr-3 text-xs">
                      {d.sentAt ? new Date(d.sentAt).toLocaleString("ar-SA") : "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {d.deliveredAt ? new Date(d.deliveredAt).toLocaleString("ar-SA") : "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {d.readAt ? new Date(d.readAt).toLocaleString("ar-SA") : "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs text-red-300">{d.failedReason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MkCard>
      )}

      {tab === "health" && (
        <MkCard className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Health Check</h2>
          {health.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between rounded border border-stone-700 px-3 py-2"
            >
              <span className="text-sm text-gray-200">{h.labelAr}</span>
              <span className="flex items-center gap-2 text-sm">
                <span>{h.ok ? "🟢" : "🔴"}</span>
                <span className={h.ok ? "text-emerald-400" : "text-red-400"}>{h.detail}</span>
              </span>
            </div>
          ))}
        </MkCard>
      )}
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm disabled:opacity-60";

function Field({
  label,
  children,
  dir,
}: {
  label: string;
  children: React.ReactNode;
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="block text-sm text-gray-300" dir={dir}>
      {label}
      {children}
    </label>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-stone-800">
        <div className={cn("h-2 rounded-full", color)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
