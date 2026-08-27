"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CAPTAIN_STATUS_LABELS, captainFilterStatuses, nextCaptainAction } from "@/lib/captain/status";
import { cn } from "@/lib/utils";
import { Bell, Search, Volume2, VolumeX } from "lucide-react";

type CaptainOrder = {
  id: string;
  orderNumber: number;
  displayNumber: string;
  status: string;
  totalAmount: number;
  notes: string | null;
  tableId: string | null;
  tableNumber: number | null;
  tableLabel: string | null;
  tableIconEmoji?: string;
  createdAt: string;
  items: Array<{ name: string; quantity: number; totalPrice: number; notes: string | null }>;
};

type Stats = {
  newCount: number;
  preparingCount: number;
  readyCount: number;
  servedToday: number;
};

const POLL_MS = 4000;

export function CaptainDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<CaptainOrder[]>([]);
  const [stats, setStats] = useState<Stats>({ newCount: 0, preparingCount: 0, readyCount: 0, servedToday: 0 });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [flashId, setFlashId] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const initialLoaded = useRef(false);
  const audioCtx = useRef<AudioContext | null>(null);

  const playChime = useCallback(() => {
    if (!soundOn || typeof window === "undefined") return;
    try {
      audioCtx.current ??= new AudioContext();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      /* ignore */
    }
  }, [soundOn]);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ filter });
    if (search.trim()) q.set("search", search.trim());
    const res = await fetch(`/api/captain/orders?${q}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "فشل تحميل الطلبات");
      return;
    }
    setError("");
    const incoming = (data.orders ?? []) as CaptainOrder[];
    for (const o of incoming) {
      if (o.status === "NEW" && !knownIds.current.has(o.id)) {
        knownIds.current.add(o.id);
        if (initialLoaded.current) {
          playChime();
          setFlashId(o.id);
          setTimeout(() => setFlashId(null), 4000);
        }
      }
    }
    if (!initialLoaded.current) {
      incoming.forEach((o) => knownIds.current.add(o.id));
      initialLoaded.current = true;
    }
    setOrders(incoming);
    setStats(data.stats ?? { newCount: 0, preparingCount: 0, readyCount: 0, servedToday: 0 });
    setLoading(false);
  }, [filter, search, playChime]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const filters = useMemo(() => captainFilterStatuses(), []);

  async function setStatus(orderId: string, status: string) {
    setBusyId(orderId);
    setError("");
    const res = await fetch(`/api/captain/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "فشل تحديث الحالة");
      return;
    }
    void load();
  }

  if (loading && orders.length === 0) return <MkLoading />;

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-4 pb-24 text-stone-100">
      <MkPageHeader
        title="كابتن الصالة"
        desc="استلام وتتبع طلبات العملاء من المنيو — تحديث تلقائي"
        production
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "طلبات جديدة", value: stats.newCount, tone: "text-amber-300" },
          { label: "جاري التجهيز", value: stats.preparingCount, tone: "text-sky-300" },
          { label: "جاهزة", value: stats.readyCount, tone: "text-emerald-300" },
          { label: "تم تقديمها اليوم", value: stats.servedToday, tone: "text-stone-300" },
        ].map((s) => (
          <MkCard key={s.label} className="border-stone-700 bg-stone-950/90 p-3 text-center">
            <p className={`text-2xl font-bold ${s.tone}`}>{s.value}</p>
            <p className="text-xs text-stone-400">{s.label}</p>
          </MkCard>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 ltr:left-3 rtl:right-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث: رقم الطاولة أو #1042"
            className="w-full rounded-lg border border-stone-700 bg-stone-900 py-2 text-sm ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
            dir="ltr"
          />
        </div>
        <button
          type="button"
          onClick={() => setSoundOn((v) => !v)}
          className="rounded-lg border border-stone-700 p-2"
          aria-label="صوت التنبيه"
        >
          {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-stone-500" />}
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
              filter === f.key ? "bg-emerald-600 text-white" : "bg-stone-800 text-stone-300"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>}

      {orders.length === 0 ? (
        <MkCard className="border-stone-700 bg-stone-950/80 py-12 text-center text-stone-400">
          لا توجد طلبات في هذا الفلتر
        </MkCard>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const action = nextCaptainAction(order.status as "NEW");
            const isNew = order.status === "NEW";
            return (
              <li key={order.id}>
                <MkCard
                  className={cn(
                    "border-stone-700 bg-stone-950/90 p-4 transition",
                    flashId === order.id && "ring-2 ring-amber-400",
                    isNew && "border-amber-600/60"
                  )}
                >
                  {isNew && (
                    <div className="mb-2 flex items-center gap-2 text-amber-300">
                      <Bell className="h-4 w-4 animate-pulse" />
                      <span className="text-sm font-semibold">طلب جديد!</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-3xl font-black text-white">
                        {order.tableIconEmoji}{" "}
                        {order.tableLabel || `طاولة ${order.tableNumber ?? "—"}`}
                      </p>
                      <p className="mt-1 text-sm text-stone-400">
                        {order.displayNumber} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-stone-800 px-3 py-1 text-xs font-medium text-emerald-300">
                      {CAPTAIN_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>

                  <ul className="mt-3 space-y-1 border-t border-stone-800 pt-3 text-sm">
                    {order.items.map((item, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span>
                          {item.name} × {item.quantity}
                          {item.notes && (
                            <span className="block text-xs text-stone-500">📝 {item.notes}</span>
                          )}
                        </span>
                        <span className="shrink-0 text-stone-400">{formatCurrency(item.totalPrice)}</span>
                      </li>
                    ))}
                  </ul>

                  {order.notes && (
                    <p className="mt-2 rounded bg-stone-900 px-2 py-1 text-xs text-amber-200/90">
                      ملاحظة الطلب: {order.notes.replace(/guest:.*$/i, "").trim()}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-stone-800 pt-3">
                    <span className="font-bold text-emerald-400">{formatCurrency(order.totalAmount)}</span>
                    <div className="flex flex-wrap gap-2">
                      {action && (
                        <Button
                          size="sm"
                          loading={busyId === order.id}
                          onClick={() => void setStatus(order.id, action.next)}
                        >
                          {action.label}
                        </Button>
                      )}
                      {!["SERVED", "CANCELLED"].includes(order.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === order.id}
                          onClick={() => void setStatus(order.id, "CANCELLED")}
                        >
                          إلغاء
                        </Button>
                      )}
                    </div>
                  </div>
                </MkCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
