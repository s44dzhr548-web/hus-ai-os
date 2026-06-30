import { StatusBadge } from "@/components/status-badge";
import { ProjectCard } from "@/components/project-card";
import { getPlatformStatus } from "@/lib/platform-status";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const status = await getPlatformStatus();

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-3xl font-semibold tracking-tight">System Overview</h2>
        <p className="mt-2 text-zinc-400">
          Autonomous project registry · GitHub · Vercel · Supabase
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Projects", value: status.summary.total },
          { label: "Live", value: status.summary.live },
          { label: "Healthy", value: status.summary.healthy },
          { label: "Readiness", value: `${status.summary.readinessPercent}%` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="font-medium">GitHub</h3>
          <p className="mt-2 break-all text-sm text-zinc-400">{status.github.remote}</p>
          <div className="mt-3 flex gap-2">
            <StatusBadge label={status.github.branch} />
            <StatusBadge label={status.github.synced ? "Synced" : "Check sync"} tone={status.github.synced ? "success" : "warning"} />
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="font-medium">Supabase</h3>
          <p className="mt-2 text-sm text-zinc-400">{status.supabase.project}</p>
          <div className="mt-3 flex gap-2">
            <StatusBadge label={status.supabase.region} />
            <StatusBadge label={status.supabase.status} tone="success" />
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="font-medium">Last checked</h3>
          <p className="mt-2 text-sm text-zinc-400">{new Date(status.checkedAt).toLocaleString()}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Projects</h3>
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {status.projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>
    </div>
  );
}
