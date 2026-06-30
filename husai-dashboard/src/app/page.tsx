import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ProjectRow, SectionHeader } from "@/components/dashboard-sections";
import { getDashboardState } from "@/lib/dashboard-state";
import { AGENT_LABELS, GATE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { memory, platform } = await getDashboardState();
  const openApprovals = memory.pendingApprovals.filter((a) => a.status === "open");
  const openErrors = memory.errors.filter((e) => e.status !== "resolved");

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-cyan-900/40 bg-gradient-to-br from-cyan-950/30 to-zinc-950 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">HUSAI-OS 2.0</h2>
            <p className="mt-2 max-w-2xl text-zinc-400">
              Autonomous AI Company — agents handle everything. You only approve OAuth,
              OTP, payment, KYC, or legal when required.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-cyan-400"
          >
            Create New Project
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-600">
          Release {memory.platform.release} · Updated {new Date(memory.updatedAt).toLocaleString()}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Projects", value: memory.projects.length },
          { label: "Healthy", value: platform.summary.healthy },
          { label: "Pending Approvals", value: openApprovals.length },
          { label: "Open Errors", value: openErrors.length },
          { label: "Monthly Cost", value: `$${memory.costs.monthlyUsd}` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <SectionHeader title="Human Approval Gateway" href="/approvals" />
        {openApprovals.length === 0 ? (
          <StatusBadge label="No approvals required" tone="success" />
        ) : (
          <ul className="space-y-2">
            {openApprovals.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg bg-zinc-950/50 px-4 py-3 text-sm">
                <span>{GATE_LABELS[a.gate]} — {a.reason}</span>
                <StatusBadge label="Action required" tone="warning" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="font-medium">GitHub</h3>
          <a href={memory.platforms.github.remote} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-cyan-400 hover:underline">
            {memory.platforms.github.remote.replace("https://github.com/", "")}
          </a>
          <div className="mt-3">
            <StatusBadge label={memory.platforms.github.status} tone="success" />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="font-medium">Vercel</h3>
          <p className="mt-2 text-sm text-zinc-400">{memory.platforms.vercel.team}</p>
          <p className="text-xs text-zinc-600">{memory.platforms.vercel.projects} projects</p>
          <div className="mt-3">
            <StatusBadge label={memory.platforms.vercel.status} tone="success" />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="font-medium">Supabase</h3>
          <a href={`https://supabase.com/dashboard/project/${memory.platforms.supabase.ref}`} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-cyan-400 hover:underline">
            {memory.platforms.supabase.project} · {memory.platforms.supabase.region}
          </a>
          <div className="mt-3">
            <StatusBadge label={memory.platforms.supabase.status} tone="success" />
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="Current Tasks" href="/agents" linkLabel="Agent activity" />
        <div className="space-y-2">
          {memory.currentTasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm">
              <span>{t.title}</span>
              <div className="flex gap-2">
                <StatusBadge label={AGENT_LABELS[t.agent] ?? t.agent} />
                <StatusBadge label={t.status} tone={t.status === "idle" ? "neutral" : "success"} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="All Projects" href="/projects" />
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-500">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3">Platforms</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Cost</th>
              </tr>
            </thead>
            <tbody>
              {memory.projects.map((p) => (
                <ProjectRow key={p.slug} project={p} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionHeader title="Recent Agent Activity" href="/agents" />
        <ul className="space-y-2">
          {memory.agentActivity.slice(0, 5).map((a) => (
            <li key={a.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm">
              <span className="text-cyan-400">{AGENT_LABELS[a.agent] ?? a.agent}</span>
              <span className="text-zinc-500"> · </span>
              {a.action}
              <span className="mt-1 block text-xs text-zinc-600">{new Date(a.timestamp).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
