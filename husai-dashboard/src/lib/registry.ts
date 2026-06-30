import fs from "fs";
import path from "path";
import type { HusaiRegistry, RegistryProject } from "./types";

export function getMonorepoRoot(): string {
  return path.join(process.cwd(), "..");
}

export function getRegistryPath(): string {
  const bundled = path.join(process.cwd(), "src", "data", "registry.json");
  const monorepo = path.join(getMonorepoRoot(), "projects", "registry.json");
  if (fs.existsSync(bundled)) return bundled;
  return monorepo;
}

export function loadRegistry(): HusaiRegistry {
  const registryPath = getRegistryPath();
  const raw = fs.readFileSync(registryPath, "utf8");
  return JSON.parse(raw) as HusaiRegistry;
}

export function getRegistry(): HusaiRegistry {
  return loadRegistry();
}

export function getProject(slug: string): RegistryProject | undefined {
  return loadRegistry().projects.find((p) => p.slug === slug);
}

export function saveRegistry(registry: HusaiRegistry): void {
  registry.updatedAt = new Date().toISOString();
  fs.writeFileSync(getRegistryPath(), `${JSON.stringify(registry, null, 2)}\n`);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function projectBuildExists(localPath: string): boolean {
  return fs.existsSync(path.join(getMonorepoRoot(), localPath, "package.json"));
}
