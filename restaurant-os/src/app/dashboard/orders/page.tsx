"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Badge,
  Select,
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

interface OrderItem {
  id: string;
  name: string;
  nameAr?: string;
  quantity: number;
  totalPrice: number | string;
}

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  totalAmount: number | string;
  createdAt: string;
  notes?: string;
  customerName?: string | null;
  tableNumber?: number | null;
  tableLabel?: string | null;
  tableIconEmoji?: string;
  minimumSpendAmount?: number | null;
  table?: { number: number; label?: string; tableIcon?: string };
  branch?: { name: string; nameAr?: string };
  items: OrderItem[];
}

const STATUSES = ["NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    const q = filter ? `?status=${filter}` : "";
    fetch(`/api/orders${q}`)
      .then((r) => r.json())
      .then(setOrders)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function updateStatus(id: string, status: string) {
    await fetch("/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="الطلبات" description="جميع طلبات المطعم" />

      <div className="mb-4 max-w-xs">
        <Select
          label="تصفية حسب الحالة"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">الكل</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      {orders.length === 0 ? (
        <EmptyState title="لا توجد طلبات" />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{order.tableIconEmoji || "🪑"}</span>
                    <h3 className="text-lg font-bold">طلب #{order.orderNumber}</h3>
                    <Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                    {order.minimumSpendAmount != null && order.minimumSpendAmount > 0 && (
                      <Badge className="bg-amber-100 text-amber-800">
                        حد أدنى {order.minimumSpendAmount} ر.س
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {order.branch?.nameAr} ·{" "}
                    {order.customerName ? `${order.customerName} · ` : ""}
                    طاولة {order.tableNumber ?? order.table?.number ?? "—"}
                    {(order.tableLabel || order.table?.label) &&
                      ` (${order.tableLabel || order.table?.label})`}{" "}
                    · {formatDate(order.createdAt)}
                  </p>
                </div>
                <p className="text-lg font-bold text-emerald-700">
                  {formatCurrency(Number(order.totalAmount))}
                </p>
              </div>

              <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.nameAr || item.name} × {item.quantity}
                    </span>
                    <span>{formatCurrency(Number(item.totalPrice))}</span>
                  </div>
                ))}
              </div>

              {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {STATUSES.filter((s) => s !== order.status).map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus(order.id, s)}
                    >
                      {ORDER_STATUS_LABELS[s]}
                    </Button>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
