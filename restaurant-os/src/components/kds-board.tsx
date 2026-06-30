"use client";

import { useEffect, useState } from "react";
import type { OrderWithItems } from "@/types/database";

const columns: { key: string; label: string; statuses: OrderWithItems["status"][] }[] = [
  { key: "pending", label: "New", statuses: ["pending", "confirmed"] },
  { key: "preparing", label: "Preparing", statuses: ["preparing"] },
  { key: "ready", label: "Ready", statuses: ["ready"] },
];

export function KdsBoard({
  restaurantId,
  initialOrders,
}: {
  restaurantId: string;
  initialOrders: OrderWithItems[];
}) {
  const [orders, setOrders] = useState(initialOrders);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(
        `/api/orders?restaurantId=${restaurantId}&status=preparing`
      );
      const pending = await fetch(
        `/api/orders?restaurantId=${restaurantId}`
      );
      const data = await pending.json();
      if (data.orders) {
        setOrders(
          data.orders.filter((o: OrderWithItems) =>
            ["pending", "confirmed", "preparing", "ready"].includes(o.status)
          )
        );
      }
      void res;
    }, 10000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  async function bumpStatus(orderId: string, status: string) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: status as OrderWithItems["status"] } : o))
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {columns.map((col) => (
        <div key={col.key} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-4 text-center text-sm font-medium uppercase tracking-widest text-amber-400">
            {col.label}
          </h2>
          <div className="space-y-3">
            {orders
              .filter((o) => col.statuses.includes(o.status))
              .map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 p-4"
                >
                  <div className="flex justify-between">
                    <span className="text-lg font-bold">#{order.order_number}</span>
                    {order.table_number && (
                      <span className="text-zinc-400">T{order.table_number}</span>
                    )}
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {order.order_items?.map((item) => (
                      <li key={item.id}>
                        {item.quantity}x {item.name}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() =>
                      bumpStatus(
                        order.id,
                        col.key === "pending"
                          ? "preparing"
                          : col.key === "preparing"
                            ? "ready"
                            : "completed"
                      )
                    }
                    className="mt-3 w-full rounded-lg bg-amber-400 py-2 text-sm font-medium text-zinc-950"
                  >
                    {col.key === "ready" ? "Complete" : "Next →"}
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
