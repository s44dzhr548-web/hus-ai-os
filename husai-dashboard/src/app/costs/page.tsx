import { loadAiMemory } from "@/lib/ai-memory";

export const dynamic = "force-dynamic";

export default function CostsPage() {
  const memory = loadAiMemory();
  const { costs, projects } = memory;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Cost Tracking</h2>
        <p className="mt-2 text-zinc-400">Finance Agent monitors platform spend. Payment gates trigger before any upgrade.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-sm text-zinc-500">Total monthly</p>
        <p className="text-4xl font-semibold">${costs.monthlyUsd}</p>
        <p className="mt-1 text-xs text-zinc-600">Updated {new Date(costs.updatedAt).toLocaleString()}</p>
      </div>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Platform Breakdown</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-500">
            <tr>
              <th className="pb-2">Service</th>
              <th className="pb-2">Tier</th>
              <th className="pb-2">USD/mo</th>
            </tr>
          </thead>
          <tbody>
            {costs.breakdown.map((c) => (
              <tr key={c.service} className="border-t border-zinc-800">
                <td className="py-3">{c.service}</td>
                <td className="py-3 text-zinc-400">{c.tier}</td>
                <td className="py-3">${c.usd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Per Project</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-500">
            <tr>
              <th className="pb-2">Project</th>
              <th className="pb-2">USD/mo</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.slug} className="border-t border-zinc-800">
                <td className="py-3">{p.name}</td>
                <td className="py-3">${p.monthlyCostUsd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
