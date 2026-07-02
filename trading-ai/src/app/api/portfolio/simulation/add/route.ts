import { NextResponse } from "next/server";
import { addToPortfolioSimulation, getSimulationSymbols, simulationPersistenceStatus } from "@/lib/portfolio/simulation-store";

export async function GET() {
  return NextResponse.json({
    symbols: getSimulationSymbols(),
    persistence: simulationPersistenceStatus(),
    executionMode: "paper_only",
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { symbol?: string; weightPct?: number };
  if (!body.symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const result = addToPortfolioSimulation(body.symbol, Number(body.weightPct ?? 5));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({
    ok: true,
    item: result.item,
    symbols: getSimulationSymbols(),
    portfolioManagerUrl: "/dashboard/portfolio-manager",
    executionMode: "paper_only",
    brokerEnabled: false,
  });
}
