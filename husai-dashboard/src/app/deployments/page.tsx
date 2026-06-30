import { StatusBadge } from "@/components/status-badge";
import { getDeploymentHistory } from "@/lib/platform-status";

export const dynamic = "force-dynamic";

export default function DeploymentsPage() {
  const deployments = getDeploymentHistory();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Deployment History</h2>
        <p className="mt-2 text-zinc-400">Production deployments across all HUSAI projects</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">Project</th>
              <th className="px-5 py-3 font-medium">Environment</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">URL</th>
              <th className="px-5 py-3 font-medium">Deployed</th>
            </tr>
          </thead>
          <tbody>
            {deployments.map((d) => (
              <tr key={d.id} className="border-b border-zinc-900">
                <td className="px-5 py-4 font-medium">{d.project}</td>
                <td className="px-5 py-4">{d.environment}</td>
                <td className="px-5 py-4">
                  <StatusBadge
                    label={d.status}
                    tone={d.status === "success" ? "success" : d.status === "failed" ? "error" : "warning"}
                  />
                </td>
                <td className="px-5 py-4">
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                    {d.url.replace("https://", "")}
                  </a>
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {new Date(d.deployedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
