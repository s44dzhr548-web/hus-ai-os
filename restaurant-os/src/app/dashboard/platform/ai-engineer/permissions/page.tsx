"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  LoadingSpinner,
  Badge,
  Modal,
  Select,
} from "@/components/ui";
import {
  PERMISSION_GROUPS,
  type PermissionGroupId,
  type ApprovalType,
  type PresetId,
} from "@/lib/ai-engineer/permission-catalog";
import {
  Bot,
  ArrowRight,
  Shield,
  Lock,
  AlertTriangle,
  OctagonX,
  CheckCircle2,
  Clock,
  History,
} from "lucide-react";

type PermissionRow = {
  key: string;
  nameAr: string;
  descriptionAr: string;
  riskLevel: string;
  affectedSystem: string;
  dataImpact: string;
  group: PermissionGroupId;
  blocked?: boolean;
  enabled: boolean;
  approvalType: string | null;
  grantedAt: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  maxApproval: ApprovalType;
  restaurantScope?: string | null;
  branchScope?: string | null;
  dataScope?: string | null;
};

type PendingAction = {
  id: string;
  titleAr: string;
  permissionKey: string;
  preview: Record<string, unknown> | null;
  status: string;
  expiresAt: string;
  restaurantScope?: string | null;
  branchScope?: string | null;
};

type AuditRow = {
  id: string;
  eventType: string;
  userId: string | null;
  permissionKey: string | null;
  decision: string | null;
  reason: string | null;
  result: string | null;
  createdAt: string;
};

type Workflow = {
  id: string;
  titleAr: string;
  steps: Array<{ titleAr: string; permissionKey?: string; auto?: boolean }>;
  currentStep: number;
  status: string;
  startedAt: string;
  toolsUsed?: unknown;
};

const RISK_LABELS: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  blocked: "محظورة",
};

const RISK_VARIANT: Record<string, "success" | "warning" | "danger" | "default"> = {
  low: "success",
  medium: "warning",
  high: "danger",
  blocked: "danger",
};

const APPROVAL_OPTIONS: { value: ApprovalType; label: string }[] = [
  { value: "once", label: "موافقة لمرة واحدة" },
  { value: "15min", label: "موافقة لمدة 15 دقيقة" },
  { value: "session", label: "موافقة لهذه الجلسة فقط" },
  { value: "permanent", label: "موافقة دائمة" },
];

const EVENT_LABELS: Record<string, string> = {
  permission_requested: "طلب صلاحية",
  permission_approved: "موافقة",
  permission_denied: "رفض",
  permission_expired: "انتهاء",
  permission_revoked: "إلغاء",
  action_executed: "تنفيذ",
  action_failed: "فشل",
  workflow_cancelled: "إلغاء سير عمل",
  emergency_stop: "إيقاف طوارئ",
  denied_attempt: "محاولة مرفوضة",
};

function allowedApprovalOptions(max: ApprovalType) {
  const order: ApprovalType[] = ["once", "15min", "session", "permanent"];
  const idx = order.indexOf(max);
  return APPROVAL_OPTIONS.filter((o) => order.indexOf(o.value) <= idx);
}

export default function AiEngineerPermissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [presets, setPresets] = useState<Array<{ id: string; labelAr: string; descriptionAr: string }>>([]);
  const [activePreset, setActivePreset] = useState("monitoring_only");
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [chatReadOnly, setChatReadOnly] = useState(false);
  const [pending, setPending] = useState<PendingAction[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [actionLoading, setActionLoading] = useState("");
  const [confirmModal, setConfirmModal] = useState<PendingAction | null>(null);
  const [grantModal, setGrantModal] = useState<PermissionRow | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalType>("once");
  const [restaurantScope, setRestaurantScope] = useState("");
  const [branchScope, setBranchScope] = useState("");
  const [dataScope, setDataScope] = useState("");

  const load = useCallback(async () => {
    const [permRes, pendingRes, auditRes, wfRes] = await Promise.all([
      fetch("/api/platform/ai-engineer/permissions"),
      fetch("/api/platform/ai-engineer/approvals"),
      fetch("/api/platform/ai-engineer/audit?limit=30"),
      fetch("/api/platform/ai-engineer/workflows"),
    ]);
    const permData = await permRes.json();
    const pendingData = await pendingRes.json();
    const auditData = await auditRes.json();
    const wfData = await wfRes.json();

    setPermissions(permData.permissions ?? []);
    setPresets(permData.presets ?? []);
    setActivePreset(permData.globalState?.activePreset ?? "monitoring_only");
    setEmergencyStop(Boolean(permData.globalState?.emergencyStop));
    setChatReadOnly(Boolean(permData.globalState?.chatReadOnly));
    setPending(pendingData.pending ?? []);
    setAudit(auditData.logs ?? []);
    setWorkflow(wfData.workflow ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.isPlatformAdmin) load();
  }, [session, load]);

  async function post(url: string, body: object) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "فشل الطلب");
    return data;
  }

  async function applyPreset(presetId: PresetId) {
    setActionLoading(`preset-${presetId}`);
    try {
      await post("/api/platform/ai-engineer/permissions", {
        action: "apply_preset",
        presetId,
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل");
    } finally {
      setActionLoading("");
    }
  }

  async function grantPermission(row: PermissionRow, approvalType: ApprovalType) {
    setActionLoading(`grant-${row.key}`);
    try {
      await post("/api/platform/ai-engineer/permissions", {
        action: "grant",
        permissionKey: row.key,
        approvalType,
        restaurantScope: restaurantScope || null,
        branchScope: branchScope || null,
        dataScope: dataScope || null,
      });
      setGrantModal(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل");
    } finally {
      setActionLoading("");
    }
  }

  async function revokePermission(key: string) {
    setActionLoading(`revoke-${key}`);
    try {
      await post("/api/platform/ai-engineer/permissions", {
        action: "revoke",
        permissionKey: key,
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل");
    } finally {
      setActionLoading("");
    }
  }

  async function emergencyStopAction() {
    if (!confirm("إيقاف المهندس الذكي؟ سيتم إلغاء جميع الصلاحيات والعمليات المعلقة.")) return;
    setActionLoading("emergency");
    try {
      await post("/api/platform/ai-engineer/emergency-stop", { action: "stop" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل");
    } finally {
      setActionLoading("");
    }
  }

  async function resumeEngineer() {
    setActionLoading("resume");
    try {
      await post("/api/platform/ai-engineer/emergency-stop", { action: "resume" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل");
    } finally {
      setActionLoading("");
    }
  }

  async function decidePending(decision: ApprovalType | "reject") {
    if (!confirmModal) return;
    setActionLoading(`decide-${confirmModal.id}`);
    try {
      const result = await post("/api/platform/ai-engineer/approvals", {
        action: "decide",
        pendingActionId: confirmModal.id,
        decision,
      });

      if (decision !== "reject" && result.token) {
        const exec = await post("/api/platform/ai-engineer/execute", {
          permissionKey: confirmModal.permissionKey,
          payload: {},
          approvalToken: result.token,
          pendingActionId: confirmModal.id,
        });
        alert(exec.result || "تم التنفيذ");
      }

      setConfirmModal(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل");
    } finally {
      setActionLoading("");
    }
  }

  async function simulateRequest(permissionKey: string, titleAr: string) {
    setActionLoading(`req-${permissionKey}`);
    try {
      await post("/api/platform/ai-engineer/approvals", {
        action: "request",
        permissionKey,
        titleAr,
        payload: { simulated: true, at: new Date().toISOString() },
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل");
    } finally {
      setActionLoading("");
    }
  }

  if (status === "loading" || loading) return <LoadingSpinner />;
  if (!session?.user?.isPlatformAdmin) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow">
        الوصول مرفوض — مالك المنصة فقط
      </div>
    );
  }

  const grouped = Object.keys(PERMISSION_GROUPS) as PermissionGroupId[];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12" dir="rtl">
      <Link
        href="/dashboard/platform"
        className="inline-flex items-center gap-1 text-sm text-emerald-700"
      >
        <ArrowRight className="h-4 w-4" /> إدارة المنصة
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bot className="h-7 w-7 text-emerald-600" />
            صلاحيات مهندس المنصة الذكي
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            تحكم كامل في ما يمكن للمساعد تنفيذه — كل صلاحية افتراضياً مغلقة
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {emergencyStop ? (
            <Button variant="outline" loading={actionLoading === "resume"} onClick={resumeEngineer}>
              استئناف المهندس
            </Button>
          ) : null}
          <Button
            variant="danger"
            loading={actionLoading === "emergency"}
            onClick={emergencyStopAction}
            className="gap-2"
          >
            <OctagonX className="h-4 w-4" />
            إيقاف المهندس الذكي
          </Button>
        </div>
      </div>

      {emergencyStop && (
        <Card className="border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-red-800">
            <AlertTriangle className="h-5 w-5" />
            إيقاف طوارئ نشط — الدردشة للقراءة فقط، لا تنفيذ أدوات
          </p>
          {chatReadOnly && (
            <p className="mt-1 text-sm text-red-700">وضع القراءة فقط مفعّل</p>
          )}
        </Card>
      )}

      <Card className="space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Shield className="h-5 w-5 text-emerald-600" />
          إعدادات مسبقة للمالك
        </h2>
        <p className="text-sm text-gray-500">الافتراضي: وضع المراقبة فقط</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id as PresetId)}
              disabled={!!actionLoading}
              className={`rounded-lg border p-3 text-right transition ${
                activePreset === p.id
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-emerald-300"
              }`}
            >
              <p className="font-medium">{p.labelAr}</p>
              <p className="text-xs text-gray-500">{p.descriptionAr}</p>
              {activePreset === p.id && (
                <Badge variant="success" className="mt-2">
                  نشط
                </Badge>
              )}
            </button>
          ))}
        </div>
      </Card>

      {pending.length > 0 && (
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold text-amber-800">طلبات بانتظار الموافقة</h2>
          {pending.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3"
            >
              <div>
                <p className="font-medium">{p.titleAr}</p>
                <p className="text-xs text-gray-500">{p.permissionKey}</p>
              </div>
              <Button size="sm" onClick={() => setConfirmModal(p)}>
                مراجعة وموافقة
              </Button>
            </div>
          ))}
        </Card>
      )}

      {workflow && workflow.status === "running" && (
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold">لوحة التنفيذ المباشر</h2>
          <p className="text-sm">{workflow.titleAr}</p>
          <div className="space-y-2">
            {(workflow.steps as Array<{ titleAr: string }>).map((step, i) => (
              <div
                key={step.titleAr}
                className={`flex items-center gap-2 rounded p-2 text-sm ${
                  i < workflow.currentStep
                    ? "bg-emerald-50 text-emerald-800"
                    : i === workflow.currentStep
                      ? "bg-amber-50 font-medium"
                      : "bg-gray-50 text-gray-400"
                }`}
              >
                {i < workflow.currentStep ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : i === workflow.currentStep ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <span className="h-4 w-4 rounded-full border" />
                )}
                {i + 1}. {step.titleAr}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            بدء: {new Date(workflow.startedAt).toLocaleString("ar-SA")}
          </p>
        </Card>
      )}

      {grouped.map((groupId) => {
        const group = PERMISSION_GROUPS[groupId];
        const items = permissions.filter((p) => p.group === groupId);
        const isForbidden = groupId === "forbidden";

        return (
          <Card key={groupId} className="space-y-4 p-5">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                {isForbidden ? (
                  <Lock className="h-5 w-5 text-red-600" />
                ) : (
                  <Shield className="h-5 w-5 text-emerald-600" />
                )}
                {group.titleAr}
              </h2>
              <p className="text-sm text-gray-500">{group.descriptionAr}</p>
            </div>

            <div className="space-y-3">
              {items.map((row) => (
                <div
                  key={row.key}
                  className={`rounded-lg border p-4 ${
                    isForbidden ? "border-red-100 bg-red-50/50" : "border-gray-100"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isForbidden ? (
                          <Lock className="h-4 w-4 text-red-500" />
                        ) : (
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            disabled
                            className="h-4 w-4 rounded border-gray-300"
                            readOnly
                          />
                        )}
                        <p className="font-medium">{row.nameAr}</p>
                        <Badge variant={RISK_VARIANT[row.riskLevel] ?? "default"}>
                          {RISK_LABELS[row.riskLevel]}
                        </Badge>
                        {row.enabled && !isForbidden && (
                          <Badge variant="success">مفعّل</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{row.descriptionAr}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>النظام: {row.affectedSystem}</span>
                        <span>تأثير البيانات: {row.dataImpact}</span>
                        {row.usageCount > 0 && <span>الاستخدام: {row.usageCount}</span>}
                        {row.lastUsedAt && (
                          <span>
                            آخر استخدام:{" "}
                            {new Date(row.lastUsedAt).toLocaleString("ar-SA")}
                          </span>
                        )}
                        {row.approvalType && (
                          <span>نوع الموافقة: {row.approvalType}</span>
                        )}
                        {row.expiresAt && (
                          <span>
                            ينتهي: {new Date(row.expiresAt).toLocaleString("ar-SA")}
                          </span>
                        )}
                      </div>

                      {groupId === "restaurant_data" && !isForbidden && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <input
                            className="rounded border px-2 py-1 text-sm"
                            placeholder="المطعم (مطلوب)"
                            value={restaurantScope}
                            onChange={(e) => setRestaurantScope(e.target.value)}
                          />
                          <input
                            className="rounded border px-2 py-1 text-sm"
                            placeholder="الفرع"
                            value={branchScope}
                            onChange={(e) => setBranchScope(e.target.value)}
                          />
                          <input
                            className="rounded border px-2 py-1 text-sm"
                            placeholder="نوع البيانات"
                            value={dataScope}
                            onChange={(e) => setDataScope(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    {!isForbidden && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          loading={actionLoading === `grant-${row.key}`}
                          onClick={() => {
                            setGrantModal(row);
                            setSelectedApproval(
                              allowedApprovalOptions(row.maxApproval)[0]?.value ?? "once"
                            );
                          }}
                        >
                          موافقة المالك
                        </Button>
                        {row.enabled && (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={actionLoading === `revoke-${row.key}`}
                            onClick={() => revokePermission(row.key)}
                          >
                            إلغاء
                          </Button>
                        )}
                        {row.riskLevel !== "low" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={actionLoading === `req-${row.key}`}
                            onClick={() => simulateRequest(row.key, row.nameAr)}
                          >
                            طلب تنفيذ
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      <Card className="space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <History className="h-5 w-5" />
          سجل التدقيق (غير قابل للتعديل)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-gray-500">
                <th className="p-2">التاريخ</th>
                <th className="p-2">الحدث</th>
                <th className="p-2">الصلاحية</th>
                <th className="p-2">القرار</th>
                <th className="p-2">السبب</th>
                <th className="p-2">النتيجة</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((log) => (
                <tr key={log.id} className="border-b border-gray-50">
                  <td className="p-2 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("ar-SA")}
                  </td>
                  <td className="p-2">{EVENT_LABELS[log.eventType] ?? log.eventType}</td>
                  <td className="p-2 font-mono text-xs" dir="ltr">
                    {log.permissionKey ?? "—"}
                  </td>
                  <td className="p-2">{log.decision ?? "—"}</td>
                  <td className="p-2">{log.reason ?? "—"}</td>
                  <td className="p-2 max-w-xs truncate">{log.result ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {grantModal && (
        <Modal
          open
          onClose={() => setGrantModal(null)}
          title={`موافقة: ${grantModal.nameAr}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{grantModal.descriptionAr}</p>
            <Badge variant={RISK_VARIANT[grantModal.riskLevel]}>
              خطورة: {RISK_LABELS[grantModal.riskLevel]}
            </Badge>
            <Select
              label="نوع الموافقة"
              value={selectedApproval}
              onChange={(e) => setSelectedApproval(e.target.value as ApprovalType)}
            >
              {allowedApprovalOptions(grantModal.maxApproval).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            {grantModal.group === "read_inspect" && (
              <p className="text-xs text-emerald-700">
                يمكن تفعيل &quot;السماح دائمًا&quot; لصلاحيات القراءة منخفضة الخطورة
              </p>
            )}
            {grantModal.group === "config_repair" && (
              <p className="text-xs text-amber-700">
                الحد الأقصى: موافقة لهذه الجلسة فقط
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setGrantModal(null)}>
                إلغاء
              </Button>
              <Button
                loading={actionLoading === `grant-${grantModal.key}`}
                onClick={() => grantPermission(grantModal, selectedApproval)}
              >
                تأكيد الموافقة
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {confirmModal && (
        <Modal
          open
          onClose={() => setConfirmModal(null)}
          title={confirmModal.titleAr}
        >
          <div className="space-y-4">
            <p className="font-medium">تأكيد العملية قبل التنفيذ</p>
            {confirmModal.preview && (
              <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
                {Object.entries(confirmModal.preview).map(([k, v]) => (
                  <p key={k}>
                    <span className="text-gray-500">{k}: </span>
                    {String(v)}
                  </p>
                ))}
              </div>
            )}
            {confirmModal.restaurantScope && (
              <p className="text-sm">المطعم: {confirmModal.restaurantScope}</p>
            )}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmModal(null)}>
                إلغاء العملية
              </Button>
              <Button
                variant="outline"
                onClick={() => decidePending("reject")}
                loading={actionLoading === `decide-${confirmModal.id}`}
              >
                رفض
              </Button>
              <Button
                onClick={() => decidePending("once")}
                loading={actionLoading === `decide-${confirmModal.id}`}
              >
                موافقة لمرة واحدة
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
