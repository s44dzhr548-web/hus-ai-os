"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PageHeader,
  Card,
  Badge,
  Button,
  LoadingSpinner,
  EmptyState,
} from "@/components/ui";
import {
  formatCurrency,
  formatDate,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
} from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface OrderItem {
  name: string;
  nameAr?: string;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  totalAmount: number | string;
  createdAt: string;
  table?: { number: number };
  items: OrderItem[];
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("NEW");
  const [loading, setLoading] = useState(true);
  const [lastCount, setLastCount] = useState(0);

  const playAlert = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(() => {
    fetch(`/api/orders?status=${filter}`)
      .then((r) => r.json())
      .then((data: Order[]) => {
        if (filter === "NEW" && data.length > lastCount && lastCount > 0) {
          playAlert();
        }
        setLastCount(data.length);
        setOrders(data);
      })
      .finally(() => setLoading(false));
  }, [filter, lastCount, playAlert]);

  useEffect(() => {
    setLoading(true);
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function updateStatus(id: string, status: string) {
    await fetch("/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  const filters = [
    { key: "NEW", label: "جديد" },
    { key: "PREPARING", label: "تحضير" },
    { key: "READY", label: "جاهز" },
  ];

  return (
    <div>
      <PageHeader
        title="المطبخ"
        description="شاشة متابعة الطلبات"
        action={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-emerald-600 text-white"
                : "bg-white text-gray-700 ring-1 ring-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <EmptyState title="لا توجد طلبات" description={`لا طلبات بحالة ${ORDER_STATUS_LABELS[filter]}`} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <Card key={order.id} className="border-r-4 border-r-emerald-500">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">#{order.orderNumber}</h3>
                <Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                طاولة {order.table?.number ?? "—"} · {formatDate(order.createdAt)}
              </p>

              <ul className="my-4 space-y-2">
                {order.items.map((item, i) => (
                  <li key={i} className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <span>{item.nameAr || item.name}</span>
                    <span className="font-bold">×{item.quantity}</span>
                  </li>
                ))}
              </ul>

              <p className="mb-4 font-bold text-emerald-700">
                {formatCurrency(Number(order.totalAmount))}
              </p>

              <div className="flex flex-wrap gap-2">
                {filter === "NEW" && (
                  <Button className="flex-1" onClick={() => updateStatus(order.id, "PREPARING")}>
                    بدء التحضير
                  </Button>
                )}
                {filter === "PREPARING" && (
                  <Button className="flex-1" onClick={() => updateStatus(order.id, "READY")}>
                    جاهز
                  </Button>
                )}
                {filter === "READY" && (
                  <Button className="flex-1" onClick={() => updateStatus(order.id, "COMPLETED")}>
                    تم التسليم
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
