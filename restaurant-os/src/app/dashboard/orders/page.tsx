import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrdersList } from "@/components/orders-list";
import type { OrderWithItems, RestaurantWithLocations } from "@/types/database";

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("*, locations(*)")
    .eq("owner_id", user.id)
    .limit(1);

  const restaurant = restaurants?.[0] as RestaurantWithLocations | undefined;
  if (!restaurant) redirect("/onboarding");

  const locationId = (restaurant as RestaurantWithLocations).locations?.[0]?.id;

  const [{ data: orders }, { data: menuItems }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("menu_items")
      .select("id, name, price_cents")
      .eq("restaurant_id", restaurant.id)
      .eq("is_available", true)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Orders</h1>
        <p className="mt-2 text-zinc-400">Create and manage customer orders.</p>
      </div>
      <OrdersList
        restaurantId={restaurant.id}
        locationId={locationId ?? ""}
        currency={restaurant.currency}
        initialOrders={(orders ?? []) as OrderWithItems[]}
        initialMenuItems={menuItems ?? []}
      />
    </div>
  );
}
