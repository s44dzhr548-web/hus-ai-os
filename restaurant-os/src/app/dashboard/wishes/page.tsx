"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, LoadingSpinner, PageHeader, Badge } from "@/components/ui";
import { WISH_STATUS_LABELS_AR } from "@/lib/customer-wishes/types";
import { Sparkles } from "lucide-react";
import type { CustomerWishStatus } from "@prisma/client";

type WishRow = {
  id: string;
  typeLabel: string;
  message: string;
  status: CustomerWishStatus;
  statusLabel: string;
  tableNumber: string | null;
  customerName: string | null;
  createdAt: string;
};

export default function WishesDashboardPage() {
  const [wishes, setWishes] = useState<WishRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/wishes");
    if (res.ok) {
      const d = await res.json();
      setWishes(d.wishes || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  async function updateStatus(wishId: string, status: CustomerWishStatus) {
    await fetch("/api/wishes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wishId, status }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الأمنيات"
        description="طلبات وأمنيات العملاء من الطاولات"
        action={
          <Link href="/dashboard/gifts">
            <Button variant="outline">إعدادات التفعيل</Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-right text-xs">
                <th className="px-3 py-2">النوع</th>
                <th className="px-3 py-2">الطاولة</th>
                <th className="px-3 py-2">العميل</th>
                <th className="px-3 py-2">الرسالة</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">التاريخ</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {wishes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    <Sparkles className="mx-auto mb-2 h-8 w-8 text-amber-400" />
                    لا توجد أمنيات حالياً
                  </td>
                </tr>
              ) : (
                wishes.map((w) => (
                  <tr key={w.id} className="border-b">
                    <td className="px-3 py-2">{w.typeLabel}</td>
                    <td className="px-3 py-2">{w.tableNumber || "—"}</td>
                    <td className="px-3 py-2">{w.customerName || "—"}</td>
                    <td className="max-w-xs truncate px-3 py-2">{w.message}</td>
                    <td className="px-3 py-2">
                      <Badge>{WISH_STATUS_LABELS_AR[w.status] || w.statusLabel}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(w.createdAt).toLocaleString("ar-SA")}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {w.status === "SUBMITTED" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(w.id, "ACCEPTED")}
                            >
                              قبول
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(w.id, "REJECTED")}
                            >
                              رفض
                            </Button>
                          </>
                        )}
                        {w.status === "ACCEPTED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(w.id, "COMPLETED")}
                          >
                            مكتمل
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
