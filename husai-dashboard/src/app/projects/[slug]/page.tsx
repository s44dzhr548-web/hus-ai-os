import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { getProject, getRegistry } from "@/lib/registry";
import { getPlatformStatus } from "@/lib/platform-status";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const status = await getPlatformStatus();
  const live = status.projects.find((p) => p.slug === slug);
  const registry = getRegistry();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/projects" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Back to projects
        </Link>
        <h2 className="mt-4 text-3xl font-semibold">{project.name}</h2>
        <p className="mt-2 text-zinc-400">{project.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoBlock title="Production URL" value={project.productionUrl} link />
        <InfoBlock title="Health endpoint" value={`${project.productionUrl}${project.healthPath}`} />
        <InfoBlock title="Local dev" value={`cd ${project.localPath} && npm run dev`} mono />
        <InfoBlock title="Vercel root directory" value={project.localPath} mono />
        <InfoBlock title="GitHub path" value={`${registry.github.remote}/tree/main/${project.githubPath}`} link />
        <InfoBlock
          title="Runtime health"
          value={live?.health.ok ? `OK (${live.health.latencyMs}ms)` : live?.health.error || "Unreachable"}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <StatusBadge label={project.status} tone={project.status === "live" ? "success" : "neutral"} />
        <StatusBadge label={project.priority} />
        {project.supabase && <StatusBadge label="Supabase" tone="success" />}
      </div>

      <a
        href={project.productionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-cyan-400"
      >
        Open project
      </a>
    </div>
  );
}

function InfoBlock({
  title,
  value,
  mono,
  link,
}: {
  title: string;
  value: string;
  mono?: boolean;
  link?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <p className="text-sm text-zinc-500">{title}</p>
      {link ? (
        <a
          href={value.startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-2 block break-all text-sm text-cyan-400 hover:underline ${mono ? "font-mono" : ""}`}
        >
          {value}
        </a>
      ) : (
        <p className={`mt-2 break-all text-sm text-zinc-200 ${mono ? "font-mono" : ""}`}>{value}</p>
      )}
    </div>
  );
}
