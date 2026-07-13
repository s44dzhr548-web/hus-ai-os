import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import {
  getCommandDashboard,
  getSmartBudgetRecommendations,
  getBudgetDistributionAI,
  getBrainCenter,
  getCopyCenter,
  getAnalyticsCharts,
  getAutomationCenter,
  getCustomerJourney,
  getCampaignBuilderDrafts,
  ASSISTANT_STUBS,
} from "@/lib/marketing/command/service";
import {
  getExecutiveCommandCenter,
  getRestaurantGoals,
  getAuditLog,
  getAttributionJourney,
  getPerformanceAnalysis,
} from "@/lib/marketing/command/executive";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const section = req.nextUrl.searchParams.get("section") || "dashboard";
  const rid = restaurantId!;

  switch (section) {
    case "executive":
    case "command-center":
      return NextResponse.json(await getExecutiveCommandCenter(rid));
    case "dashboard":
      return NextResponse.json(await getCommandDashboard(rid));
    case "goals":
      return NextResponse.json(await getRestaurantGoals(rid));
    case "audit":
      return NextResponse.json(await getAuditLog(rid));
    case "attribution":
      return NextResponse.json(await getAttributionJourney(rid));
    case "performance":
      return NextResponse.json(await getPerformanceAnalysis());
    case "brain":
      return NextResponse.json(await getBrainCenter(rid));
    case "copy":
      return NextResponse.json(await getCopyCenter(rid));
    case "analytics":
      return NextResponse.json(await getAnalyticsCharts(rid));
    case "automation":
      return NextResponse.json(await getAutomationCenter(rid));
    case "journey":
      return NextResponse.json(await getCustomerJourney(rid));
    case "campaigns":
      return NextResponse.json(await getCampaignBuilderDrafts(rid));
    case "budget":
      return NextResponse.json(
        await getSmartBudgetRecommendations(rid, {
          daily: Number(req.nextUrl.searchParams.get("daily")) || 500,
          goal: req.nextUrl.searchParams.get("goal") ?? undefined,
          city: req.nextUrl.searchParams.get("city") ?? undefined,
        })
      );
    case "distribution":
      return NextResponse.json(
        getBudgetDistributionAI(Number(req.nextUrl.searchParams.get("budget")) || 500)
      );
    case "assistant":
      return NextResponse.json({ prompts: ASSISTANT_STUBS });
    default:
      return NextResponse.json({ error: "Unknown section" }, { status: 404 });
  }
}

export async function POST(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;
  const body = await req.json();
  if (body.section === "budget") {
    return NextResponse.json(await getSmartBudgetRecommendations(restaurantId!, body));
  }
  if (body.section === "distribution") {
    return NextResponse.json(getBudgetDistributionAI(body.budget ?? 500, body.overrides));
  }
  return NextResponse.json({ error: "Unknown section" }, { status: 400 });
}
