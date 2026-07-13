"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  Badge,
  LoadingSpinner,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { RESERVATION_STATUS_LABELS } from "@/lib/reception";
import { VISIT_STATUS_LABELS } from "@/lib/customer-history";
import { tableIconEmoji } from "@/lib/table-meta";
import { Download, Users, CalendarDays, ClipboardList, BarChart3 } from "lucide-react";

type Tab = "customers" | "reservations" | "visits" | "reports";

interface CustomerRow {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  visitCount: number;
  totalSpending: number;
  lastVisitAt?: string | null;
  isVip: boolean;
  notes?: string | null;
  favoriteTable?: { number: number | null; label: string | null; zone: string | null } | null;
  favoriteArea?: string | null;
}

interface ReservationRow {
  id: string;
  customerName: string;
  customerPhone: string;
  guestCount: number;
  date: string;
  time: string;
  tableNumber?: number | null;
  tableLabel?: string | null;
  tableIcon?: string | null;
  tableZone?: string | null;
  minimumSpendAmount?: number | null;
  occasion?: string | null;
  notes?: string | null;
  status: string;
  arrivedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  noShowAt?: string | null;
  createdAt: string;
}

interface VisitRow {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  tableNumber?: number | null;
  tableNumberSnapshot?: string | null;
  tableLabel?: string | null;
  branchName?: string | null;
  visitDateDisplay: string;
  enteredAtDisplay: string;
  seatedAtDisplay: string;
  sessionStartedAtDisplay: string;
  sessionEndedAtDisplay: string;
  sessionDurationDisplay: string;
  registeredByName: string;
  assignedByName: string;
  closedByName: string;
  visitStatus: string;
  totalBill: number;
  guestCount: number;
}

interface Reports {
  visitedToday: number;
  visitedThisMonth: number;
  totalVisits: number;
  noShows: number;
  repeatCustomers: number;
  vipCustomers: number;
  mostFrequentCustomers: {
    id: string;
    customerName: string;
    customerPhone?: string | null;
    visitCount: number;
    totalSpending: number;
    isVip: boolean;
  }[];
}

const PRESETS = [
  { id: "", label: "الكل" },
  { id: "today", label: "اليوم" },
  { id: "yesterday", label: "أمس" },
  { id: "last7", label: "7 أيام" },
  { id: "last30", label: "30 يوم" },
  { id: "last90", label: "3 أشهر" },
  { id: "custom", label: "مخصص" },
];

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "customers";
  const [tab, setTab] = useState<Tab>(
    ["customers", "reservations", "visits", "reports"].includes(initialTab)
      ? initialTab
      : "customers"
  );
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [reports, setReports] = useState<Reports | null>(null);
  const [selected, setSelected] = useState<{
    customerName: string;
    customerPhone?: string | null;
    visitCount: number;
    totalSpending: number;
    lastVisitAt?: string | null;
    notes?: string | null;
    favoriteTable?: { number: number | null; label: string | null; zone: string | null } | null;
    favoriteArea?: string | null;
    reservations: ReservationRow[];
    visits: VisitRow[];
  } | null>(null);

  const [preset, setPreset] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [branchId, setBranchId] = useState("");
  const [staffUserId, setStaffUserId] = useState("");
  const [status, setStatus] = useState("all");
  const [filterOptions, setFilterOptions] = useState<{
    branches: { id: string; name: string; nameAr?: string | null }[];
    staff: { userId: string; name: string; role: string }[];
  }>({ branches: [], staff: [] });

  const queryString = useCallback(() => {
    const p = new URLSearchParams();
    p.set("view", tab === "reports" ? "reports" : tab);
    if (preset) p.set("preset", preset);
    if (preset === "custom" && dateFrom) p.set("dateFrom", dateFrom);
    if (preset === "custom" && dateTo) p.set("dateTo", dateTo);
    if (phone) p.set("phone", phone);
    if (name) p.set("name", name);
    if (tableNumber) p.set("tableNumber", tableNumber);
    if (branchId) p.set("branchId", branchId);
    if (staffUserId) p.set("staffUserId", staffUserId);
    if (status !== "all") p.set("status", status);
    return p.toString();
  }, [tab, preset, dateFrom, dateTo, phone, name, tableNumber, branchId, staffUserId, status]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/customers?${queryString()}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    if (tab === "customers") setCustomers(data.customers || []);
    else if (tab === "reservations") setReservations(data.reservations || []);
    else if (tab === "visits") {
      setVisits(data.visits || []);
      if (data.filters) setFilterOptions(data.filters);
    }
    else if (tab === "reports") setReports(data);
    setLoading(false);
  }, [queryString, tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function openCustomer(id: string) {
    const res = await fetch(`/api/customers/${id}`);
    if (!res.ok) return;
    setSelected(await res.json());
  }

  function exportCsv(type: string) {
    const p = new URLSearchParams(queryString());
    p.set("type", type);
    window.open(`/api/customers/export?${p.toString()}`, "_blank");
  }

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "customers", label: "العملاء", icon: Users },
    { id: "reservations", label: "سجل الحجوزات", icon: CalendarDays },
    { id: "visits", label: "سجل الزيارات", icon: ClipboardList },
    { id: "reports", label: "التقارير", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="سجل العملاء"
        description="سجل دائم للعملاء والحجوزات والزيارات"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/reception">
              <Button variant="outline">الاستقبال</Button>
            </Link>
            <Link href="/dashboard/reservations">
              <Button variant="outline">الحجوزات</Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
              tab === id ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id || "all"}
              onClick={() => setPreset(p.id)}
              className={`rounded-full px-3 py-1 text-xs ${
                preset === p.id ? "bg-emerald-600 text-white" : "bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex flex-wrap gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded border px-2 py-1 text-sm" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded border px-2 py-1 text-sm" />
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <input placeholder="الجوال" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded border px-3 py-2 text-sm" />
          <input placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} className="rounded border px-3 py-2 text-sm" />
          <input placeholder="رقم الطاولة" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="rounded border px-3 py-2 text-sm" />
          {tab === "visits" && (
            <>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="rounded border px-3 py-2 text-sm">
                <option value="">كل الفروع</option>
                {filterOptions.branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.nameAr || b.name}</option>
                ))}
              </select>
              <select value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)} className="rounded border px-3 py-2 text-sm">
                <option value="">كل الموظفين</option>
                {filterOptions.staff.map((s) => (
                  <option key={s.userId} value={s.userId}>{s.name}</option>
                ))}
              </select>
            </>
          )}
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border px-3 py-2 text-sm">
            <option value="all">كل الحالات</option>
            {tab === "reservations" &&
              Object.entries(RESERVATION_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            {tab === "visits" &&
              Object.entries(VISIT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
          </select>
          <div className="flex gap-2">
            <Button size="sm" onClick={load}>بحث</Button>
            {tab === "customers" && (
              <Button size="sm" variant="outline" onClick={() => exportCsv("customers")}>
                <Download className="h-4 w-4" /> CSV
              </Button>
            )}
            {tab === "reservations" && (
              <Button size="sm" variant="outline" onClick={() => exportCsv("reservations")}>
                <Download className="h-4 w-4" /> CSV
              </Button>
            )}
            {tab === "visits" && (
              <Button size="sm" variant="outline" onClick={() => exportCsv("visits")}>
                <Download className="h-4 w-4" /> CSV
              </Button>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner />
      ) : tab === "reports" && reports ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "زوار اليوم", value: reports.visitedToday },
            { label: "زوار هذا الشهر", value: reports.visitedThisMonth },
            { label: "إجمالي الزيارات", value: reports.totalVisits },
            { label: "عملاء متكررون", value: reports.repeatCustomers },
            { label: "عملاء VIP", value: reports.vipCustomers },
            { label: "لم يحضروا", value: reports.noShows },
          ].map((item) => (
            <Card key={item.label} className="p-4">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-2xl font-bold">{item.value}</p>
            </Card>
          ))}
          <Card className="col-span-full p-4">
            <h3 className="mb-3 font-semibold">الأكثر زيارة</h3>
            <div className="space-y-2">
              {reports.mostFrequentCustomers.map((c) => (
                <div key={c.id} className="flex justify-between text-sm">
                  <span>{c.customerName} {c.isVip && <Badge>VIP</Badge>}</span>
                  <span>{c.visitCount} زيارة · {c.totalSpending} ر.س</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : tab === "customers" ? (
        customers.length === 0 ? (
          <EmptyState title="لا يوجد عملاء" />
        ) : (
          <div className="grid gap-3">
            {customers.map((c) => (
              <Card key={c.id} className="cursor-pointer p-4 hover:bg-gray-50" onClick={() => openCustomer(c.id)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{c.customerName} {c.isVip && <Badge>VIP</Badge>}</p>
                    <p className="text-sm text-gray-500">{c.customerPhone || "—"}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    {c.visitCount} زيارة · {c.totalSpending} ر.س
                    {c.favoriteTable?.number != null &&
                      ` · ${tableIconEmoji(null)} طاولة مفضلة ${c.favoriteTable.number}${c.favoriteTable.label ? ` (${c.favoriteTable.label})` : ""}`}
                    {c.favoriteArea && ` · ${c.favoriteArea}`}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : tab === "reservations" ? (
        reservations.length === 0 ? (
          <EmptyState title="لا توجد حجوزات" />
        ) : (
          <div className="grid gap-3">
            {reservations.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.customerName}</p>
                    <p className="text-sm text-gray-500">{r.customerPhone}</p>
                    <p className="text-sm">{new Date(r.date).toLocaleDateString("ar-SA")} · {r.time} · {r.guestCount} ضيوف</p>
                    {r.tableNumber != null && (
                      <p className="text-xs text-gray-500">
                        {tableIconEmoji(r.tableIcon)} طاولة {r.tableNumber}
                        {r.tableLabel ? ` (${r.tableLabel})` : ""}
                        {r.tableZone ? ` · ${r.tableZone}` : ""}
                        {r.minimumSpendAmount ? ` · حد أدنى ${r.minimumSpendAmount} ر.س` : ""}
                      </p>
                    )}
                  </div>
                  <Badge>{RESERVATION_STATUS_LABELS[r.status] || r.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : visits.length === 0 ? (
        <EmptyState title="لا توجد زيارات" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-right text-xs">
                <th className="px-2 py-2">الاسم</th>
                <th className="px-2 py-2">الجوال</th>
                <th className="px-2 py-2">تاريخ الزيارة</th>
                <th className="px-2 py-2">وقت الدخول</th>
                <th className="px-2 py-2">وقت الجلوس</th>
                <th className="px-2 py-2">الطاولة</th>
                <th className="px-2 py-2">بدء الجلسة</th>
                <th className="px-2 py-2">انتهاء الجلسة</th>
                <th className="px-2 py-2">المدة</th>
                <th className="px-2 py-2">التسجيل</th>
                <th className="px-2 py-2">تعيين الطاولة</th>
                <th className="px-2 py-2">إنهاء الجلسة</th>
                <th className="px-2 py-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id} className="border-b hover:bg-slate-50">
                  <td className="px-2 py-2 font-medium">{v.customerName}</td>
                  <td className="px-2 py-2">{v.customerPhone || "—"}</td>
                  <td className="px-2 py-2">{v.visitDateDisplay}</td>
                  <td className="px-2 py-2">{v.enteredAtDisplay}</td>
                  <td className="px-2 py-2">{v.seatedAtDisplay}</td>
                  <td className="px-2 py-2">{v.tableNumberSnapshot ?? v.tableNumber ?? "—"}</td>
                  <td className="px-2 py-2">{v.sessionStartedAtDisplay}</td>
                  <td className="px-2 py-2">{v.sessionEndedAtDisplay}</td>
                  <td className="px-2 py-2">{v.sessionDurationDisplay}</td>
                  <td className="px-2 py-2">{v.registeredByName}</td>
                  <td className="px-2 py-2">{v.assignedByName}</td>
                  <td className="px-2 py-2">{v.closedByName}</td>
                  <td className="px-2 py-2">
                    <Badge>{VISIT_STATUS_LABELS[v.visitStatus] || v.visitStatus}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <Card className="max-h-[80vh] w-full max-w-2xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{selected.customerName}</h2>
            <p className="text-sm text-gray-500">{selected.customerPhone}</p>
            <p className="mt-2 text-sm">
              {selected.visitCount} زيارة · {selected.totalSpending} ر.س
              {selected.favoriteTable?.number != null &&
                ` · طاولة مفضلة ${selected.favoriteTable.number}${selected.favoriteTable.label ? ` (${selected.favoriteTable.label})` : ""}`}
              {selected.favoriteArea && ` · منطقة ${selected.favoriteArea}`}
            </p>
            {selected.notes && <p className="mt-2 text-sm text-gray-600">{selected.notes}</p>}
            <h3 className="mt-4 font-semibold">الحجوزات</h3>
            <div className="mt-2 space-y-1 text-sm">
              {selected.reservations.map((r) => (
                <p key={r.id}>{new Date(r.date).toLocaleDateString("ar-SA")} {r.time} — {RESERVATION_STATUS_LABELS[r.status]}</p>
              ))}
            </div>
            <h3 className="mt-4 font-semibold">الزيارات</h3>
            <div className="mt-2 space-y-1 text-sm">
              {selected.visits.map((v) => (
                <p key={v.id}>
                  طاولة {v.tableNumberSnapshot ?? v.tableNumber ?? "—"}
                  {v.tableLabel ? ` (${v.tableLabel})` : ""} — {v.totalBill} ر.س
                  {" — "}{VISIT_STATUS_LABELS[v.visitStatus] || v.visitStatus}
                  {" · "}{v.visitDateDisplay} {v.enteredAtDisplay}
                </p>
              ))}
            </div>
            <Button className="mt-4" variant="outline" onClick={() => setSelected(null)}>إغلاق</Button>
          </Card>
        </div>
      )}
    </div>
  );
}
