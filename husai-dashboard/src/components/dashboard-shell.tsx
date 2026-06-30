import Link from "next/link";

const nav = [
  { href: "/", label: "Overview" },
  { href: "/projects", label: "Projects" },
  { href: "/agents", label: "Agents" },
  { href: "/approvals", label: "Approvals" },
  { href: "/deployments", label: "Deployments" },
  { href: "/errors", label: "Errors" },
  { href: "/costs", label: "Costs" },
  { href: "/projects/new", label: "New Project" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-cyan-400">
                HUSAI-OS 2.0 · Autonomous AI Company
              </p>
              <h1 className="text-lg font-semibold">Zero Manual Work</h1>
            </div>
            <a
              href="https://github.com/s44dzhr548-web/hus-ai-os"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              GitHub
            </a>
          </div>
          <nav className="mt-4 flex flex-wrap gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
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
