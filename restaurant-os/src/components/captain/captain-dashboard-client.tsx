"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CAPTAIN_STATUS_LABELS, captainFilterStatuses, nextCaptainAction } from "@/lib/captain/status";
import { cn } from "@/lib/utils";
import { Bell, Minus, Plus, Search, Trash2, Volume2, VolumeX, X } from "lucide-react";

type OrderItem = {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
};

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
  isEditable?: boolean;
  isLocked?: boolean;
  items: OrderItem[];
};

type MenuItemOption = { id: string; name: string; category: string; unitPrice: number };

type Stats = {
  newCount: number;
  confirmedCount: number;
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
  const [stats, setStats] = useState<Stats>({
    newCount: 0,
    confirmedCount: 0,
    preparingCount: 0,
    readyCount: 0,
    servedToday: 0,
  });
  const [filter, setFilter] = useState("new");
  const [search, setSearch] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CaptainOrder | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addItemId, setAddItemId] = useState("");
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
    setStats(
      data.stats ?? {
        newCount: 0,
        confirmedCount: 0,
        preparingCount: 0,
        readyCount: 0,
        servedToday: 0,
      }
    );
    setLoading(false);
    if (selected) {
      const fresh = incoming.find((o) => o.id === selected.id);
      if (fresh) {
        setSelected(fresh);
        if (fresh.isEditable) {
          setEditItems(fresh.items);
          setEditNotes(fresh.notes?.replace(/guest:.*$/i, "").trim() || "");
        }
      }
    }
  }, [filter, search, playChime, selected]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const filters = useMemo(() => captainFilterStatuses(), []);

  async function openOrder(order: CaptainOrder) {
    setSelected(order);
    setEditItems(order.items);
    setEditNotes(order.notes?.replace(/guest:.*$/i, "").trim() || "");
    setConfirmOpen(false);
    if (order.isEditable && menuItems.length === 0) {
      const res = await fetch("/api/captain/menu-items");
      const data = await res.json();
      if (res.ok) setMenuItems(data.items ?? []);
    }
  }

  function closeDetail() {
    setSelected(null);
    setConfirmOpen(false);
    setAddItemId("");
  }

  function updateQty(index: number, delta: number) {
    setEditItems((items) =>
      items
        .map((item, i) =>
          i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
        )
        .map((item) => ({
          ...item,
          totalPrice: item.unitPrice * item.quantity,
        }))
    );
  }

  function removeItem(index: number) {
    setEditItems((items) => items.filter((_, i) => i !== index));
  }

  function addMenuItem() {
    if (!addItemId) return;
    const menu = menuItems.find((m) => m.id === addItemId);
    if (!menu) return;
    setEditItems((items) => [
      ...items,
      {
        id: `new-${Date.now()}`,
        menuItemId: menu.id,
        name: menu.name,
        quantity: 1,
        unitPrice: menu.unitPrice,
        totalPrice: menu.unitPrice,
        notes: null,
      },
    ]);
    setAddItemId("");
  }

  const editTotal = useMemo(
    () => editItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [editItems]
  );

  async function saveEdits() {
    if (!selected) return;
    setBusyId(selected.id);
    setError("");
    const res = await fetch(`/api/captain/orders/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: editNotes,
        items: editItems.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          notes: i.notes || undefined,
        })),
      }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || data.code === "ORDER_LOCKED" ? "تم تأكيد الطلب ولا يمكن تعديل محتواه." : "فشل حفظ التعديلات");
      return;
    }
    setSelected(data.order);
    void load();
  }

  async function confirmOrder() {
    if (!selected) return;
    setBusyId(selected.id);
    setError("");
    const res = await fetch(`/api/captain/orders/${selected.id}/confirm`, { method: "POST" });
    const data = await res.json();
    setBusyId(null);
    setConfirmOpen(false);
    if (!res.ok) {
      setError(data.error || "فشل تأكيد الطلب");
      return;
    }
    setSelected(data.order);
    setFilter("confirmed");
    void load();
  }

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
    if (selected?.id === orderId) setSelected(data.order);
    void load();
  }

  if (loading && orders.length === 0) return <MkLoading />;

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-4 pb-24 text-stone-100">
      <MkPageHeader
        title="ويتر / كابتن الصالة"
        desc="استلام وتأكيد وتتبع طلبات العملاء — تحديث تلقائي"
        production
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: "جديدة", value: stats.newCount, tone: "text-amber-300", key: "new" },
          { label: "مؤكدة", value: stats.confirmedCount, tone: "text-sky-300", key: "confirmed" },
          { label: "تجهيز", value: stats.preparingCount, tone: "text-violet-300", key: "preparing" },
          { label: "جاهزة", value: stats.readyCount, tone: "text-emerald-300", key: "ready" },
          { label: "مكتملة اليوم", value: stats.servedToday, tone: "text-stone-300", key: "done" },
        ].map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setFilter(s.key)}
            className={cn(
              "rounded-xl border p-3 text-center transition",
              filter === s.key ? "border-emerald-500 bg-emerald-950/40" : "border-stone-700 bg-stone-950/90"
            )}
          >
            <p className={`text-2xl font-bold ${s.tone}`}>{s.value}</p>
            <p className="text-xs text-stone-400">{s.label}</p>
          </button>
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
            {f.key === "new" && stats.newCount > 0 && (
              <span className="mr-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] text-black">
                {stats.newCount}
              </span>
            )}
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
                      <p className="text-4xl font-black text-white">
                        {order.tableIconEmoji}{" "}
                        {order.tableLabel || `طاولة ${order.tableNumber ?? "—"}`}
                      </p>
                      <p className="mt-1 text-lg font-bold text-emerald-300">{order.displayNumber}</p>
                      <p className="text-sm text-stone-400">{formatDate(order.createdAt)}</p>
                    </div>
                    <span className="rounded-full bg-stone-800 px-3 py-1 text-xs font-medium text-emerald-300">
                      {CAPTAIN_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>

                  <ul className="mt-3 space-y-1 border-t border-stone-800 pt-3 text-sm">
                    {order.items.slice(0, 4).map((item, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span className="shrink-0 text-stone-400">{formatCurrency(item.totalPrice)}</span>
                      </li>
                    ))}
                    {order.items.length > 4 && (
                      <li className="text-xs text-stone-500">+{order.items.length - 4} أصناف أخرى</li>
                    )}
                  </ul>

                  <div className="mt-3 flex items-center justify-between border-t border-stone-800 pt-3">
                    <span className="font-bold text-emerald-400">{formatCurrency(order.totalAmount)}</span>
                    <Button size="sm" onClick={() => void openOrder(order)}>
                      فتح الطلب
                    </Button>
                  </div>
                </MkCard>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-stone-700 bg-stone-950 p-4 sm:rounded-2xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-3xl font-black text-white">
                  {selected.tableIconEmoji}{" "}
                  {selected.tableLabel || `طاولة ${selected.tableNumber ?? "—"}`}
                </p>
                <p className="text-lg font-bold text-emerald-300">{selected.displayNumber}</p>
                <p className="text-sm text-stone-400">
                  {CAPTAIN_STATUS_LABELS[selected.status] ?? selected.status}
                </p>
              </div>
              <button type="button" onClick={closeDetail} className="rounded-lg p-2 hover:bg-stone-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {selected.isEditable ? (
              <>
                <ul className="space-y-2">
                  {editItems.map((item, index) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-900 p-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-stone-500">{formatCurrency(item.unitPrice)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded bg-stone-800 p-1"
                          onClick={() => updateQty(index, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          className="rounded bg-stone-800 p-1"
                          onClick={() => updateQty(index, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded bg-red-950 p-1 text-red-300"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex gap-2">
                  <select
                    value={addItemId}
                    onChange={(e) => setAddItemId(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-stone-700 bg-stone-900 px-2 py-2 text-sm"
                  >
                    <option value="">إضافة صنف...</option>
                    {menuItems.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {formatCurrency(m.unitPrice)}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" disabled={!addItemId} onClick={addMenuItem}>
                    إضافة
                  </Button>
                </div>

                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="ملاحظات الطلب"
                  className="mt-3 w-full rounded-lg border border-stone-700 bg-stone-900 p-2 text-sm"
                  rows={2}
                />

                <div className="mt-3 flex items-center justify-between border-t border-stone-800 pt-3">
                  <span className="font-bold text-emerald-400">{formatCurrency(editTotal)}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" loading={busyId === selected.id} onClick={() => void saveEdits()}>
                      حفظ التعديلات
                    </Button>
                    <Button size="sm" loading={busyId === selected.id} onClick={() => setConfirmOpen(true)}>
                      تأكيد الطلب
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <ul className="space-y-2 text-sm">
                  {selected.items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-2 border-b border-stone-800 py-2">
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span>{formatCurrency(item.totalPrice)}</span>
                    </li>
                  ))}
                </ul>
                {selected.notes && (
                  <p className="mt-2 text-xs text-amber-200/90">
                    ملاحظة: {selected.notes.replace(/guest:.*$/i, "").trim()}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-stone-800 pt-3">
                  <span className="font-bold text-emerald-400">{formatCurrency(selected.totalAmount)}</span>
                  <div className="flex flex-wrap gap-2">
                    {nextCaptainAction(selected.status as "CONFIRMED") && (
                      <Button
                        size="sm"
                        loading={busyId === selected.id}
                        onClick={() => {
                          const action = nextCaptainAction(selected.status as "CONFIRMED");
                          if (action) void setStatus(selected.id, action.next);
                        }}
                      >
                        {nextCaptainAction(selected.status as "CONFIRMED")?.label}
                      </Button>
                    )}
                    {!["SERVED", "COMPLETED", "CANCELLED"].includes(selected.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === selected.id}
                        onClick={() => void setStatus(selected.id, "CANCELLED")}
                      >
                        إلغاء
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmOpen && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-stone-700 bg-stone-950 p-5">
            <h3 className="text-lg font-bold text-white">تأكيد الطلب</h3>
            <p className="mt-2 text-sm text-stone-400">
              هل أنت متأكد من تأكيد الطلب؟ بعد التأكيد لن تستطيع تعديل الأصناف أو الكميات.
            </p>
            <p className="mt-3 text-xl font-bold text-emerald-400">{formatCurrency(editTotal)}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
                إلغاء
              </Button>
              <Button className="flex-1" loading={busyId === selected.id} onClick={() => void confirmOrder()}>
                تأكيد نهائي
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
