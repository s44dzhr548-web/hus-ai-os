"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  History,
  Search,
  LayoutGrid,
  Table2,
  Calendar,
  Download,
  Printer,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react";

export type RegisterRow = {
  id: string;
  reservationNumber: string;
  customerName: string;
  customerPhone: string;
  guestCount: number;
  reservationDateDisplay: string;
  reservationTime: string;
  reservationDateTimeDisplay: string;
  createdDateDisplay: string;
  createdTimeDisplay: string;
  createdDateTimeDisplay: string;
  sourceLabel: string;
  branchName: string | null;
  tableId: string | null;
  tableDisplay: string | null;
  minimumSpendAmount: number | null;
  depositStatus: string | null;
  status: string;
  statusLabel: string;
  arrivedAt: string | null;
  seatedAt: string | null;
  sessionEndedAt: string | null;
  notes: string | null;
  createdByName: string | null;
  updatedByName: string | null;
  assignedByName: string | null;
  confirmedByName: string | null;
  completedByName: string | null;
  activeSessionId?: string | null;
};

type DetailPayload = {
  reservation: RegisterRow;
  customer?: {
    visitCount?: number;
    totalSpending?: number;
    lastVisitAt?: string | null;
  } | null;
  timeline?: { label: string; atDisplay: string; byName?: string | null }[];
  statusHistory?: {
    previousLabel: string | null;
    newLabel: string;
    changedAtDisplay: string;
    changedByName: string | null;
    note: string | null;
  }[];
};

type Stats = {
  today: number;
  upcoming: number;
  pending: number;
  arrived: number;
  seated: number;
  completedToday: number;
  noShow: number;
  cancelled: number;
};

type ViewMode = "compact-table" | "full-table" | "cards" | "calendar";

type Props = {
  mode?: "active" | "history";
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  ARRIVED: "bg-blue-100 text-blue-800",
  CHECKED_IN: "bg-amber-100 text-amber-800",
  SEATED: "bg-purple-100 text-purple-800",
  CONVERTED: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  REJECTED: "bg-red-100 text-red-800",
  NO_SHOW: "bg-orange-100 text-orange-800",
};

const QUICK_FILTERS = [
  { id: "today", label: "اليوم" },
  { id: "tomorrow", label: "غدًا" },
  { id: "week", label: "هذا الأسبوع" },
  { id: "upcoming", label: "القادمة" },
  { id: "arrived", label: "تم الوصول" },
  { id: "seated", label: "على الطاولة" },
  { id: "completed", label: "المكتملة" },
  { id: "cancelled", label: "الملغية" },
  { id: "no_show", label: "لم يحضر" },
  { id: "pending", label: "قيد المراجعة" },
  { id: "full", label: "الكل" },
];

function formatTs(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" });
}

export default function ReservationsClient({ mode = "active" }: Props) {
  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("compact-table");
  const [quick, setQuick] = useState(mode === "history" ? "full" : "upcoming");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignModal, setAssignModal] = useState<RegisterRow | null>(null);
  const [tables, setTables] = useState<{ id: string; number: number; label?: string }[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    guestCount: 2,
    date: "",
    time: "",
    notes: "",
    tableId: "",
    minimumSpendAmount: "",
  });
  const [assignTableId, setAssignTableId] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({
      mode,
      quick,
      sortBy,
      sortDir: "asc",
      page: String(page),
      pageSize: "50",
    });
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/reservations?${params}`);
    if (!res.ok) {
      setError("تعذر تحميل الحجوزات");
      return;
    }
    const data = await res.json();
    setRows(data.reservations || []);
    setStats(data.stats || null);
    setTotalPages(data.pagination?.pages || 1);
    setError("");
  }, [mode, quick, q, sortBy, page]);

  useEffect(() => {
    load().finally(() => setLoading(false));
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    fetch("/api/tables")
      .then((r) => r.json())
      .then((t) => setTables(Array.isArray(t) ? t : t.tables || []))
      .catch(() => {});
  }, []);

  async function openDetail(id: string) {
    setDetailId(id);
    const res = await fetch(`/api/reservations/${id}`);
    if (res.ok) setDetail(await res.json());
  }

  async function patch(id: string, body: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    const res = await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "فشل العملية");
      return;
    }
    setError("");
    if (detailId === id) openDetail(id);
    load();
  }

  async function createReservation(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, source: "dashboard" }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "فشل الإنشاء");
      return;
    }
    setCreateOpen(false);
    setForm({
      customerName: "",
      customerPhone: "",
      guestCount: 2,
      date: "",
      time: "",
      notes: "",
      tableId: "",
      minimumSpendAmount: "",
    });
    load();
  }

  const calendarGroups = useMemo(() => {
    const m = new Map<string, RegisterRow[]>();
    for (const r of rows) {
      const k = r.reservationDateDisplay;
      const list = m.get(k) || [];
      list.push(r);
      m.set(k, list);
    }
    return [...m.entries()];
  }, [rows]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <PageHeader
        title={mode === "history" ? "السجل الكامل للحجوزات" : "سجل الحجوزات"}
        description={
          mode === "history"
            ? "جميع الحجوزات التاريخية محفوظة بشكل دائم وقابلة للبحث"
            : "إدارة الحجوزات النشطة — كل حجز يبقى محفوظًا في السجل"
        }
        action={
          <div className="flex flex-wrap gap-2">
            {mode !== "history" && (
              <Link href="/dashboard/reservations/history">
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4" /> السجل الكامل
                </Button>
              </Link>
            )}
            {mode === "history" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/api/reservations?mode=history&export=csv&quick=full`, "_blank")}
                >
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/api/reservations?mode=history&export=pdf&quick=full`, "_blank")}
                >
                  <Download className="h-4 w-4" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> طباعة
                </Button>
              </>
            )}
            {mode !== "history" && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                حجز جديد
              </Button>
            )}
          </div>
        }
      />

      {stats && mode !== "history" && (
        <div className="grid grid-cols-4 gap-1.5 lg:grid-cols-8">
          {[
            { key: "today", label: "اليوم", v: stats.today },
            { key: "upcoming", label: "القادمة", v: stats.upcoming },
            { key: "pending", label: "قيد المراجعة", v: stats.pending },
            { key: "arrived", label: "تم الوصول", v: stats.arrived },
            { key: "seated", label: "على الطاولة", v: stats.seated },
            { key: "completedToday", label: "مكتملة", v: stats.completedToday },
            { key: "noShow", label: "لم يحضر", v: stats.noShow },
            { key: "cancelled", label: "ملغاة", v: stats.cancelled },
          ].map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                const map: Record<string, string> = {
                  today: "today",
                  upcoming: "upcoming",
                  pending: "pending",
                  arrived: "arrived",
                  seated: "seated",
                  completedToday: "completed",
                  noShow: "no_show",
                  cancelled: "cancelled",
                };
                setQuick(map[s.key] || "full");
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right hover:border-emerald-300"
            >
              <p className="text-lg font-bold leading-tight text-emerald-700">{s.v}</p>
              <p className="truncate text-[10px] text-gray-600">{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[140px] flex-1">
            <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
            <input
              className="w-full rounded-lg border border-gray-300 py-1.5 pr-8 pl-2 text-sm"
              placeholder="بحث..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            value={quick}
            onChange={(e) => {
              setQuick(e.target.value);
              setPage(1);
            }}
          >
            {QUICK_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">أقرب موعد</option>
            <option value="createdAt">أحدث تسجيل</option>
            <option value="customerName">اسم العميل</option>
            <option value="status">الحالة</option>
            <option value="guestCount">عدد الضيوف</option>
          </select>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={view === "compact-table" ? "primary" : "outline"}
              onClick={() => setView("compact-table")}
            >
              <Table2 className="h-3.5 w-3.5" /> جدول مختصر
            </Button>
            <Button
              size="sm"
              variant={view === "full-table" ? "primary" : "outline"}
              onClick={() => setView("full-table")}
            >
              جدول كامل
            </Button>
            <Button
              size="sm"
              variant={view === "cards" ? "primary" : "outline"}
              onClick={() => setView("cards")}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> بطاقات
            </Button>
            <Button
              size="sm"
              variant={view === "calendar" ? "primary" : "outline"}
              onClick={() => setView("calendar")}
            >
              <Calendar className="h-3.5 w-3.5" /> تقويم
            </Button>
          </div>
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="لا توجد حجوزات مطابقة" />
      ) : view === "compact-table" ? (
        <CompactTable
          rows={rows}
          onOpenDetail={openDetail}
          onPatch={patch}
          onAssign={setAssignModal}
        />
      ) : view === "full-table" ? (
        <FullTable rows={rows} onOpenDetail={openDetail} onPatch={patch} onAssign={setAssignModal} />
      ) : view === "calendar" ? (
        <div className="space-y-3">
          {calendarGroups.map(([day, list]) => (
            <Card key={day} className="p-3">
              <h3 className="mb-2 text-sm font-bold">{day}</h3>
              <div className="space-y-1.5">
                {list.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border border-gray-100 p-2 text-right text-sm hover:bg-gray-50"
                    onClick={() => openDetail(r.id)}
                  >
                    <span className="truncate">
                      {r.reservationTime} — {r.customerName} ({r.guestCount})
                    </span>
                    <Badge className={STATUS_COLORS[r.status] || ""}>{r.statusLabel}</Badge>
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id} className="cursor-pointer p-3" onClick={() => openDetail(r.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-gray-500">{r.reservationNumber}</p>
                  <h3 className="truncate font-bold">{r.customerName}</h3>
                  <p className="text-xs text-gray-600" dir="ltr">
                    {r.customerPhone}
                  </p>
                </div>
                <Badge className={STATUS_COLORS[r.status] || ""}>{r.statusLabel}</Badge>
              </div>
              <p className="mt-1 truncate text-xs">{r.reservationDateTimeDisplay}</p>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-xs text-gray-600">
            {page} / {totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {detailId && detail && (
        <DetailDrawer detail={detail} onClose={() => setDetailId(null)} />
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="حجز جديد">
        <form onSubmit={createReservation} className="space-y-3">
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="اسم العميل"
            required
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
          />
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="الجوال"
            required
            value={form.customerPhone}
            onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
          />
          <input
            type="number"
            className="w-full rounded-lg border px-3 py-2"
            placeholder="عدد الضيوف"
            value={form.guestCount}
            onChange={(e) => setForm({ ...form, guestCount: parseInt(e.target.value) || 2 })}
          />
          <input
            type="date"
            className="w-full rounded-lg border px-3 py-2"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <input
            type="time"
            className="w-full rounded-lg border px-3 py-2"
            required
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
          <textarea
            className="w-full rounded-lg border px-3 py-2"
            placeholder="ملاحظات"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <Button type="submit" loading={saving}>
            حفظ الحجز
          </Button>
        </form>
      </Modal>

      {assignModal && (
        <Modal open onClose={() => setAssignModal(null)} title="تعيين طاولة">
          <select
            className="mb-3 w-full rounded-lg border px-3 py-2"
            value={assignTableId}
            onChange={(e) => setAssignTableId(e.target.value)}
          >
            <option value="">اختر طاولة</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label || t.number}
              </option>
            ))}
          </select>
          <Button
            onClick={() => {
              if (!assignTableId) return;
              patch(assignModal.id, { action: "assign_table", tableId: assignTableId });
              setAssignModal(null);
            }}
          >
            تعيين
          </Button>
        </Modal>
      )}
    </div>
  );
}

function CompactTable({
  rows,
  onOpenDetail,
  onPatch,
  onAssign,
}: {
  rows: RegisterRow[];
  onOpenDetail: (id: string) => void;
  onPatch: (id: string, body: Record<string, unknown>, confirm?: string) => void;
  onAssign: (r: RegisterRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full table-fixed text-sm" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "90px" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "56px" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "72px" }} />
          <col style={{ width: "100px" }} />
          <col style={{ width: "120px" }} />
        </colgroup>
        <thead className="bg-gray-50 text-right text-[11px] text-gray-600">
          <tr>
            <th className="px-2 py-2">رقم الحجز</th>
            <th className="px-2 py-2">العميل والجوال</th>
            <th className="px-2 py-2 text-center">الضيوف</th>
            <th className="px-2 py-2">موعد الحجز</th>
            <th className="px-2 py-2">الطاولة</th>
            <th className="px-2 py-2">الحالة</th>
            <th className="px-2 py-2">الإجراء</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="cursor-pointer border-t border-gray-100 hover:bg-emerald-50/40"
              onClick={() => onOpenDetail(r.id)}
            >
              <td className="truncate px-2 py-2 font-mono text-[11px]">{r.reservationNumber}</td>
              <td className="px-2 py-2">
                <p className="truncate text-sm font-medium">{r.customerName}</p>
                <p className="truncate text-[11px] text-gray-500" dir="ltr">
                  {r.customerPhone}
                </p>
              </td>
              <td className="px-2 py-2 text-center">{r.guestCount}</td>
              <td className="px-2 py-2">
                <p className="truncate text-xs">{r.reservationDateDisplay}</p>
                <p className="truncate text-[11px] text-gray-500">{r.reservationTime}</p>
              </td>
              <td className="truncate px-2 py-2 text-xs">{r.tableDisplay || "—"}</td>
              <td className="px-2 py-2">
                <Badge className={`text-[10px] ${STATUS_COLORS[r.status] || ""}`}>{r.statusLabel}</Badge>
              </td>
              <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                <CompactRowActions row={r} onPatch={onPatch} onAssign={onAssign} onOpenDetail={onOpenDetail} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FullTable({
  rows,
  onOpenDetail,
  onPatch,
  onAssign,
}: {
  rows: RegisterRow[];
  onOpenDetail: (id: string) => void;
  onPatch: (id: string, body: Record<string, unknown>, confirm?: string) => void;
  onAssign: (r: RegisterRow) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-[1200px] text-sm">
        <thead className="bg-gray-50 text-right text-xs text-gray-600">
          <tr>
            <th className="px-2 py-2">رقم الحجز</th>
            <th className="px-2 py-2">العميل</th>
            <th className="px-2 py-2">الجوال</th>
            <th className="px-2 py-2">الضيوف</th>
            <th className="px-2 py-2">موعد الحجز</th>
            <th className="px-2 py-2">التسجيل</th>
            <th className="px-2 py-2">المصدر</th>
            <th className="px-2 py-2">الفرع</th>
            <th className="px-2 py-2">الطاولة</th>
            <th className="px-2 py-2">الحد الأدنى</th>
            <th className="px-2 py-2">الحالة</th>
            <th className="px-2 py-2">الوصول</th>
            <th className="px-2 py-2">الجلوس</th>
            <th className="px-2 py-2">الانتهاء</th>
            <th className="px-2 py-2">أنشأ</th>
            <th className="px-2 py-2">ملاحظات</th>
            <th className="px-2 py-2">الإجراء</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="cursor-pointer border-t border-gray-100 hover:bg-emerald-50/40"
              onClick={() => onOpenDetail(r.id)}
            >
              <td className="whitespace-nowrap px-2 py-2 font-mono text-xs">{r.reservationNumber}</td>
              <td className="px-2 py-2">{r.customerName}</td>
              <td className="px-2 py-2" dir="ltr">
                {r.customerPhone}
              </td>
              <td className="px-2 py-2">{r.guestCount}</td>
              <td className="px-2 py-2">{r.reservationDateTimeDisplay}</td>
              <td className="px-2 py-2">{r.createdDateTimeDisplay}</td>
              <td className="px-2 py-2">{r.sourceLabel}</td>
              <td className="px-2 py-2">{r.branchName || "—"}</td>
              <td className="px-2 py-2">{r.tableDisplay || "—"}</td>
              <td className="px-2 py-2">{r.minimumSpendAmount ?? "—"}</td>
              <td className="px-2 py-2">
                <Badge className={STATUS_COLORS[r.status] || ""}>{r.statusLabel}</Badge>
              </td>
              <td className="px-2 py-2 text-xs">{formatTs(r.arrivedAt)}</td>
              <td className="px-2 py-2 text-xs">{formatTs(r.seatedAt)}</td>
              <td className="px-2 py-2 text-xs">{formatTs(r.sessionEndedAt)}</td>
              <td className="px-2 py-2 text-xs">{r.createdByName || "—"}</td>
              <td className="max-w-[120px] truncate px-2 py-2 text-xs">{r.notes || "—"}</td>
              <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                <CompactRowActions row={r} onPatch={onPatch} onAssign={onAssign} onOpenDetail={onOpenDetail} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompactRowActions({
  row,
  onPatch,
  onAssign,
  onOpenDetail,
}: {
  row: RegisterRow;
  onPatch: (id: string, body: Record<string, unknown>, confirm?: string) => void;
  onAssign: (r: RegisterRow) => void;
  onOpenDetail: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  const primary = getPrimaryAction(row, onPatch, onAssign, onOpenDetail);

  return (
    <div className="flex items-center gap-1">
      {primary && (
        <Button
          size="sm"
          className="h-7 whitespace-nowrap px-2 text-[11px]"
          variant={primary.variant || "primary"}
          onClick={(e) => {
            e.stopPropagation();
            primary.onClick();
          }}
        >
          {primary.label}
        </Button>
      )}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          aria-label="المزيد"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <SecondaryMenuItems row={row} onPatch={onPatch} onAssign={onAssign} onOpenDetail={onOpenDetail} onClose={() => setMenuOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

function getPrimaryAction(
  row: RegisterRow,
  onPatch: (id: string, body: Record<string, unknown>, confirm?: string) => void,
  onAssign: (r: RegisterRow) => void,
  onOpenDetail: (id: string) => void
): { label: string; onClick: () => void; variant?: "primary" | "secondary" | "outline" } | null {
  if (row.status === "PENDING") {
    return { label: "تأكيد", onClick: () => onPatch(row.id, { action: "confirm" }) };
  }
  if (["APPROVED", "CONFIRMED"].includes(row.status)) {
    return {
      label: "وصل العميل",
      onClick: () => {
        const raw = window.prompt(
          "عدد الأشخاص الذين وصلوا (شامل العميل):",
          String(row.guestCount)
        );
        if (raw == null) return;
        const guestCount = parseInt(raw, 10);
        if (!Number.isFinite(guestCount) || guestCount < 1) return;
        onPatch(row.id, { action: "mark_arrived", guestCount });
      },
    };
  }
  if (["ARRIVED", "CHECKED_IN"].includes(row.status)) {
    return { label: "تعيين طاولة", onClick: () => onAssign(row) };
  }
  if (["SEATED", "CONVERTED"].includes(row.status)) {
    return {
      label: "عرض الجلسة",
      variant: "outline",
      onClick: () => window.open("/dashboard/reception", "_blank"),
    };
  }
  if (row.status === "COMPLETED") {
    return { label: "عرض السجل", variant: "outline", onClick: () => onOpenDetail(row.id) };
  }
  return { label: "التفاصيل", variant: "outline", onClick: () => onOpenDetail(row.id) };
}

function SecondaryMenuItems({
  row,
  onPatch,
  onAssign,
  onOpenDetail,
  onClose,
}: {
  row: RegisterRow;
  onPatch: (id: string, body: Record<string, unknown>, confirm?: string) => void;
  onAssign: (r: RegisterRow) => void;
  onOpenDetail: (id: string) => void;
  onClose: () => void;
}) {
  const item = (label: string, action: () => void, danger?: boolean) => (
    <button
      type="button"
      className={`block w-full px-3 py-1.5 text-right text-xs hover:bg-gray-50 ${danger ? "text-red-600" : "text-gray-700"}`}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
        action();
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      {item("التفاصيل", () => onOpenDetail(row.id))}
      {row.status === "PENDING" && item("رفض", () => onPatch(row.id, { action: "reject" }, "رفض هذا الحجز؟"))}
      {row.tableId && ["ARRIVED", "CHECKED_IN", "APPROVED", "CONFIRMED"].includes(row.status) &&
        item("تأكيد الجلوس", () => onPatch(row.id, { action: "seat", tableId: row.tableId }))}
      {!["COMPLETED", "CANCELLED", "REJECTED"].includes(row.status) &&
        item("تعيين / تغيير طاولة", () => onAssign(row))}
      {item("واتساب", () => window.open(`https://wa.me/${row.customerPhone.replace(/\D/g, "")}`, "_blank"))}
      {!["COMPLETED", "CANCELLED", "REJECTED", "NO_SHOW"].includes(row.status) &&
        item("لم يحضر", () => onPatch(row.id, { action: "no_show" }, "تسجيل عدم الحضور؟"))}
      {!["COMPLETED", "CANCELLED", "REJECTED"].includes(row.status) &&
        item("إلغاء", () => onPatch(row.id, { action: "cancel" }, "إلغاء الحجز؟"), true)}
    </>
  );
}

function DetailDrawer({ detail, onClose }: { detail: DetailPayload; onClose: () => void }) {
  const r = detail.reservation;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm text-gray-500">{r.reservationNumber}</p>
            <h2 className="text-xl font-bold">{r.customerName}</h2>
            <Badge className={`mt-2 ${STATUS_COLORS[r.status] || ""}`}>{r.statusLabel}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>

        <section className="mt-5 space-y-1">
          <h3 className="font-semibold text-gray-900">العميل</h3>
          <p className="text-sm" dir="ltr">
            {r.customerPhone}
          </p>
          {detail.customer && (
            <p className="text-sm text-gray-600">
              زيارات سابقة: {detail.customer.visitCount ?? 0}
              {detail.customer.totalSpending != null ? ` — إجمالي: ${detail.customer.totalSpending} ر.س` : ""}
            </p>
          )}
        </section>

        <section className="mt-5 grid gap-2 sm:grid-cols-2">
          <DetailField label="تاريخ التسجيل" value={r.createdDateDisplay} sub={r.createdTimeDisplay} />
          <DetailField label="موعد الحجز" value={r.reservationDateDisplay} sub={r.reservationTime} />
          <DetailField label="المصدر" value={r.sourceLabel} />
          <DetailField label="الفرع" value={r.branchName || "—"} />
          <DetailField label="الطاولة" value={r.tableDisplay || "—"} />
          <DetailField
            label="الحد الأدنى"
            value={r.minimumSpendAmount != null ? `${r.minimumSpendAmount} ر.س` : "—"}
          />
          <DetailField label="وقت الوصول" value={formatTs(r.arrivedAt)} />
          <DetailField label="وقت الجلوس" value={formatTs(r.seatedAt)} />
          <DetailField label="وقت الانتهاء" value={formatTs(r.sessionEndedAt)} />
        </section>

        {r.notes && (
          <section className="mt-4 rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">ملاحظات</p>
            <p className="text-sm">{r.notes}</p>
          </section>
        )}

        {detail.timeline && detail.timeline.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-2 font-semibold">المسار الزمني</h3>
            <ol className="space-y-2 border-r-2 border-emerald-200 pr-3">
              {detail.timeline.map((t, i) => (
                <li key={i} className="text-sm">
                  <p className="font-medium">{t.label}</p>
                  <p className="text-gray-600">{t.atDisplay}</p>
                  {t.byName && <p className="text-xs text-gray-500">{t.byName}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {detail.statusHistory && detail.statusHistory.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-2 font-semibold">سجل تغيير الحالة</h3>
            <div className="space-y-1.5">
              {detail.statusHistory.map((h, i) => (
                <div key={i} className="rounded-lg border border-gray-100 p-2 text-sm">
                  <p>
                    {h.previousLabel ? `${h.previousLabel} → ` : ""}
                    {h.newLabel}
                  </p>
                  <p className="text-xs text-gray-500">
                    {h.changedAtDisplay}
                    {h.changedByName ? ` — ${h.changedByName}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-5 rounded-lg border border-gray-100 p-3 text-sm">
          <h3 className="mb-2 font-semibold">نشاط الموظفين</h3>
          <p>أنشأ: {r.createdByName || "—"}</p>
          <p>أكّد: {r.confirmedByName || "—"}</p>
          <p>عيّن الطاولة: {r.assignedByName || "—"}</p>
          <p>آخر تعديل: {r.updatedByName || "—"}</p>
          <p>أنهى الجلسة: {r.completedByName || "—"}</p>
        </section>
      </div>
    </div>
  );
}

function DetailField({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 p-2.5">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-sm font-medium">{value}</p>
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
    </div>
  );
}
