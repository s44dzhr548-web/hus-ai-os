"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  StatCard,
  Card,
  CardTitle,
  LoadingSpinner,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Star,
} from "lucide-react";

interface ReportData {
  todaySales: number;
  monthSales: number;
  todayOrders: number;
  monthOrders: number;
  avgOrderValue: number;
  bestSellingItems: { name: string; quantity: number }[];
  mostViewedItems?: { name: string; views: number; orders: number }[];
  mostOrderedItems?: { name: string; orders: number; views: number }[];
  salesByBranch: {
    branch: { name: string; nameAr?: string };
    sales: number;
    orders: number;
  }[];
  salesByCategory: { name: string; sales: number; quantity: number }[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="التحليلات" description="إحصائيات المبيعات والأداء" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="مبيعات اليوم"
          value={formatCurrency(data?.todaySales ?? 0)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="طلبات اليوم"
          value={data?.todayOrders ?? 0}
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <StatCard
          title="متوسط الطلب"
          value={formatCurrency(data?.avgOrderValue ?? 0)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="مبيعات الشهر"
          value={formatCurrency(data?.monthSales ?? 0)}
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>الأكثر مبيعاً</CardTitle>
          {!data?.bestSellingItems?.length ? (
            <p className="py-6 text-center text-sm text-gray-500">لا توجد بيانات</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.bestSellingItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.quantity} طلب</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>المبيعات حسب الفرع</CardTitle>
          {!data?.salesByBranch?.length ? (
            <p className="py-6 text-center text-sm text-gray-500">لا توجد بيانات</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.salesByBranch.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <span>{b.branch?.nameAr || b.branch?.name}</span>
                  <div className="text-left">
                    <p className="font-semibold text-emerald-700">
                      {formatCurrency(b.sales)}
                    </p>
                    <p className="text-xs text-gray-500">{b.orders} طلب</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>الأكثر مشاهدة</CardTitle>
          {!data?.mostViewedItems?.length ? (
            <p className="py-6 text-center text-sm text-gray-500">لا توجد بيانات</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.mostViewedItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <span>{item.name}</span>
                  <span className="font-semibold">{item.views} مشاهدة</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>الأكثر طلباً</CardTitle>
          {!data?.mostOrderedItems?.length ? (
            <p className="py-6 text-center text-sm text-gray-500">لا توجد بيانات</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.mostOrderedItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <span>{item.name}</span>
                  <span className="font-semibold">{item.orders} طلب</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle>المبيعات حسب قسم المنيو</CardTitle>
        {!data?.salesByCategory?.length ? (
          <p className="py-6 text-center text-sm text-gray-500">لا توجد بيانات</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.salesByCategory.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <span>{c.name}</span>
                <div className="text-left">
                  <p className="font-semibold text-emerald-700">{formatCurrency(c.sales)}</p>
                  <p className="text-xs text-gray-500">{c.quantity} منتج</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
