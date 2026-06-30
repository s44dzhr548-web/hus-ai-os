import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, slug, timezone, currency")
    .eq("owner_id", user.id)
    .limit(1);

  const restaurant = restaurants?.[0];
  if (!restaurant) redirect("/onboarding");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-zinc-400">Restaurant configuration</p>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div>
          <p className="text-sm text-zinc-500">Name</p>
          <p className="font-medium">{restaurant.name}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Slug</p>
          <p className="font-medium">{restaurant.slug}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Timezone</p>
          <p className="font-medium">{restaurant.timezone}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Currency</p>
          <p className="font-medium">{restaurant.currency}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Public menu</p>
          <a href={`/menu/${restaurant.slug}`} className="text-amber-400 hover:underline">
            /menu/{restaurant.slug}
          </a>
        </div>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="font-medium">Coming soon</h2>
        <ul className="mt-3 space-y-1 text-sm text-zinc-500">
          <li>Inventory alerts</li>
          <li>Staff management</li>
          <li>Stripe Connect payments</li>
        </ul>
      </div>
    </div>
  );
}
