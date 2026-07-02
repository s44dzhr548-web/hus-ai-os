import { describe, expect, it } from "vitest";
import { addToPortfolioSimulation, getSimulationSymbols } from "@/lib/portfolio/simulation-store";

describe("portfolio simulation store", () => {
  it("adds symbol to simulation basket", () => {
    const result = addToPortfolioSimulation("NVDA", 8);
    expect(result.ok).toBe(true);
    expect(getSimulationSymbols().some((s) => s.symbol === "NVDA")).toBe(true);
  });

  it("rejects unknown symbols", () => {
    const result = addToPortfolioSimulation("NOTREAL");
    expect(result.ok).toBe(false);
  });
});
