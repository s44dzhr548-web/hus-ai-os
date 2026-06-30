import { StatusBadge } from "@/components/status-badge";
import { loadAiMemory } from "@/lib/ai-memory";

export const dynamic = "force-dynamic";

export default function ErrorsPage() {
  const memory = loadAiMemory();
  const errors = memory.errors;
  const fixes = memory.fixes;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Errors & Autonomous Recovery</h2>
        <p className="mt-2 text-zinc-400">
          Orchestrator detects, diagnoses, fixes, and retries automatically. Human Gateway only when truly blocked.
        </p>
      </div>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Open Errors</h3>
        {errors.filter((e) => e.status !== "resolved").length === 0 ? (
          <StatusBadge label="No open errors" tone="success" />
        ) : (
          <div className="space-y-2">
            {errors.filter((e) => e.status !== "resolved").map((e) => (
              <div key={e.id} className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm">
                <StatusBadge label={e.type} tone="error" />
                <p className="mt-2">{e.message}</p>
                <p className="text-xs text-zinc-600">{new Date(e.detectedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Recovery History</h3>
        {fixes.length === 0 ? (
          <p className="text-sm text-zinc-500">No recovery actions logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {fixes.slice(0, 20).map((f) => (
              <li key={f.id} className="rounded-lg border border-zinc-800 px-4 py-3 text-sm">
                <StatusBadge label={f.success ? "Fixed" : "Attempted"} tone={f.success ? "success" : "warning"} />
                <p className="mt-1">{f.action}</p>
                <p className="text-xs text-zinc-600">{new Date(f.timestamp).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
