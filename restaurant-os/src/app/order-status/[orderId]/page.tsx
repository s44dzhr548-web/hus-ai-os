"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge, LoadingSpinner } from "@/components/ui";
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS } from "@/lib/utils";
import { CAPTAIN_CUSTOMER_STATUS_STEPS } from "@/lib/captain/status";
import { CheckCircle, Clock, RefreshCw } from "lucide-react";

interface OrderData {
  id: string;
  orderNumber: number;
  status: string;
  statusLabel: string;
  subtotal: number;
  tipAmount?: number;
  totalAmount: number;
  createdAt: string;
  notes?: string | null;
  items: { name: string; quantity: number; totalPrice: number; notes?: string | null }[];
  payment: { status: string; method: string; amount: number } | null;
  table: { id: string; number: number; label?: string } | null;
  restaurant: { name: string; logoUrl?: string };
  branch: string;
  orderSource?: string;
}

export default function OrderStatusPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.orderId as string;
  const isCaptain = searchParams.get("captain") === "1";
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const url = isCaptain
      ? `/api/public/captain/orders/${orderId}`
      : `/api/public/orders/${orderId}`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setOrder)
      .catch(() => setError("الطلب غير موجود"))
      .finally(() => setLoading(false));
  }, [orderId, isCaptain]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const isDone = ["SERVED", "COMPLETED", "CANCELLED"].includes(order.status);
  const captainSteps = CAPTAIN_CUSTOMER_STATUS_STEPS;
  const currentStepIndex = captainSteps.findIndex((s) => s.status === order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-800 px-4 py-6 text-white">
        <div className="mx-auto max-w-lg text-center">
          {order.restaurant.logoUrl && (
            <img
              src={order.restaurant.logoUrl}
              alt=""
              className="mx-auto mb-3 h-14 w-14 rounded-full object-cover"
            />
          )}
          <h1 className="text-xl font-bold">{order.restaurant.name}</h1>
          <p className="mt-1 text-emerald-200">
            طلب #{order.orderNumber}
            {order.table && ` · طاولة ${order.table.label || order.table.number}`}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          {isDone && order.status !== "CANCELLED" ? (
            <CheckCircle className="mx-auto h-16 w-16 text-emerald-600" />
          ) : order.status === "CANCELLED" ? (
            <Clock className="mx-auto h-16 w-16 text-red-400" />
          ) : (
            <Clock className="mx-auto h-16 w-16 animate-pulse text-amber-500" />
          )}
          <Badge
            variant={ORDER_STATUS_VARIANTS[order.status]}
            className="mt-4 px-4 py-1 text-base"
          >
            {ORDER_STATUS_LABELS[order.status] ?? order.statusLabel}
          </Badge>
          <p className="mt-3 text-sm text-gray-500">{formatDate(order.createdAt)}</p>
          {!isDone && (
            <p className="mt-2 text-xs text-gray-400">يتم تحديث الحالة تلقائياً</p>
          )}
        </div>

        {(isCaptain || order.orderSource === "CAPTAIN") && order.status !== "CANCELLED" && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">تتبع الطلب</h2>
            <ol className="space-y-3">
              {captainSteps.map((step, i) => {
                const done = currentStepIndex >= i && order.status !== "NEW" ? i <= currentStepIndex : i === 0 && order.status === "NEW";
                const active = step.status === order.status;
                return (
                  <li
                    key={step.status}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                      active ? "bg-emerald-50 font-medium text-emerald-800" : done ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                        active || done ? "bg-emerald-600 text-white" : "bg-gray-200"
                      }`}
                    >
                      {done && !active ? "✓" : i + 1}
                    </span>
                    {step.label}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">تفاصيل الطلب</h2>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between border-b py-2 text-sm last:border-0">
              <span>
                {item.name} × {item.quantity}
                {item.notes && <span className="block text-xs text-gray-500">{item.notes}</span>}
              </span>
              <span>{formatCurrency(item.totalPrice)}</span>
            </div>
          ))}
          {order.notes && (
            <p className="mt-2 text-xs text-gray-500">ملاحظة: {order.notes.replace(/guest:.*$/i, "").trim()}</p>
          )}
          <div className="mt-2 flex justify-between font-bold text-emerald-700">
            <span>الإجمالي</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>

        {order.payment && (
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm">
            <p className="font-medium text-emerald-800">تم الدفع بنجاح</p>
            <p className="text-emerald-600">{formatCurrency(order.payment.amount)}</p>
          </div>
        )}

        <button
          onClick={load}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm text-gray-600"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث الحالة
        </button>

        {order.table && (
          <Link
            href={`/menu/${order.table.id}?direct=1`}
            className="block text-center text-sm text-emerald-600 hover:underline"
          >
            طلب المزيد
          </Link>
        )}
      </main>
    </div>
  );
}
