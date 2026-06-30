import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/menu", label: "Menu" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/kds", label: "Kitchen" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, slug")
    .eq("owner_id", user.id)
    .limit(1);

  const restaurant = restaurants?.[0];

  if (!restaurant) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50">
      <aside className="hidden w-64 flex-col border-r border-zinc-800 bg-zinc-900 p-6 md:flex">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-amber-400">
            Restaurant OS
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold">
            {restaurant.name}
          </h2>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <SignOutButton />
      </aside>
      <main className="flex-1 overflow-auto p-6 md:p-10">{children}</main>
    </div>
  );
}
