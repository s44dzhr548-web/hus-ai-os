import { ProjectCard } from "@/components/project-card";
import { getPlatformStatus } from "@/lib/platform-status";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const status = await getPlatformStatus();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Projects</h2>
        <p className="mt-2 text-zinc-400">All HUSAI-OS managed applications</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {status.projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </div>
  );
}
