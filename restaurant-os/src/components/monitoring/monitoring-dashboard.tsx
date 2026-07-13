"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner } from "@/components/ui";
import { MonitoringShell } from "./monitoring-shell";
import { Bell, Download, RefreshCw, Search } from "lucide-react";

interface Stats {
  customersInside: number;
  enteredToday: number;
  leftToday: number;
  avgSessionMinutes: number;
  occupancyRate: number;
  activeTables: number;
  freeTables: number;
  reservationsToday: number;
  completedSessionsToday: number;
  cancelledReservationsToday: number;
}

interface LiveCustomer {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  tableNumber: number;
  enteredAt: string;
  waitingMinutes: number;
  sessionMinutes: number;
  staffName?: string | null;
  statusLabel: string;
}

interface TimelineEvent {
  time: string;
  text: string;
}

const STAT_CARDS: { key: keyof Stats; label: string; color: string }[] = [
  { key: "customersInside", label: "داخل المطعم الآن", color: "text-emerald-700" },
  { key: "enteredToday", label: "دخول اليوم", color: "text-blue-700" },
  { key: "leftToday", label: "مغادرة اليوم", color: "text-slate-700" },
  { key: "avgSessionMinutes", label: "متوسط الجلسة (د)", color: "text-purple-700" },
  { key: "occupancyRate", label: "نسبة الإشغال %", color: "text-amber-700" },
  { key: "activeTables", label: "طاولات مشغولة", color: "text-red-700" },
  { key: "freeTables", label: "طاولات فارغة", color: "text-emerald-600" },
  { key: "reservationsToday", label: "حجوزات اليوم", color: "text-teal-700" },
  { key: "completedSessionsToday", label: "جلسات مكتملة", color: "text-indigo-700" },
  { key: "cancelledReservationsToday", label: "حجوزات ملغاة", color: "text-orange-700" },
];

export function MonitoringDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [live, setLive] = useState<LiveCustomer[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [staffTop, setStaffTop] = useState<{ name: string; customersMonth: number }[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string }[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/monitoring?section=dashboard");
    if (res.ok) {
      const data = await res.json();
      setStats(data.stats);
      setLive(data.liveCustomers);
      setTimeline(data.timeline);
      setStaffTop(data.staffTop?.slice(0, 5) ?? []);
      setNotifications(data.notifications ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    const res = await fetch(`/api/monitoring?section=search&q=${encodeURIComponent(search)}`);
    if (res.ok) setSearchResults(await res.json());
  }

  if (loading && !stats) return <LoadingSpinner />;

  return (
    <MonitoringShell>
      {notifications.length > 0 && (
        <div className="mb-4 space-y-2">
          {notifications.slice(0, 5).map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
            >
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">{n.title}</p>
                <p className="text-amber-800">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          تحديث
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open("/api/monitoring/export?type=stats&format=csv", "_blank")}
        >
          <Download className="h-4 w-4" />
          CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open("/api/monitoring/export?type=live&format=csv", "_blank")}
        >
          Excel
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open("/api/monitoring/export?type=stats&format=pdf", "_blank")}
        >
          PDF
        </Button>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {STAT_CARDS.map((c) => (
            <Card key={c.key} className="p-3 text-center">
              <p className={`text-xl font-bold ${c.color}`}>
                {c.key === "occupancyRate" ? `${stats[c.key]}%` : stats[c.key]}
              </p>
              <p className="text-[10px] text-slate-500 sm:text-xs">{c.label}</p>
            </Card>
          ))}
        </div>
      )}

      <form onSubmit={runSearch} className="mb-6 flex flex-wrap gap-2">
        <div className="min-w-[200px] flex-1">
          <Input
            label="بحث"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="اسم، جوال، طاولة، موظف..."
          />
        </div>
        <Button type="submit" className="self-end">
          <Search className="h-4 w-4" />
          بحث
        </Button>
      </form>

      {searchResults && (
        <Card className="mb-6 p-4">
          <pre className="max-h-40 overflow-auto text-xs">{JSON.stringify(searchResults, null, 2)}</pre>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">العملاء داخل المطعم</h2>
          {live.length === 0 ? (
            <EmptyState title="لا يوجد عملاء حالياً" />
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-right text-xs text-slate-600">
                    <th className="px-3 py-2">العميل</th>
                    <th className="px-3 py-2">الجوال</th>
                    <th className="px-3 py-2">طاولة</th>
                    <th className="px-3 py-2">دخول</th>
                    <th className="px-3 py-2">انتظار</th>
                    <th className="px-3 py-2">المدة</th>
                    <th className="px-3 py-2">موظف</th>
                    <th className="px-3 py-2">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {live.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{c.customerName}</td>
                      <td className="px-3 py-2 text-xs" dir="ltr">
                        {c.customerPhone || "—"}
                      </td>
                      <td className="px-3 py-2">#{c.tableNumber}</td>
                      <td className="px-3 py-2 text-xs">
                        {new Date(c.enteredAt).toLocaleTimeString("ar-SA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2">{c.waitingMinutes} د</td>
                      <td className="px-3 py-2">{c.sessionMinutes} د</td>
                      <td className="px-3 py-2 text-xs">{c.staffName || "—"}</td>
                      <td className="px-3 py-2">
                        <Badge variant="info">{c.statusLabel}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold">أفضل الموظفين</h2>
            <Card className="divide-y p-0">
              {staffTop.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>
                    {i + 1}. {s.name}
                  </span>
                  <span className="text-slate-500">{s.customersMonth} عميل/شهر</span>
                </div>
              ))}
            </Card>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">الخط الزمني</h2>
            <Card className="max-h-80 space-y-3 overflow-y-auto p-4">
              {timeline.map((e, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="shrink-0 font-mono text-xs text-slate-400">{e.time}</span>
                  <span className="text-slate-700">{e.text}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </MonitoringShell>
  );
}
