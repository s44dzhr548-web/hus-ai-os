import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/validators";
import type { RestaurantWithLocations } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("*, locations(*)")
    .eq("owner_id", user.id);

  const restaurant = restaurants?.[0] as RestaurantWithLocations | undefined;

  if (!restaurant) {
    redirect("/onboarding");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: orders } = await supabase
    .from("orders")
    .select("total_cents, status")
    .eq("restaurant_id", restaurant.id)
    .gte("created_at", today.toISOString());

  const todayRevenue =
    orders
      ?.filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.total_cents, 0) ?? 0;

  const activeOrders =
    orders?.filter((o) =>
      ["pending", "confirmed", "preparing", "ready"].includes(o.status)
    ).length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-zinc-400">
          Welcome back. Here&apos;s today&apos;s snapshot.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's revenue" value={formatCurrency(todayRevenue, restaurant.currency)} />
        <StatCard label="Active orders" value={String(activeOrders)} />
        <StatCard label="Locations" value={String(restaurant.locations?.length ?? 0)} />
        <StatCard label="Public menu" value={`/menu/${restaurant.slug}`} link />
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-medium">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <ActionLink href="/dashboard/menu">Manage menu</ActionLink>
          <ActionLink href="/dashboard/orders">View orders</ActionLink>
          <ActionLink href="/dashboard/kds">Open kitchen display</ActionLink>
          <ActionLink href={`/menu/${restaurant.slug}`} external>
            Preview public menu
          </ActionLink>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${link ? "text-amber-400" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function ActionLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
    >
      {children}
    </Link>
  );
}
