import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KdsBoard } from "@/components/kds-board";

export default async function KdsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("owner_id", user.id)
    .limit(1);

  const restaurant = restaurants?.[0];
  if (!restaurant) redirect("/onboarding");

  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("restaurant_id", restaurant.id)
    .in("status", ["pending", "confirmed", "preparing", "ready"])
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Kitchen Display</h1>
        <p className="mt-2 text-zinc-400">
          Live order queue for {restaurant.name}. Auto-refreshes every 10s.
        </p>
      </div>
      <KdsBoard
        restaurantId={restaurant.id}
        initialOrders={orders ?? []}
      />
    </div>
  );
}
