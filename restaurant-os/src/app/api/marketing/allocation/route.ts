import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { getAllocation, runSimulation } from "@/lib/marketing/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;
  const budget = Number(req.nextUrl.searchParams.get("budget") || 0) || undefined;
  const goal = req.nextUrl.searchParams.get("goal") || undefined;
  return NextResponse.json(await getAllocation(restaurantId!, budget, goal ?? undefined));
}

export async function POST(req: NextRequest) {
  const { error } = await requireMarketingAccess();
  if (error) return error;
  const body = await req.json();
  const budget = Number(body.budget) || 500;
  const overrides = body.overrides as Record<string, number> | undefined;
  const sim = runSimulation({ budget, goal: body.goal, ...body });
  if (overrides) {
    const { allocateBudget } = await import("@/lib/marketing/simulation-engine");
    const alloc = allocateBudget(budget, body.goal, overrides);
    if (alloc.overBudget) {
      return NextResponse.json({ error: "المجموع يتجاوز الميزانية" }, { status: 400 });
    }
    const customSim = runSimulation({ budget, goal: body.goal });
    customSim.platforms = customSim.platforms.map((p) => ({
      ...p,
      amount: overrides[p.platform] ?? p.amount,
    }));
    return NextResponse.json({ ...customSim, unallocated: alloc.unallocated, label: "محاكاة" });
  }
  return NextResponse.json(sim);
}
