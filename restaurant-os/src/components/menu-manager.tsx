"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/validators";
import type { MenuCategory, MenuItem } from "@/types/database";

type CategoryWithItems = MenuCategory & { menu_items?: MenuItem[] };

export function MenuManager({
  restaurantId,
  currency,
  initialCategories,
}: {
  restaurantId: string;
  currency: string;
  initialCategories: CategoryWithItems[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [categoryName, setCategoryName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/menus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "category",
        restaurantId,
        name: categoryName,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setCategories((prev) => [...prev, { ...data.category, menu_items: [] }]);
    setCategoryName("");
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const priceCents = Math.round(parseFloat(itemPrice) * 100);
    if (Number.isNaN(priceCents)) {
      setError("Invalid price");
      return;
    }
    const res = await fetch("/api/menus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "item",
        restaurantId,
        categoryId: selectedCategory || undefined,
        name: itemName,
        priceCents,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === (selectedCategory || cat.id)
          ? {
              ...cat,
              menu_items: [...(cat.menu_items ?? []), data.item],
            }
          : cat
      )
    );
    if (!selectedCategory) {
      setCategories((prev) => {
        const uncategorized = prev.find((c) => c.name === "Uncategorized");
        if (uncategorized) {
          return prev.map((c) =>
            c.id === uncategorized.id
              ? { ...c, menu_items: [...(c.menu_items ?? []), data.item] }
              : c
          );
        }
        return [...prev, { ...data.item, menu_items: [data.item] } as CategoryWithItems];
      });
    }
    setItemName("");
    setItemPrice("");
  }

  const allItems = categories.flatMap((c) => c.menu_items ?? []);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <form onSubmit={addCategory} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <h2 className="font-medium">Add category</h2>
          <input
            required
            placeholder="Category name"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-amber-400"
          />
          <button type="submit" className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950">
            Add category
          </button>
        </form>

        <form onSubmit={addItem} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <h2 className="font-medium">Add menu item</h2>
          <input
            required
            placeholder="Item name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-amber-400"
          />
          <input
            required
            placeholder="Price (USD)"
            type="number"
            step="0.01"
            min="0"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-amber-400"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-amber-400"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950">
            Add item
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="font-medium">Current menu</h2>
        {categories.length === 0 && allItems.length === 0 ? (
          <p className="mt-4 text-zinc-500">No menu items yet.</p>
        ) : (
          <div className="mt-4 space-y-6">
            {categories.map((cat) => (
              <div key={cat.id}>
                <h3 className="text-amber-400">{cat.name}</h3>
                <ul className="mt-2 space-y-2">
                  {(cat.menu_items ?? []).map((item) => (
                    <li key={item.id} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span>{formatCurrency(item.price_cents, currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
