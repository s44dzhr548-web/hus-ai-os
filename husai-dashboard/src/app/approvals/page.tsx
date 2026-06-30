import { StatusBadge } from "@/components/status-badge";
import { loadAiMemory } from "@/lib/ai-memory";
import { AGENT_LABELS, GATE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function ApprovalsPage() {
  const memory = loadAiMemory();
  const approvals = memory.pendingApprovals;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Human Approval Gateway</h2>
        <p className="mt-2 text-zinc-400">
          The only place you are interrupted. Allowed reasons: OAuth, OTP, payment, KYC, legal.
        </p>
      </div>

      {approvals.length === 0 ? (
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-8 text-center">
          <StatusBadge label="All clear — agents running autonomously" tone="success" />
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((a) => (
            <div key={a.id} className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={GATE_LABELS[a.gate]} tone="warning" />
                <StatusBadge label={a.status} />
              </div>
              <p className="mt-3 text-sm">{a.reason}</p>
              {a.provider && <p className="mt-1 text-xs text-zinc-500">Provider: {a.provider}</p>}
              <p className="mt-3 text-xs text-zinc-600">
                After approval, agents resume automatically — no technical steps required.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
