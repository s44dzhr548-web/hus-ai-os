"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  StatCard,
  Card,
  CardTitle,
  Badge,
  LoadingSpinner,
} from "@/components/ui";
import {
  formatCurrency,
  formatDate,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
} from "@/lib/utils";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";

interface ReportData {
  todaySales: number;
  monthSales: number;
  todayOrders: number;
  avgOrderValue: number;
}

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  table?: { number: number; label?: string };
}

export default function DashboardPage() {
  const [reports, setReports] = useState<ReportData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
    ])
      .then(([rep, ord]) => {
        setReports(rep);
        setOrders(Array.isArray(ord) ? ord.slice(0, 5) : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="نظرة عامة"
        description="ملخص أداء مطعمك اليوم"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="مبيعات اليوم"
          value={formatCurrency(reports?.todaySales ?? 0)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="طلبات اليوم"
          value={reports?.todayOrders ?? 0}
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <StatCard
          title="متوسط الطلب"
          value={formatCurrency(reports?.avgOrderValue ?? 0)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="مبيعات الشهر"
          value={formatCurrency(reports?.monthSales ?? 0)}
          icon={<UtensilsCrossed className="h-5 w-5" />}
        />
      </div>

      <Card className="mt-6">
        <CardTitle>آخر الطلبات</CardTitle>
        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">لا توجد طلبات بعد</p>
        ) : (
          <div className="mt-4 space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <div>
                  <p className="font-medium">طلب #{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">
                    {order.table ? `طاولة ${order.table.number}` : "—"} ·{" "}
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                  <span className="font-semibold text-emerald-700">
                    {formatCurrency(Number(order.totalAmount))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
