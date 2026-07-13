import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingCenterAccess } from "@/lib/marketing-center/auth";
import { runSimulation } from "@/lib/marketing-center/service";
import { stubChatReply } from "@/lib/marketing-center/constants";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingCenterAccess();
  if (error) return error;

  const body = await req.json();
  const path = body._action as string;

  if (path === "chat") {
    const reply = stubChatReply(String(body.message || ""));
    return NextResponse.json({ role: "assistant", content: reply, phase: 1 });
  }

  const budget = Number(body.budget ?? 500);
  const result = runSimulation(budget);

  const sim = await prisma.marketingSimulation.create({
    data: {
      restaurantId: restaurantId!,
      inputBudget: budget,
      resultsJson: result,
      expectedRevenue: result.expectedRevenue,
      expectedProfit: result.expectedProfit,
      expectedRoi: result.expectedRoi,
    },
  });

  return NextResponse.json({ simulation: result, id: sim.id, note: "Simulation only — Phase 1" });
}
