"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Badge,
  Modal,
  LoadingSpinner,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { RESERVATION_STATUS_LABELS } from "@/lib/reception";
import { TABLE_ICONS, tableIconEmoji } from "@/lib/table-meta";
import { Check, X, MapPin, UserCheck, ArrowRightLeft, Ban, UserX, History, Banknote } from "lucide-react";
import Link from "next/link";

interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  guestCount: number;
  date: string;
  time: string;
  occasion?: string | null;
  notes?: string | null;
  preferredArea?: string | null;
  tableId?: string | null;
  tableNumber?: number | null;
  tableLabel?: string | null;
  tableIcon?: string | null;
  tableZone?: string | null;
  minimumSpendAmount?: number | null;
  status: string;
}

interface TableOption {
  id: string;
  number: number;
  label?: string;
  capacity?: number;
  tableIcon?: string;
}

const emptyManualTable = {
  number: "",
  label: "",
  tableIcon: "REGULAR",
  zone: "",
  capacity: 4,
  minimumSpendAmount: "",
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [assignModal, setAssignModal] = useState<{
    id: string;
    tableId: string;
    mode: "existing" | "manual";
    minimumSpendAmount: string;
  } | null>(null);
  const [tableMode, setTableMode] = useState<"existing" | "manual" | "none">("none");
  const [manualTable, setManualTable] = useState(emptyManualTable);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    guestCount: 2,
    date: "",
    time: "",
    occasion: "",
    notes: "",
    preferredArea: "",
    tableId: "",
    minimumSpendAmount: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const q = filter !== "all" ? `?status=${filter}` : "";
    const [resRes, tablesRes] = await Promise.all([
      fetch(`/api/reservations${q}`),
      fetch("/api/tables"),
    ]);
    if (resRes.ok) {
      const data = await resRes.json();
      setReservations(data.reservations || data);
    }
    if (tablesRes.ok) {
      const t = await tablesRes.json();
      setTables(Array.isArray(t) ? t : []);
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [filter]);

  async function patchReservation(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "فشل العملية");
    } else {
      setError("");
    }
    load();
  }

  async function createReservation(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload: Record<string, unknown> = {
      ...form,
      minimumSpendAmount: form.minimumSpendAmount || undefined,
    };

    if (tableMode === "manual" && manualTable.number) {
      payload.manualTable = {
        ...manualTable,
        number: manualTable.number,
        minimumSpendAmount: manualTable.minimumSpendAmount || undefined,
      };
    } else if (tableMode === "existing" && form.tableId) {
      payload.tableId = form.tableId;
    }

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "فشل إنشاء الحجز");
      return;
    }
    setCreateOpen(false);
    setTableMode("none");
    setManualTable(emptyManualTable);
    setForm({
      customerName: "",
      customerPhone: "",
      guestCount: 2,
      date: "",
      time: "",
      occasion: "",
      notes: "",
      preferredArea: "",
      tableId: "",
      minimumSpendAmount: "",
    });
    load();
  }

  async function assignTable() {
    if (!assignModal) return;
    const body: Record<string, unknown> = {
      action: "assign_table",
      minimumSpendAmount: assignModal.minimumSpendAmount || undefined,
    };
    if (assignModal.mode === "manual") {
      if (!manualTable.number) {
        setError("رقم الطاولة مطلوب");
        return;
      }
      body.manualTable = {
        ...manualTable,
        number: manualTable.number,
      };
    } else {
      if (!assignModal.tableId) return;
      body.tableId = assignModal.tableId;
    }
    await patchReservation(assignModal.id, body);
    setAssignModal(null);
    setManualTable(emptyManualTable);
  }

  const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-emerald-100 text-emerald-800",
    CONFIRMED: "bg-emerald-100 text-emerald-800",
    ARRIVED: "bg-blue-100 text-blue-800",
    CHECKED_IN: "bg-amber-100 text-amber-800",
    SEATED: "bg-purple-100 text-purple-800",
    CANCELLED: "bg-gray-100 text-gray-600",
    CONVERTED: "bg-purple-100 text-purple-800",
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحجوزات"
        description="إنشاء وإدارة حجوزات العملاء"
        action={
          <div className="flex gap-2">
            <Link href="/dashboard/reservations/history">
              <Button variant="outline"><History className="h-4 w-4" /> السجل</Button>
            </Link>
            <Button onClick={() => setCreateOpen(true)}>حجز جديد</Button>
          </div>
        }
      />

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "الكل" },
          { id: "PENDING", label: "قيد المراجعة" },
          { id: "CONFIRMED", label: "مؤكد" },
          { id: "ARRIVED", label: "وصل" },
          { id: "CHECKED_IN", label: "تم الوصول" },
          { id: "SEATED", label: "على الطاولة" },
          { id: "CANCELLED", label: "ملغي" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filter === f.id ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {reservations.length === 0 ? (
        <EmptyState title="لا توجد حجوزات" />
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => (
            <Card
              key={r.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {r.tableIcon && (
                    <span className="text-xl">{tableIconEmoji(r.tableIcon)}</span>
                  )}
                  <h3 className="font-bold">{r.customerName}</h3>
                  <Badge className={STATUS_COLORS[r.status] || ""}>
                    {RESERVATION_STATUS_LABELS[r.status] || r.status}
                  </Badge>
                  {r.minimumSpendAmount != null && r.minimumSpendAmount > 0 && (
                    <Badge className="bg-amber-100 text-amber-800">
                      <Banknote className="mr-1 inline h-3 w-3" />
                      {r.minimumSpendAmount} ر.س
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{r.customerPhone}</p>
                <p className="text-sm text-gray-500">
                  {new Date(r.date).toLocaleDateString("ar-SA")} · {r.time} · {r.guestCount} ضيوف
                  {r.tableNumber != null && (
                    <>
                      {" · "}
                      طاولة {r.tableNumber}
                      {r.tableLabel ? ` (${r.tableLabel})` : ""}
                      {r.tableZone ? ` · ${r.tableZone}` : ""}
                    </>
                  )}
                  {r.preferredArea && !r.tableZone && ` · ${r.preferredArea}`}
                </p>
                {r.occasion && <p className="text-xs text-gray-500">المناسبة: {r.occasion}</p>}
                {r.notes && <p className="text-xs text-gray-500">{r.notes}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                {r.status === "PENDING" && (
                  <>
                    <Button size="sm" onClick={() => patchReservation(r.id, { action: "approve" })}>
                      <Check className="h-4 w-4" /> تأكيد
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => patchReservation(r.id, { action: "reject" })}>
                      <X className="h-4 w-4" /> رفض
                    </Button>
                  </>
                )}
                {!["CANCELLED", "CONVERTED", "REJECTED"].includes(r.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setManualTable(emptyManualTable);
                      setAssignModal({
                        id: r.id,
                        tableId: r.tableId || "",
                        mode: "existing",
                        minimumSpendAmount: r.minimumSpendAmount?.toString() || "",
                      });
                    }}
                  >
                    <MapPin className="h-4 w-4" /> تعيين طاولة
                  </Button>
                )}
                {["CONFIRMED", "APPROVED"].includes(r.status) && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => patchReservation(r.id, { action: "mark_arrived" })}>
                      <UserCheck className="h-4 w-4" /> وصل
                    </Button>
                    <Button size="sm" onClick={() => patchReservation(r.id, { action: "convert", tableId: r.tableId })}>
                      <ArrowRightLeft className="h-4 w-4" /> تحويل لجلسة
                    </Button>
                  </>
                )}
                {r.status === "ARRIVED" && (
                  <Button size="sm" onClick={() => patchReservation(r.id, { action: "convert", tableId: r.tableId })}>
                    <ArrowRightLeft className="h-4 w-4" /> تحويل لجلسة
                  </Button>
                )}
                {!["CANCELLED", "CONVERTED", "NO_SHOW"].includes(r.status) && (
                  <Button size="sm" variant="ghost" onClick={() => patchReservation(r.id, { action: "no_show" })}>
                    <UserX className="h-4 w-4" /> لم يحضر
                  </Button>
                )}
                {!["CANCELLED", "CONVERTED"].includes(r.status) && (
                  <Button size="sm" variant="ghost" onClick={() => patchReservation(r.id, { action: "cancel" })}>
                    <Ban className="h-4 w-4" /> إلغاء
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="حجز جديد">
        <form onSubmit={createReservation} className="space-y-4">
          <input required placeholder="اسم العميل" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
          <input required placeholder="رقم الجوال" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="w-full rounded-lg border px-3 py-2" dir="ltr" />
          <div className="grid grid-cols-3 gap-3">
            <input type="number" min={1} placeholder="الضيوف" value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: parseInt(e.target.value) || 2 })} className="rounded-lg border px-3 py-2" />
            <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-lg border px-3 py-2" />
            <input required type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="rounded-lg border px-3 py-2" />
          </div>
          <input placeholder="المنطقة المفضلة" value={form.preferredArea} onChange={(e) => setForm({ ...form, preferredArea: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
          <input type="number" min={0} step="0.01" placeholder="حد أدنى (ريال)" value={form.minimumSpendAmount} onChange={(e) => setForm({ ...form, minimumSpendAmount: e.target.value })} className="w-full rounded-lg border px-3 py-2" />

          <div className="flex gap-2">
            {(["none", "existing", "manual"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTableMode(mode)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs ${tableMode === mode ? "bg-emerald-600 text-white" : "bg-gray-100"}`}
              >
                {mode === "none" ? "بدون طاولة" : mode === "existing" ? "طاولة موجودة" : "يدوي"}
              </button>
            ))}
          </div>

          {tableMode === "existing" && (
            <select
              value={form.tableId}
              onChange={(e) => setForm({ ...form, tableId: e.target.value })}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">اختر الطاولة</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {tableIconEmoji(t.tableIcon)} طاولة {t.number}
                  {t.label ? ` — ${t.label}` : ""} (سعة {t.capacity ?? 4})
                </option>
              ))}
            </select>
          )}

          {tableMode === "manual" && (
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <input required type="number" min={1} placeholder="رقم الطاولة" value={manualTable.number} onChange={(e) => setManualTable({ ...manualTable, number: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              <input placeholder="تسمية الطاولة" value={manualTable.label} onChange={(e) => setManualTable({ ...manualTable, label: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              <select value={manualTable.tableIcon} onChange={(e) => setManualTable({ ...manualTable, tableIcon: e.target.value })} className="w-full rounded-lg border px-3 py-2">
                {TABLE_ICONS.map((i) => (
                  <option key={i.id} value={i.id}>{i.emoji} {i.label}</option>
                ))}
              </select>
              <input placeholder="المنطقة" value={manualTable.zone} onChange={(e) => setManualTable({ ...manualTable, zone: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              <input type="number" min={1} placeholder="السعة" value={manualTable.capacity} onChange={(e) => setManualTable({ ...manualTable, capacity: parseInt(e.target.value) || 4 })} className="w-full rounded-lg border px-3 py-2" />
            </div>
          )}

          <input placeholder="المناسبة (اختياري)" value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
          <textarea placeholder="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border px-3 py-2" rows={2} />
          <Button type="submit" loading={saving} className="w-full">حفظ الحجز</Button>
        </form>
      </Modal>

      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="تعيين طاولة">
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => assignModal && setAssignModal({ ...assignModal, mode: "existing" })}
            className={`flex-1 rounded-lg px-3 py-2 text-sm ${assignModal?.mode === "existing" ? "bg-emerald-600 text-white" : "bg-gray-100"}`}
          >
            موجودة
          </button>
          <button
            type="button"
            onClick={() => assignModal && setAssignModal({ ...assignModal, mode: "manual" })}
            className={`flex-1 rounded-lg px-3 py-2 text-sm ${assignModal?.mode === "manual" ? "bg-emerald-600 text-white" : "bg-gray-100"}`}
          >
            يدوي
          </button>
        </div>

        {assignModal?.mode === "existing" ? (
          <select
            value={assignModal?.tableId || ""}
            onChange={(e) => setAssignModal((m) => (m ? { ...m, tableId: e.target.value } : null))}
            className="mb-4 w-full rounded-lg border px-3 py-2"
          >
            <option value="">اختر الطاولة</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {tableIconEmoji(t.tableIcon)} طاولة {t.number}
              </option>
            ))}
          </select>
        ) : (
          <div className="mb-4 space-y-2">
            <input type="number" min={1} placeholder="رقم الطاولة" value={manualTable.number} onChange={(e) => setManualTable({ ...manualTable, number: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
            <input placeholder="تسمية" value={manualTable.label} onChange={(e) => setManualTable({ ...manualTable, label: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
            <select value={manualTable.tableIcon} onChange={(e) => setManualTable({ ...manualTable, tableIcon: e.target.value })} className="w-full rounded-lg border px-3 py-2">
              {TABLE_ICONS.map((i) => (
                <option key={i.id} value={i.id}>{i.emoji} {i.label}</option>
              ))}
            </select>
          </div>
        )}

        <input
          type="number"
          min={0}
          step="0.01"
          placeholder="حد أدنى (ريال)"
          value={assignModal?.minimumSpendAmount || ""}
          onChange={(e) => setAssignModal((m) => (m ? { ...m, minimumSpendAmount: e.target.value } : null))}
          className="mb-4 w-full rounded-lg border px-3 py-2"
        />
        <Button onClick={assignTable} className="w-full">حفظ</Button>
      </Modal>
    </div>
  );
}
