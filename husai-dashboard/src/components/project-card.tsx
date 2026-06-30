import Link from "next/link";
import { StatusBadge } from "./status-badge";
import type { HusaiProject } from "@/lib/types";

type Props = {
  project: HusaiProject & {
    health?: { ok: boolean; latencyMs?: number; error?: string };
    build?: { exists: boolean };
  };
};

export function ProjectCard({ project }: Props) {
  const healthTone = project.health?.ok ? "success" : project.status === "live" ? "warning" : "neutral";

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">{project.priority}</p>
          <h2 className="mt-1 text-xl font-semibold">{project.name}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{project.description}</p>
        </div>
        <StatusBadge label={project.status} tone={project.status === "live" ? "success" : "neutral"} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {project.stack.map((tech) => (
          <span key={tech} className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
            {tech}
          </span>
        ))}
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Health</dt>
          <dd className="mt-1">
            <StatusBadge
              label={
                project.health?.ok
                  ? `OK · ${project.health.latencyMs}ms`
                  : project.health?.error || "Unreachable"
              }
              tone={healthTone}
            />
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Local path</dt>
          <dd className="mt-1 font-mono text-xs text-zinc-300">{project.localPath}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Vercel</dt>
          <dd className="mt-1 font-mono text-xs text-zinc-300">{project.vercelProject}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Supabase</dt>
          <dd className="mt-1">{project.supabase ? "Connected" : "Not required"}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={project.productionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-cyan-400"
        >
          Open production
        </a>
        <Link
          href={`/projects/${project.slug}`}
          className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
        >
          Details
        </Link>
      </div>
    </article>
  );
}
