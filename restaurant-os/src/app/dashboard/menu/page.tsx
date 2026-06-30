import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MenuManager } from "@/components/menu-manager";

export default async function MenuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, currency")
    .eq("owner_id", user.id)
    .limit(1);

  const restaurant = restaurants?.[0];
  if (!restaurant) redirect("/onboarding");

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("name"),
  ]);

  const categoriesWithItems = (categories ?? []).map((cat) => ({
    ...cat,
    menu_items: (items ?? []).filter((i) => i.category_id === cat.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Menu</h1>
        <p className="mt-2 text-zinc-400">
          Manage categories and items for {restaurant.name}.
        </p>
      </div>
      <MenuManager
        restaurantId={restaurant.id}
        currency={restaurant.currency}
        initialCategories={categoriesWithItems}
      />
    </div>
  );
}
