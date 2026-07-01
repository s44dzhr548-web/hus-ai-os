"use client";

import { useEffect, useState } from "react";
import { Button, LoadingSpinner } from "@/components/ui";

interface TableRequest {
  id: string;
  tableId: string;
  type: string;
  status: string;
  notes?: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  CALL_WAITER: "استدعاء نادل",
  REQUEST_BILL: "طلب الفاتورة",
  CLEAN_TABLE: "تنظيف الطاولة",
  HELP: "مساعدة",
};

export default function WaiterCallsPage() {
  const [requests, setRequests] = useState<TableRequest[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        const rid = s?.user?.restaurantId;
        if (rid) setRestaurantId(rid);
      });
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    const load = () =>
      fetch(`/api/table-requests?restaurantId=${restaurantId}&status=NEW`)
        .then((r) => r.json())
        .then(setRequests)
        .finally(() => setLoading(false));

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  async function markDone(id: string) {
    await fetch("/api/table-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "DONE" }),
    });
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">طلبات الخدمة</h1>
      {requests.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-gray-500 shadow">
          لا توجد طلبات جديدة
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow"
            >
              <div>
                <p className="font-semibold">{TYPE_LABELS[r.type] || r.type}</p>
                <p className="text-sm text-gray-500">
                  {new Date(r.createdAt).toLocaleString("ar-SA")}
                </p>
              </div>
              <Button size="sm" onClick={() => markDone(r.id)}>
                تم
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
