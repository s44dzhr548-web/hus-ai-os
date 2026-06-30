import { loadAiMemory } from "./ai-memory";
import { getPlatformStatus } from "./platform-status";
import type { DashboardState } from "./types";

export async function getDashboardState(): Promise<DashboardState> {
  const [memory, platform] = await Promise.all([
    Promise.resolve(loadAiMemory()),
    getPlatformStatus(),
  ]);
  return { memory, platform };
}
