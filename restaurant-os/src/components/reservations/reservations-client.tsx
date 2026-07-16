"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { REGISTER_STATUS_LABELS } from "@/lib/reservation-labels";
import {
  Check,
  X,
  MapPin,
  UserCheck,
  ArrowRightLeft,
  Ban,
  UserX,
  History,
  Banknote,
  Search,
  LayoutGrid,
  Table2,
  Calendar,
  Download,
  Printer,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { TABLE_ICONS, tableIconEmoji } from "@/lib/table-meta";

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

const emptyManualTable = {
  number: "",
  label: "",
  tableIcon: "REGULAR",
  zone: "",
  capacity: 4,
  minimumSpendAmount: "",
};

export default function ReservationsClient({ mode = "active" }: Props) {
  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"table" | "cards" | "calendar">("table");
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
    <div className="space-y-4">
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
                <Button variant="outline">
                  <History className="h-4 w-4" /> السجل الكامل
                </Button>
              </Link>
            )}
            {mode === "history" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => window.open(`/api/reservations?mode=history&export=csv&quick=full`, "_blank")}
                >
                  <Download className="h-4 w-4" /> تصدير CSV
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> طباعة
                </Button>
              </>
            )}
            {mode !== "history" && (
              <Button onClick={() => setCreateOpen(true)}>حجز جديد</Button>
            )}
          </div>
        }
      />

      {stats && mode !== "history" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {[
            { key: "today", label: "حجوزات اليوم", v: stats.today },
            { key: "upcoming", label: "القادمة", v: stats.upcoming },
            { key: "pending", label: "قيد المراجعة", v: stats.pending },
            { key: "arrived", label: "تم الوصول", v: stats.arrived },
            { key: "seated", label: "على الطاولة", v: stats.seated },
            { key: "completedToday", label: "مكتملة اليوم", v: stats.completedToday },
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
              className="rounded-xl border border-gray-200 bg-white p-3 text-right hover:border-emerald-300"
            >
              <p className="text-2xl font-bold text-emerald-700">{s.v}</p>
              <p className="text-xs text-gray-600">{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Card className="space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className="w-full rounded-lg border border-gray-300 py-2 pr-10 pl-3 text-sm"
              placeholder="بحث بالاسم، الجوال، رقم الحجز..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">أقرب موعد</option>
            <option value="createdAt">أحدث تسجيل</option>
            <option value="customerName">اسم العميل</option>
            <option value="status">الحالة</option>
            <option value="guestCount">عدد الضيوف</option>
          </select>
          <div className="flex gap-1">
            <Button size="sm" variant={view === "table" ? "primary" : "outline"} onClick={() => setView("table")}>
              <Table2 className="h-4 w-4" /> جدول
            </Button>
            <Button size="sm" variant={view === "cards" ? "primary" : "outline"} onClick={() => setView("cards")}>
              <LayoutGrid className="h-4 w-4" /> بطاقات
            </Button>
            <Button size="sm" variant={view === "calendar" ? "primary" : "outline"} onClick={() => setView("calendar")}>
              <Calendar className="h-4 w-4" /> تقويم
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setQuick(f.id);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                quick === f.id ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="لا توجد حجوزات مطابقة" />
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-right text-xs text-gray-600">
              <tr>
                <th className="whitespace-nowrap px-3 py-2">رقم الحجز</th>
                <th className="whitespace-nowrap px-3 py-2">العميل</th>
                <th className="whitespace-nowrap px-3 py-2">الجوال</th>
                <th className="whitespace-nowrap px-3 py-2">الضيوف</th>
                <th className="whitespace-nowrap px-3 py-2">موعد الحجز</th>
                <th className="whitespace-nowrap px-3 py-2">تاريخ التسجيل</th>
                <th className="whitespace-nowrap px-3 py-2">وقت التسجيل</th>
                <th className="whitespace-nowrap px-3 py-2">المصدر</th>
                <th className="whitespace-nowrap px-3 py-2">الفرع</th>
                <th className="whitespace-nowrap px-3 py-2">الطاولة</th>
                <th className="whitespace-nowrap px-3 py-2">الحد الأدنى</th>
                <th className="whitespace-nowrap px-3 py-2">العربون</th>
                <th className="whitespace-nowrap px-3 py-2">الحالة</th>
                <th className="whitespace-nowrap px-3 py-2">وقت الوصول</th>
                <th className="whitespace-nowrap px-3 py-2">وقت الجلوس</th>
                <th className="whitespace-nowrap px-3 py-2">إنهاء الجلسة</th>
                <th className="whitespace-nowrap px-3 py-2">أنشأ</th>
                <th className="whitespace-nowrap px-3 py-2">آخر تعديل</th>
                <th className="whitespace-nowrap px-3 py-2">ملاحظات</th>
                <th className="whitespace-nowrap px-3 py-2">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-t border-gray-100 hover:bg-emerald-50/40"
                  onClick={() => openDetail(r.id)}
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.reservationNumber}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{r.customerName}</td>
                  <td className="whitespace-nowrap px-3 py-2" dir="ltr">{r.customerPhone}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.guestCount}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.reservationDateTimeDisplay}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.createdDateDisplay}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.createdTimeDisplay}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.sourceLabel}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.branchName || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.tableDisplay || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.minimumSpendAmount ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.depositStatus || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Badge className={STATUS_COLORS[r.status] || ""}>{r.statusLabel}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">
                    {r.arrivedAt ? new Date(r.arrivedAt).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" }) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">
                    {r.seatedAt ? new Date(r.seatedAt).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" }) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">
                    {r.sessionEndedAt ? new Date(r.sessionEndedAt).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" }) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{r.createdByName || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{r.updatedByName || "—"}</td>
                  <td className="max-w-[140px] truncate px-3 py-2 text-xs text-gray-600">{r.notes || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <RowActions row={r} onPatch={patch} onAssign={setAssignModal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === "calendar" ? (
        <div className="space-y-4">
          {calendarGroups.map(([day, list]) => (
            <Card key={day} className="p-4">
              <h3 className="mb-2 font-bold">{day}</h3>
              <div className="space-y-2">
                {list.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border border-gray-100 p-2 text-right hover:bg-gray-50"
                    onClick={() => openDetail(r.id)}
                  >
                    <span>
                      {r.reservationTime} — {r.customerName} ({r.guestCount} ضيوف)
                    </span>
                    <Badge className={STATUS_COLORS[r.status] || ""}>{r.statusLabel}</Badge>
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id} className="cursor-pointer p-4" onClick={() => openDetail(r.id)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-gray-500">{r.reservationNumber}</p>
                  <h3 className="font-bold">{r.customerName}</h3>
                  <p className="text-sm text-gray-600" dir="ltr">{r.customerPhone}</p>
                </div>
                <Badge className={STATUS_COLORS[r.status] || ""}>{r.statusLabel}</Badge>
              </div>
              <p className="mt-2 text-sm">{r.reservationDateTimeDisplay}</p>
              <p className="text-xs text-gray-500">تسجيل: {r.createdDateTimeDisplay}</p>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            صفحة {page} من {totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {detailId && detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setDetailId(null)}>
          <div
            className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-gray-500">{detail.reservation.reservationNumber}</p>
                <h2 className="text-xl font-bold">{detail.reservation.customerName}</h2>
                <Badge className={`mt-2 ${STATUS_COLORS[detail.reservation.status] || ""}`}>
                  {detail.reservation.statusLabel}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => setDetailId(null)}>
                إغلاق
              </Button>
            </div>

            <section className="mt-6 space-y-2">
              <h3 className="font-semibold text-gray-900">العميل</h3>
              <p className="text-sm" dir="ltr">{detail.reservation.customerPhone}</p>
              {detail.customer && (
                <p className="text-sm text-gray-600">
                  زيارات سابقة: {detail.customer.visitCount ?? 0}
                  {detail.customer.totalSpending != null
                    ? ` — إجمالي الإنفاق: ${detail.customer.totalSpending}`
                    : ""}
                </p>
              )}
            </section>

            <section className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs text-gray-500">تاريخ التسجيل</p>
                <p className="font-medium">{detail.reservation.createdDateDisplay}</p>
                <p className="text-sm text-gray-600">{detail.reservation.createdTimeDisplay}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs text-gray-500">موعد الحجز</p>
                <p className="font-medium">{detail.reservation.reservationDateDisplay}</p>
                <p className="text-sm text-gray-600">{detail.reservation.reservationTime}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs text-gray-500">الضيوف / المصدر / الفرع</p>
                <p className="text-sm">
                  {detail.reservation.guestCount} ضيوف — {detail.reservation.sourceLabel}
                  {detail.reservation.branchName ? ` — ${detail.reservation.branchName}` : ""}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs text-gray-500">الطاولة / الحد الأدنى</p>
                <p className="text-sm">
                  {detail.reservation.tableDisplay || "—"}
                  {detail.reservation.minimumSpendAmount != null
                    ? ` — ${detail.reservation.minimumSpendAmount} ر.س`
                    : ""}
                </p>
              </div>
            </section>

            {detail.reservation.notes && (
              <section className="mt-4 rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">ملاحظات</p>
                <p className="text-sm">{detail.reservation.notes}</p>
              </section>
            )}

            {detail.timeline && detail.timeline.length > 0 && (
              <section className="mt-6">
                <h3 className="mb-3 font-semibold">المسار الزمني</h3>
                <ol className="space-y-3 border-r-2 border-emerald-200 pr-4">
                  {detail.timeline.map((t, i) => (
                    <li key={i} className="text-sm">
                      <p className="font-medium">{t.label}</p>
                      <p className="text-gray-600">{t.atDisplay}</p>
                      {t.byName && <p className="text-xs text-gray-500">بواسطة: {t.byName}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {detail.statusHistory && detail.statusHistory.length > 0 && (
              <section className="mt-6">
                <h3 className="mb-2 font-semibold">سجل تغيير الحالة</h3>
                <div className="space-y-2">
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
                      {h.note && <p className="text-xs text-gray-600">{h.note}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-6 rounded-lg border border-gray-100 p-3 text-sm">
              <h3 className="mb-2 font-semibold">نشاط الموظفين</h3>
              <p>أنشأ: {detail.reservation.createdByName || "—"}</p>
              <p>أكّد: {detail.reservation.confirmedByName || "—"}</p>
              <p>عيّن الطاولة: {detail.reservation.assignedByName || "—"}</p>
              <p>أنهى الجلسة: {detail.reservation.completedByName || "—"}</p>
            </section>
          </div>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="حجز جديد">
        <form onSubmit={createReservation} className="space-y-3">
          <input className="w-full rounded-lg border px-3 py-2" placeholder="اسم العميل" required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <input className="w-full rounded-lg border px-3 py-2" placeholder="الجوال" required value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
          <input type="number" className="w-full rounded-lg border px-3 py-2" placeholder="عدد الضيوف" value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: parseInt(e.target.value) || 2 })} />
          <input type="date" className="w-full rounded-lg border px-3 py-2" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input type="time" className="w-full rounded-lg border px-3 py-2" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <textarea className="w-full rounded-lg border px-3 py-2" placeholder="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button type="submit" loading={saving}>حفظ الحجز</Button>
        </form>
      </Modal>

      {assignModal && (
        <Modal open onClose={() => setAssignModal(null)} title="تعيين طاولة">
          <select className="mb-3 w-full rounded-lg border px-3 py-2" value={assignTableId} onChange={(e) => setAssignTableId(e.target.value)}>
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

function RowActions({
  row,
  onPatch,
  onAssign,
}: {
  row: RegisterRow;
  onPatch: (id: string, body: Record<string, unknown>, confirm?: string) => void;
  onAssign: (r: RegisterRow) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {row.status === "PENDING" && (
        <>
          <Button size="sm" onClick={() => onPatch(row.id, { action: "confirm" })}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="danger" onClick={() => onPatch(row.id, { action: "reject" }, "رفض هذا الحجز؟")}>
            <X className="h-3 w-3" />
          </Button>
        </>
      )}
      {["APPROVED", "CONFIRMED", "PENDING"].includes(row.status) && (
        <Button size="sm" variant="secondary" onClick={() => onPatch(row.id, { action: "mark_arrived" })}>
          <UserCheck className="h-3 w-3" />
        </Button>
      )}
      {row.status !== "COMPLETED" && row.status !== "CANCELLED" && (
        <Button size="sm" variant="outline" onClick={() => onAssign(row)}>
          <MapPin className="h-3 w-3" />
        </Button>
      )}
      {row.tableId && ["ARRIVED", "CHECKED_IN", "APPROVED", "CONFIRMED"].includes(row.status) && (
        <Button size="sm" onClick={() => onPatch(row.id, { action: "seat", tableId: row.tableId })}>
          <ArrowRightLeft className="h-3 w-3" />
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          const url = `https://wa.me/${row.customerPhone.replace(/\D/g, "")}`;
          window.open(url, "_blank");
        }}
      >
        <MessageCircle className="h-3 w-3" />
      </Button>
      {!["COMPLETED", "CANCELLED", "REJECTED"].includes(row.status) && (
        <Button size="sm" variant="danger" onClick={() => onPatch(row.id, { action: "cancel" }, "إلغاء الحجز؟")}>
          <Ban className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
