import Link from "next/link";

const nav = [
  { href: "/", label: "Overview" },
  { href: "/projects", label: "Projects" },
  { href: "/deployments", label: "Deployments" },
  { href: "/projects/new", label: "New Project" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-cyan-400">
              HUSAI-OS
            </p>
            <h1 className="text-lg font-semibold">Platform Dashboard</h1>
          </div>
          <nav className="flex gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
