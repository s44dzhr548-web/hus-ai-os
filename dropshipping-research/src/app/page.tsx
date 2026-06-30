import { rankNiches, DEMO_NICHES } from "@/lib/niche-scoring";

export default function Home() {
  const report = rankNiches(DEMO_NICHES);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 px-6 py-10">
        <p className="text-sm uppercase tracking-widest text-violet-400">
          HUSAI-OS · Dropshipping Research
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Weekly Niche Report</h1>
        <p className="mt-2 text-zinc-400">
          Demo data · CJ API integration pending
        </p>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-3">Niche</th>
              <th className="py-3">Score</th>
              <th className="py-3">Grade</th>
              <th className="py-3">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {report.map((row) => (
              <tr key={row.name} className="border-b border-zinc-900">
                <td className="py-4 font-medium">{row.name}</td>
                <td className="py-4">{row.score}</td>
                <td className="py-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      row.grade === "A"
                        ? "bg-emerald-900 text-emerald-300"
                        : row.grade === "B"
                          ? "bg-blue-900 text-blue-300"
                          : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {row.grade}
                  </span>
                </td>
                <td className="py-4 text-zinc-400">{row.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
