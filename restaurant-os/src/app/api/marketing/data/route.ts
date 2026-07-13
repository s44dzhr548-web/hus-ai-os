import { NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import {
  getDecisions,
  getOpportunities,
  getPlatformsPerformance,
  getAudiences,
  getCampaignDrafts,
  getAutomations,
  getIntegrationsList,
  getMarketingSettings,
  getReportsList,
  getGoals,
} from "@/lib/marketing/service";

export const dynamic = "force-dynamic";

const handlers: Record<string, (id: string) => Promise<unknown>> = {
  decisions: getDecisions,
  opportunities: getOpportunities,
  platforms: getPlatformsPerformance,
  audiences: getAudiences,
  campaigns: getCampaignDrafts,
  automations: async () => getAutomations(),
  integrations: async () => getIntegrationsList(),
  settings: getMarketingSettings,
  reports: async () => getReportsList(),
  goals: getGoals,
};

export async function GET(req: Request) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;
  const section = new URL(req.url).searchParams.get("section") || "decisions";
  const fn = handlers[section];
  if (!fn) return NextResponse.json({ error: "Unknown section" }, { status: 404 });
  const data = await fn(restaurantId!);
  return NextResponse.json(data);
}
