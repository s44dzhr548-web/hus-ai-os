"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/validators";
import type { OrderWithItems } from "@/types/database";

type MenuItemOption = { id: string; name: string; price_cents: number };

export function OrdersList({
  restaurantId,
  locationId,
  currency,
  initialOrders,
  initialMenuItems,
}: {
  restaurantId: string;
  locationId: string;
  currency: string;
  initialOrders: OrderWithItems[];
  initialMenuItems: MenuItemOption[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [tableNumber, setTableNumber] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [menuItems, setMenuItems] = useState(initialMenuItems);
  const [error, setError] = useState<string | null>(null);

  async function refreshMenuItems() {
    const res = await fetch(`/api/menus?restaurantId=${restaurantId}`);
    const data = await res.json();
    if (data.items) setMenuItems(data.items);
  }

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!locationId || !selectedItemId) {
      setError("Select a menu item first");
      return;
    }
    const item = menuItems.find((i) => i.id === selectedItemId);
    if (!item) return;

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        locationId,
        orderType: "dine_in",
        tableNumber: tableNumber || undefined,
        items: [
          {
            menuItemId: item.id,
            name: item.name,
            quantity: 1,
            unitPriceCents: item.price_cents,
          },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setOrders((prev) => [{ ...data.order, order_items: [] }, ...prev]);
    setTableNumber("");
    setError(null);
  }

  async function updateStatus(orderId: string, status: string) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? data.order : o))
      );
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form
        onSubmit={createOrder}
        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4"
      >
        <h2 className="font-medium">New order</h2>
        <input
          placeholder="Table number"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-amber-400"
        />
        <select
          required
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          onFocus={refreshMenuItems}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-amber-400"
        >
          <option value="">Select menu item</option>
          {menuItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {formatCurrency(item.price_cents, currency)}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950"
        >
          Create order
        </button>
      </form>

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Order #{order.order_number}</span>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs uppercase">
                {order.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {order.table_number ? `Table ${order.table_number}` : order.order_type}
              {" · "}
              {formatCurrency(order.total_cents, currency)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["confirmed", "preparing", "ready", "completed"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateStatus(order.id, s)}
                  className="rounded-lg border border-zinc-700 px-2 py-1 text-xs hover:border-amber-400"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
