import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/validators";
import type { MenuCategory, MenuItem } from "@/types/database";

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug, currency")
    .eq("slug", slug)
    .single();

  if (!restaurant) notFound();

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_available", true)
      .order("name"),
  ]);

  const itemsByCategory = (categories ?? []).map((cat: MenuCategory) => ({
    ...cat,
    items: (items ?? []).filter((i: MenuItem) => i.category_id === cat.id),
  }));

  const uncategorized = (items ?? []).filter((i: MenuItem) => !i.category_id);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 px-6 py-10 text-center">
        <p className="text-sm uppercase tracking-widest text-amber-400">Menu</p>
        <h1 className="mt-2 text-4xl font-semibold">{restaurant.name}</h1>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10 space-y-10">
        {itemsByCategory.map((cat) =>
          cat.items.length > 0 ? (
            <section key={cat.id}>
              <h2 className="text-xl font-medium text-amber-400">{cat.name}</h2>
              <ul className="mt-4 space-y-4">
                {cat.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-zinc-500">{item.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-zinc-300">
                      {formatCurrency(item.price_cents, restaurant.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null
        )}
        {uncategorized.length > 0 && (
          <section>
            <h2 className="text-xl font-medium text-amber-400">Other</h2>
            <ul className="mt-4 space-y-4">
              {uncategorized.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>{item.name}</span>
                  <span>{formatCurrency(item.price_cents, restaurant.currency)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {(items ?? []).length === 0 && (
          <p className="text-center text-zinc-500">Menu coming soon.</p>
        )}
      </main>
    </div>
  );
}
