"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  Badge,
  Modal,
  LoadingSpinner,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { TABLE_SESSION_STATUS_LABELS } from "@/lib/reception";
import { TABLE_ICONS, tableIconEmoji } from "@/lib/table-meta";
import { AUDIT_FIELD_LABELS } from "@/lib/session-audit";
import {
  ExternalLink,
  ClipboardList,
  XCircle,
  Users,
  Phone,
  Banknote,
  Clock,
  Pencil,
  ArrowRightLeft,
} from "lucide-react";

interface TableCard {
  table: {
    id: string;
    number: number;
    label?: string | null;
    tableIcon?: string | null;
    tableIconEmoji?: string;
    zone?: string | null;
    capacity: number;
    minimumSpendAmount?: number | null;
    branchId: string;
    branchName: string;
    menuUrl: string;
    notes?: string | null;
  };
  session: {
    id: string;
    customerName: string;
    customerPhone?: string | null;
    guestCount: number;
    minimumSpendAmount?: number | null;
    tableNumber?: number;
    tableDisplayNumber?: string | null;
    tableTitle?: string;
    tableLabel?: string | null;
    tableIcon?: string | null;
    tableIconEmoji?: string;
    tableZone?: string | null;
    status: string;
    notes?: string | null;
    startedAt: string;
    durationMinutes?: number;
    currentBill?: number;
    ordersCount?: number;
  } | null;
  status: string;
}

type EditModal = "edit" | "move" | "minSpend" | null;
type TableMode = "existing" | "manual";

type ConflictState = {
  sessionId: string;
  payload: Record<string, unknown>;
  conflictCustomerName: string;
};

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-gray-100 text-gray-700",
  WAITING: "bg-amber-100 text-amber-800",
  SEATED: "bg-blue-100 text-blue-800",
  ORDERING: "bg-purple-100 text-purple-800",
  FOOD_PREPARING: "bg-orange-100 text-orange-800",
  SERVING: "bg-indigo-100 text-indigo-800",
  PAID: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-gray-200 text-gray-600",
};

const SESSION_STATUSES = [
  "WAITING",
  "SEATED",
  "ORDERING",
  "FOOD_PREPARING",
  "SERVING",
  "PAID",
  "COMPLETED",
];

const SORT_OPTIONS = [
  { id: "sortOrder", label: "الترتيب الافتراضي" },
  { id: "number", label: "رقم الطاولة" },
  { id: "zone", label: "المنطقة" },
  { id: "status", label: "الحالة" },
  { id: "minimumSpend", label: "الحد الأدنى" },
  { id: "capacity", label: "السعة" },
];

const emptyManualTable = {
  tableNumber: "",
  label: "",
  zone: "",
  tableIcon: "REGULAR",
  minimumSpendAmount: "",
  notes: "",
};

const FORCE_ROLES = ["OWNER", "ADMIN", "MANAGER"];

function tableCardTitle(table: TableCard["table"], session: TableCard["session"]) {
  if (session?.tableTitle) return session.tableTitle;
  const icon = session?.tableIconEmoji || table.tableIconEmoji || "🪑";
  const display =
    session?.tableDisplayNumber ||
    session?.tableLabel ||
    table.label ||
    String(table.number);
  if (/^\d+$/.test(display)) return `${icon} طاولة ${display}`;
  return `${icon} ${display}`;
}

function WalkInTableInput({
  tableNumber,
  onTableNumberChange,
  tableId,
  onTableIdChange,
  availableTables,
  showPicker,
  onTogglePicker,
}: {
  tableNumber: string;
  onTableNumberChange: (v: string) => void;
  tableId: string;
  onTableIdChange: (id: string) => void;
  availableTables: TableCard[];
  showPicker: boolean;
  onTogglePicker: () => void;
}) {
  return (
    <div className="space-y-2" data-testid="walkin-table-input">
      <label className="block text-sm font-medium text-gray-700">
        رقم الطاولة *
        <input
          required={!tableId}
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="1 · 15 · A12 · VIP-01 · Garden-5"
          value={tableNumber}
          onChange={(e) => {
            onTableNumberChange(e.target.value);
            if (tableId) onTableIdChange("");
          }}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
          data-testid="manual-table-number"
        />
      </label>
      <button
        type="button"
        onClick={onTogglePicker}
        className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline"
        data-testid="pick-existing-table-btn"
      >
        {showPicker ? "إخفاء قائمة الطاولات" : "اختيار من الطاولات"}
      </button>
      {showPicker && (
        <label className="block text-sm font-medium text-gray-700">
          الطاولة من القائمة
          <select
            value={tableId}
            onChange={(e) => {
              onTableIdChange(e.target.value);
              const picked = availableTables.find((c) => c.table.id === e.target.value);
              if (picked) {
                onTableNumberChange(
                  picked.table.label?.trim() || String(picked.table.number)
                );
              }
            }}
            className="mt-1 w-full rounded-lg border px-3 py-2.5 text-base"
            data-testid="existing-table-select"
          >
            <option value="">— اختر طاولة —</option>
            {availableTables.map((c) => (
              <option key={c.table.id} value={c.table.id}>
                {c.table.tableIconEmoji || "🪑"} طاولة {c.table.number}
                {c.table.label ? ` — ${c.table.label}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function TableModeToggle({
  mode,
  onChange,
  idPrefix,
}: {
  mode: TableMode;
  onChange: (m: TableMode) => void;
  idPrefix: string;
}) {
  return (
    <fieldset className="space-y-2" data-testid={`${idPrefix}-table-mode-toggle`}>
      <legend className="text-sm font-medium text-gray-700">تعيين الطاولة</legend>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label
          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-sm ${
            mode === "existing"
              ? "border-emerald-600 bg-emerald-50 text-emerald-900"
              : "border-gray-200 bg-white"
          }`}
        >
          <input
            type="radio"
            name={`${idPrefix}-table-mode`}
            checked={mode === "existing"}
            onChange={() => onChange("existing")}
            className="h-4 w-4 accent-emerald-600"
          />
          اختيار طاولة موجودة
        </label>
        <label
          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-sm ${
            mode === "manual"
              ? "border-emerald-600 bg-emerald-50 text-emerald-900"
              : "border-gray-200 bg-white"
          }`}
          data-testid={`${idPrefix}-manual-mode-label`}
        >
          <input
            type="radio"
            name={`${idPrefix}-table-mode`}
            checked={mode === "manual"}
            onChange={() => onChange("manual")}
            className="h-4 w-4 accent-emerald-600"
            data-testid="table-mode-manual"
          />
          إدخال يدوي
        </label>
      </div>
    </fieldset>
  );
}

function ManualTableFields({
  value,
  onChange,
  idPrefix,
}: {
  value: typeof emptyManualTable & { capacity?: number };
  onChange: (v: typeof emptyManualTable & { capacity?: number }) => void;
  idPrefix: string;
}) {
  return (
    <div
      className="space-y-3 rounded-lg border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-3"
      data-testid={`${idPrefix}-manual-fields`}
    >
      <label className="block text-sm font-medium text-gray-700">
        رقم الطاولة *
        <input
          required
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="12 · 100 · A12 · VIP-01 · Garden-5"
          value={value.tableNumber}
          onChange={(e) => onChange({ ...value, tableNumber: e.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
          data-testid="manual-table-number"
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        اسم أو وصف الطاولة (اختياري)
        <input
          type="text"
          placeholder="VIP Corner · ركن العائلات"
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        منطقة الطاولة (اختياري)
        <input
          type="text"
          placeholder="Garden · Terrace · Main Hall"
          value={value.zone}
          onChange={(e) => onChange({ ...value, zone: e.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        أيقونة الطاولة
        <select
          value={value.tableIcon}
          onChange={(e) => onChange({ ...value, tableIcon: e.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
        >
          {TABLE_ICONS.map((i) => (
            <option key={i.id} value={i.id}>
              {i.emoji} {i.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-gray-700">
        الحد الأدنى للطلبات (ريال)
        <input
          type="number"
          min={0}
          step="0.01"
          placeholder="150"
          value={value.minimumSpendAmount}
          onChange={(e) => onChange({ ...value, minimumSpendAmount: e.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        ملاحظات
        <textarea
          placeholder="ملاحظات الطاولة"
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
          rows={2}
        />
      </label>
    </div>
  );
}

export default function ReceptionPage() {
  const [cards, setCards] = useState<TableCard[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; nameAr?: string }[]>([]);
  const [branchId, setBranchId] = useState("");
  const [sortBy, setSortBy] = useState("sortOrder");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableMode, setTableMode] = useState<TableMode>("manual");
  const [editTarget, setEditTarget] = useState<{ card: TableCard; mode: EditModal } | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [auditLogs, setAuditLogs] = useState<
    {
      field: string;
      oldValue: string | null;
      newValue: string | null;
      staffName: string | null;
      createdAt: string;
    }[]
  >([]);

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    guestCount: 2,
    tableId: "",
    notes: "",
    minimumSpendAmount: "",
    status: "SEATED",
    marketingConsent: false,
  });
  const [manualTable, setManualTable] = useState({
    ...emptyManualTable,
    capacity: 4,
  });
  const [editForm, setEditForm] = useState({
    customerName: "",
    customerPhone: "",
    guestCount: 2,
    minimumSpendAmount: "",
    notes: "",
    status: "SEATED",
    tableId: "",
    tableMode: "existing" as TableMode,
    manualTableNumber: "",
    manualTableLabel: "",
    manualTableZone: "",
    manualTableIcon: "REGULAR",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (branchId) params.set("branchId", branchId);
    if (sortBy) params.set("sortBy", sortBy);
    const q = params.toString() ? `?${params}` : "";
    const res = await fetch(`/api/reception${q}`);
    if (!res.ok) {
      setError("تعذر تحميل بيانات الاستقبال");
      return;
    }
    const data = await res.json();
    setCards(data.cards || []);
    setBranches(data.branches || []);
    if (!branchId && data.branches?.[0]) setBranchId(data.branches[0].id);
  }, [branchId, sortBy]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUserRole(d?.user?.role ?? null))
      .catch(() => {});
    load().finally(() => setLoading(false));
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  function openEdit(card: TableCard, mode: EditModal) {
    if (!card.session) return;
    const s = card.session;
    setEditForm({
      customerName: s.customerName,
      customerPhone: s.customerPhone || "",
      guestCount: s.guestCount,
      minimumSpendAmount: s.minimumSpendAmount?.toString() || "",
      notes: s.notes || "",
      status: s.status,
      tableId: card.table.id,
      tableMode: "existing",
      manualTableNumber: s.tableDisplayNumber || String(s.tableNumber ?? ""),
      manualTableLabel: s.tableLabel || "",
      manualTableZone: s.tableZone || "",
      manualTableIcon: s.tableIcon || "REGULAR",
    });
    setAuditLogs([]);
    fetch(`/api/reception/${s.id}`)
      .then((r) => r.json())
      .then((d) => setAuditLogs(d.auditLogs || []))
      .catch(() => {});
    setEditTarget({ card, mode });
    setError("");
  }

  async function patchSession(
    sessionId: string,
    body: Record<string, unknown>,
    forceAssign = false
  ) {
    const res = await fetch(`/api/reception/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, forceAssign }),
    });
    const data = await res.json();
    if (res.status === 409 && data.code === "TABLE_OCCUPIED") {
      setConflict({ sessionId, payload: body, conflictCustomerName: data.conflictCustomerName });
      return null;
    }
    if (!res.ok) {
      setError(data.errorAr || data.error || "فشل التحديث");
      return null;
    }
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    load();
    return data.session;
  }

  async function saveEdit(forceAssign = false) {
    if (!editTarget?.card.session) return;
    if (forceAssign && !confirm("تأكيد التعيين الإجباري؟ سيتم إغلاق الجلسة النشطة على هذه الطاولة.")) {
      return;
    }
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      customerName: editForm.customerName,
      customerPhone: editForm.customerPhone || null,
      guestCount: editForm.guestCount,
      notes: editForm.notes,
      status: editForm.status,
    };

    if (editTarget.mode === "minSpend" || editTarget.mode === "edit") {
      body.minimumSpendAmount = editForm.minimumSpendAmount || null;
    }

    if (editTarget.mode === "move" || editTarget.mode === "edit") {
      if (editTarget.mode === "move" && editForm.tableMode === "existing") {
        body.tableId = editForm.tableId;
      } else if (editForm.manualTableNumber.trim()) {
        body.manualTable = {
          tableNumber: editForm.manualTableNumber.trim(),
          label: editForm.manualTableLabel || undefined,
          zone: editForm.manualTableZone || undefined,
          tableIcon: editForm.manualTableIcon,
        };
      }
    }

    const result = await patchSession(editTarget.card.session.id, body, forceAssign);
    setSaving(false);
    if (result) {
      setEditTarget(null);
      setConflict(null);
    }
  }

  async function createWalkIn(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload: Record<string, unknown> = {
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      guestCount: form.guestCount,
      notes: form.notes,
      status: form.status,
      branchId,
      marketingConsent: form.marketingConsent,
    };

    if (form.tableId) {
      payload.tableId = form.tableId;
      payload.minimumSpendAmount = form.minimumSpendAmount || undefined;
    } else if (manualTable.tableNumber.trim()) {
      payload.manualTable = {
        number: manualTable.tableNumber.trim(),
        label: manualTable.label || undefined,
        zone: manualTable.zone || undefined,
        tableIcon: manualTable.tableIcon,
        capacity: manualTable.capacity,
        minimumSpendAmount:
          manualTable.minimumSpendAmount ||
          form.minimumSpendAmount ||
          undefined,
        notes: manualTable.notes || undefined,
      };
      if (form.minimumSpendAmount) {
        payload.minimumSpendAmount = form.minimumSpendAmount;
      }
    } else {
      setError("رقم الطاولة مطلوب");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "فشل تسجيل العميل");
      return;
    }
    setWalkInOpen(false);
    setShowTablePicker(false);
    setTableMode("manual");
    setForm({
      customerName: "",
      customerPhone: "",
      guestCount: 2,
      tableId: "",
      notes: "",
      minimumSpendAmount: "",
      status: "SEATED",
      marketingConsent: false,
    });
    setManualTable({ ...emptyManualTable, capacity: 4 });
    load();
  }

  async function closeSession(sessionId: string) {
    if (!confirm("إنهاء الجلسة وتحرير الطاولة؟")) return;
    await fetch(`/api/reception/${sessionId}`, { method: "DELETE" });
    load();
  }

  function openWalkInModal(preselectedTableId?: string) {
    setError("");
    setShowTablePicker(!!preselectedTableId);
    setTableMode("manual");
    if (preselectedTableId) {
      const picked = cards.find((c) => c.table.id === preselectedTableId);
      setForm((f) => ({
        ...f,
        tableId: preselectedTableId,
        customerName: "",
        customerPhone: "",
        guestCount: 2,
        notes: "",
        minimumSpendAmount: "",
        status: "SEATED",
        marketingConsent: false,
      }));
      setManualTable({
        ...emptyManualTable,
        capacity: picked?.table.capacity ?? 4,
        tableNumber: picked
          ? picked.table.label?.trim() || String(picked.table.number)
          : "",
      });
    } else {
      setForm({
        customerName: "",
        customerPhone: "",
        guestCount: 2,
        tableId: "",
        notes: "",
        minimumSpendAmount: "",
        status: "SEATED",
        marketingConsent: false,
      });
      setManualTable({ ...emptyManualTable, capacity: 4 });
    }
    setWalkInOpen(true);
  }

  const filteredCards = branchId ? cards.filter((c) => c.table.branchId === branchId) : cards;
  const availableTables = filteredCards.filter((c) => !c.session);
  const canForce = userRole != null && FORCE_ROLES.includes(userRole);

  if (loading) return <LoadingSpinner />;

  const editTitle =
    editTarget?.mode === "move"
      ? "تغيير الطاولة"
      : editTarget?.mode === "minSpend"
        ? "تعديل الحد الأدنى"
        : "تعديل البيانات";

  return (
    <div className="space-y-4 px-1 sm:space-y-6 sm:px-0">
      <PageHeader
        title="الاستقبال"
        description="تسجيل العملاء وتعيين الطاولات"
        action={<Button onClick={() => openWalkInModal()}>تسجيل عميل جديد</Button>}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        {branches.length > 1 && (
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-auto"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nameAr || b.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-auto"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {filteredCards.length === 0 ? (
        <EmptyState title="لا توجد طاولات" description="أضف طاولات من قسم الطاولات" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCards.map((card) => {
            const { table, session, status } = card;
            const title = tableCardTitle(table, session);
            const minSpend = session?.minimumSpendAmount ?? table.minimumSpendAmount;

            return (
              <Card key={table.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-bold">{title}</h3>
                    <p className="text-xs text-gray-500">
                      {table.branchName}
                      {(session?.tableZone || table.zone) && ` · ${session?.tableZone || table.zone}`}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[status] || STATUS_COLORS.AVAILABLE}>
                    {TABLE_SESSION_STATUS_LABELS[status] || status}
                  </Badge>
                </div>

                {minSpend != null && minSpend > 0 && (
                  <Badge className="w-fit bg-amber-100 text-amber-800">حد أدنى {minSpend} ر.س</Badge>
                )}

                {session ? (
                  <>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">{session.customerName}</p>
                      {session.customerPhone && (
                        <p className="flex items-center gap-1 text-gray-600">
                          <Phone className="h-3.5 w-3.5 shrink-0" /> {session.customerPhone}
                        </p>
                      )}
                      <p className="flex items-center gap-1 text-gray-600">
                        <Users className="h-3.5 w-3.5 shrink-0" /> {session.guestCount} ضيوف
                      </p>
                      {session.notes && <p className="text-xs text-gray-500">{session.notes}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
                      <Button size="sm" variant="outline" className="w-full" onClick={() => openEdit(card, "edit")}>
                        <Pencil className="h-3.5 w-3.5" /> تعديل البيانات
                      </Button>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => openEdit(card, "move")}>
                        <ArrowRightLeft className="h-3.5 w-3.5" /> تغيير الطاولة
                      </Button>
                      <Button size="sm" variant="secondary" className="w-full" onClick={() => openEdit(card, "minSpend")}>
                        <Banknote className="h-3.5 w-3.5" /> تعديل الحد الأدنى
                      </Button>
                      <Button size="sm" variant="danger" className="w-full" onClick={() => closeSession(session.id)}>
                        <XCircle className="h-3.5 w-3.5" /> إنهاء الجلسة
                      </Button>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <Link href={table.menuUrl} target="_blank">
                        <Button variant="outline" size="sm" className="w-full">
                          <ExternalLink className="h-3.5 w-3.5" /> المنيو
                        </Button>
                      </Link>
                      <Link href={`/dashboard/orders?tableId=${table.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <ClipboardList className="h-3.5 w-3.5" /> الطلبات
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col justify-between gap-3">
                    <p className="text-sm text-gray-500">سعة {table.capacity} · متاحة</p>
                    <Button size="sm" onClick={() => openWalkInModal(table.id)}>
                      تسجيل عميل
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={walkInOpen} onClose={() => setWalkInOpen(false)} title="تسجيل عميل جديد">
        <form onSubmit={createWalkIn} className="space-y-4" data-testid="walk-in-form">
          <label className="block text-sm font-medium">
            اسم العميل *
            <input
              required
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2.5 text-base"
            />
          </label>
          <label className="block text-sm font-medium">
            رقم الجوال
            <input
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2.5 text-base"
              dir="ltr"
              inputMode="tel"
            />
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            <input
              type="checkbox"
              checked={form.marketingConsent}
              onChange={(e) =>
                setForm({ ...form, marketingConsent: e.target.checked })
              }
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />
            <span>
              أوافق على استقبال رسائل متعلقة بزيارتي وتقييم الخدمة عبر واتساب.
            </span>
          </label>
          <label className="block text-sm font-medium">
            عدد الضيوف
            <input
              type="number"
              min={1}
              value={form.guestCount}
              onChange={(e) => setForm({ ...form, guestCount: parseInt(e.target.value) || 1 })}
              className="mt-1 w-full rounded-lg border px-3 py-2.5 text-base"
            />
          </label>

          <WalkInTableInput
            tableNumber={manualTable.tableNumber}
            onTableNumberChange={(v) =>
              setManualTable({ ...manualTable, tableNumber: v })
            }
            tableId={form.tableId}
            onTableIdChange={(id) => setForm({ ...form, tableId: id })}
            availableTables={availableTables}
            showPicker={showTablePicker}
            onTogglePicker={() => setShowTablePicker((v) => !v)}
          />

          <label className="block text-sm font-medium">
            الحد الأدنى للجلسة (ريال)
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.minimumSpendAmount}
              onChange={(e) => setForm({ ...form, minimumSpendAmount: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2.5 text-base"
            />
          </label>

          <label className="block text-sm font-medium">
            ملاحظات الجلسة
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2.5 text-base"
              rows={2}
            />
          </label>

          <label className="block text-sm font-medium">
            الحالة
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2.5 text-base"
            >
              {SESSION_STATUSES.filter((s) => s !== "COMPLETED").map((s) => (
                <option key={s} value={s}>
                  {TABLE_SESSION_STATUS_LABELS[s] || s}
                </option>
              ))}
            </select>
          </label>

          <Button type="submit" loading={saving} className="w-full">
            حفظ وتعيين الطاولة
          </Button>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={editTitle}>
        {editTarget && (
          <div className="space-y-4">
            {editTarget.mode !== "minSpend" && (
              <>
                <input
                  required
                  placeholder="اسم العميل"
                  value={editForm.customerName}
                  onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2.5 text-base"
                />
                <input
                  placeholder="رقم الجوال"
                  value={editForm.customerPhone}
                  onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2.5 text-base"
                  dir="ltr"
                  inputMode="tel"
                />
                <input
                  type="number"
                  min={1}
                  placeholder="عدد الضيوف"
                  value={editForm.guestCount}
                  onChange={(e) => setEditForm({ ...editForm, guestCount: parseInt(e.target.value) || 1 })}
                  className="w-full rounded-lg border px-3 py-2.5 text-base"
                />
              </>
            )}

            {(editTarget.mode === "minSpend" || editTarget.mode === "edit") && (
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="الحد الأدنى (ريال)"
                value={editForm.minimumSpendAmount}
                onChange={(e) => setEditForm({ ...editForm, minimumSpendAmount: e.target.value })}
                className="w-full rounded-lg border px-3 py-2.5 text-base"
              />
            )}

            {editTarget.mode === "edit" && (
              <>
                <ManualTableFields
                  idPrefix="edit"
                  value={{
                    tableNumber: editForm.manualTableNumber,
                    label: editForm.manualTableLabel,
                    zone: editForm.manualTableZone,
                    tableIcon: editForm.manualTableIcon,
                    minimumSpendAmount: editForm.minimumSpendAmount,
                    notes: editForm.notes,
                  }}
                  onChange={(v) =>
                    setEditForm({
                      ...editForm,
                      manualTableNumber: v.tableNumber,
                      manualTableLabel: v.label,
                      manualTableZone: v.zone,
                      manualTableIcon: v.tableIcon,
                      minimumSpendAmount: v.minimumSpendAmount ?? editForm.minimumSpendAmount,
                      notes: v.notes ?? editForm.notes,
                    })
                  }
                />
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2.5 text-base"
                >
                  {SESSION_STATUSES.filter((s) => s !== "COMPLETED").map((s) => (
                    <option key={s} value={s}>
                      {TABLE_SESSION_STATUS_LABELS[s] || s}
                    </option>
                  ))}
                </select>
              </>
            )}

            {editTarget.mode === "move" && (
              <>
                <TableModeToggle
                  mode={editForm.tableMode}
                  onChange={(m) => setEditForm({ ...editForm, tableMode: m })}
                  idPrefix="move"
                />
                {editForm.tableMode === "existing" ? (
                  <select
                    value={editForm.tableId}
                    onChange={(e) => setEditForm({ ...editForm, tableId: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2.5 text-base"
                  >
                    <option value="">— اختر طاولة —</option>
                    {filteredCards
                      .filter((c) => c.table.id !== editTarget.card.table.id)
                      .map((c) => (
                        <option key={c.table.id} value={c.table.id}>
                          {tableIconEmoji(c.table.tableIcon)} {c.table.number}
                          {c.table.label ? ` — ${c.table.label}` : ""}
                          {c.session ? " (مشغولة)" : ""}
                        </option>
                      ))}
                  </select>
                ) : (
                  <ManualTableFields
                    idPrefix="move"
                    value={{
                      tableNumber: editForm.manualTableNumber,
                      label: editForm.manualTableLabel,
                      zone: editForm.manualTableZone,
                      tableIcon: editForm.manualTableIcon,
                      minimumSpendAmount: "",
                      notes: "",
                    }}
                    onChange={(v) =>
                      setEditForm({
                        ...editForm,
                        manualTableNumber: v.tableNumber,
                        manualTableLabel: v.label,
                        manualTableZone: v.zone,
                        manualTableIcon: v.tableIcon,
                      })
                    }
                  />
                )}
              </>
            )}

            {auditLogs.length > 0 && editTarget.mode === "edit" && (
              <div className="max-h-32 overflow-y-auto rounded-lg bg-gray-50 p-2 text-xs">
                <p className="mb-1 font-semibold">سجل التعديلات</p>
                {auditLogs.slice(0, 8).map((l) => (
                  <p key={l.createdAt + l.field} className="text-gray-600">
                    {AUDIT_FIELD_LABELS[l.field] || l.field}: {l.oldValue ?? "—"} → {l.newValue ?? "—"}
                  </p>
                ))}
              </div>
            )}

            <Button onClick={() => saveEdit()} loading={saving} className="w-full">
              حفظ التعديلات
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={!!conflict} onClose={() => setConflict(null)} title="تعارض الطاولة">
        {conflict && (
          <div className="space-y-4">
            <p className="text-sm text-amber-800">
              هذه الطاولة لديها جلسة نشطة بالفعل.
              <br />
              <span className="font-medium">العميل الحالي: {conflict.conflictCustomerName}</span>
            </p>
            <p className="text-xs text-gray-600">
              لا يمكن تعيين الطاولة إلا بعد نقل أو إنهاء الجلسة الحالية.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => setConflict(null)}>
                إلغاء
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setConflict(null);
                  if (editTarget) openEdit(editTarget.card, "move");
                }}
              >
                نقل العميل لطاولة أخرى
              </Button>
              {canForce && (
                <Button variant="danger" onClick={() => saveEdit(true)} loading={saving}>
                  تعيين إجباري (مالك/مدير)
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
