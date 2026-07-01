"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge, LoadingSpinner } from "@/components/ui";
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS } from "@/lib/utils";
import { CheckCircle, Clock, RefreshCw } from "lucide-react";

interface OrderData {
  id: string;
  orderNumber: number;
  status: string;
  statusLabel: string;
  subtotal: number;
  tipAmount: number;
  totalAmount: number;
  createdAt: string;
  items: { name: string; quantity: number; totalPrice: number }[];
  payment: { status: string; method: string; amount: number } | null;
  table: { id: string; number: number; label?: string } | null;
  restaurant: { name: string; logoUrl?: string };
  branch: string;
}

export default function OrderStatusPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch(`/api/public/orders/${orderId}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setOrder)
      .catch(() => setError("الطلب غير موجود"))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
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

  const isDone = order.status === "COMPLETED" || order.status === "CANCELLED";

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
            {order.table && ` · طاولة ${order.table.number}`}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          {order.status === "COMPLETED" ? (
            <CheckCircle className="mx-auto h-16 w-16 text-emerald-600" />
          ) : (
            <Clock className="mx-auto h-16 w-16 text-amber-500 animate-pulse" />
          )}
          <Badge
            variant={ORDER_STATUS_VARIANTS[order.status]}
            className="mt-4 text-base px-4 py-1"
          >
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
          <p className="mt-3 text-sm text-gray-500">{formatDate(order.createdAt)}</p>
          {!isDone && (
            <p className="mt-2 text-xs text-gray-400">
              يتم تحديث الحالة تلقائياً كل 5 ثوانٍ
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">تفاصيل الطلب</h2>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between py-2 text-sm border-b last:border-0">
              <span>{item.name} × {item.quantity}</span>
              <span>{formatCurrency(item.totalPrice)}</span>
            </div>
          ))}
          {order.tipAmount > 0 && (
            <div className="flex justify-between py-2 text-sm text-gray-600">
              <span>إكرامية</span>
              <span>{formatCurrency(order.tipAmount)}</span>
            </div>
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
            href={`/menu/${order.table.id}`}
            className="block text-center text-sm text-emerald-600 hover:underline"
          >
            طلب المزيد
          </Link>
        )}
      </main>
    </div>
  );
}
