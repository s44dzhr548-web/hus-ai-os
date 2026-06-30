import Link from "next/link";
import { StatusBadge } from "./status-badge";
import type { MemoryProject } from "@/lib/types";

export function ProjectRow({ project }: { project: MemoryProject }) {
  const healthTone = project.health === "ok" ? "success" : "error";

  return (
    <tr className="border-t border-zinc-800">
      <td className="px-4 py-3">
        <p className="font-medium">{project.name}</p>
        <p className="text-xs text-zinc-500">{project.slug}</p>
      </td>
      <td className="px-4 py-3">
        <StatusBadge label={project.status} tone={project.status === "live" ? "success" : "neutral"} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge label={project.health} tone={healthTone} />
      </td>
      <td className="px-4 py-3 text-xs text-zinc-400">
        GH {project.github} · VC {project.vercel} · SB {project.supabase}
      </td>
      <td className="px-4 py-3">
        <a href={project.productionUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline text-sm">
          Open
        </a>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">${project.monthlyCostUsd}/mo</td>
    </tr>
  );
}

export function SectionHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-lg font-semibold">{title}</h3>
      {href && (
        <Link href={href} className="text-sm text-cyan-400 hover:underline">
          {linkLabel ?? "View all"}
        </Link>
      )}
    </div>
  );
}
