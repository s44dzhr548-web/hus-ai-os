import { describe, expect, it } from "vitest";
import { rankNiches, scoreNiche, SAMPLE_NICHES } from "./niche-scoring";

describe("niche scoring", () => {
  it("scores higher for high demand low competition", () => {
    const high = scoreNiche({
      name: "A",
      demandScore: 90,
      avgMarginPct: 50,
      competitionScore: 20,
      trendDirection: "up",
    });
    const low = scoreNiche({
      name: "B",
      demandScore: 30,
      avgMarginPct: 20,
      competitionScore: 90,
      trendDirection: "down",
    });
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("ranks demo niches", () => {
    const ranked = rankNiches(SAMPLE_NICHES);
    expect(ranked.length).toBe(5);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });
});
