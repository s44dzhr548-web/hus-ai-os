import { StatusBadge } from "@/components/status-badge";
import { loadAiMemory } from "@/lib/ai-memory";
import { AGENT_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function AgentsPage() {
  const memory = loadAiMemory();

  const agents = [
    "ceo", "orchestrator", "cto", "product-manager", "architect",
    "frontend", "backend", "database", "api", "qa", "devops",
    "security", "deployment", "marketing", "finance", "support", "setup",
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Agent Activity</h2>
        <p className="mt-2 text-zinc-400">CEO → Orchestrator → Specialists → Project Factory</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((id) => (
          <div key={id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="font-medium">{AGENT_LABELS[id] ?? id}</p>
            <StatusBadge label="Active" tone="success" />
          </div>
        ))}
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Activity Log</h3>
        <ul className="space-y-2">
          {memory.agentActivity.map((a) => (
            <li key={a.id} className="rounded-lg border border-zinc-800 px-4 py-3 text-sm">
              <span className="font-medium text-cyan-400">{AGENT_LABELS[a.agent] ?? a.agent}</span>
              {a.project && <span className="text-zinc-500"> · {a.project}</span>}
              <p className="mt-1 text-zinc-300">{a.action}</p>
              <p className="text-xs text-zinc-600">{new Date(a.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Current Tasks</h3>
        {memory.currentTasks.map((t) => (
          <div key={t.id} className="mb-2 flex justify-between rounded-lg border border-zinc-800 px-4 py-3 text-sm">
            <span>{t.title}</span>
            <StatusBadge label={`${AGENT_LABELS[t.agent] ?? t.agent} · ${t.status}`} />
          </div>
        ))}
      </section>
    </div>
  );
}
