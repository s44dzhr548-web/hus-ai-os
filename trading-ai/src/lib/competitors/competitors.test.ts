import { describe, expect, it } from "vitest";
import {
  COMPETITORS,
  ROADMAP,
  filterCompetitors,
  getComparisonMatrix,
  getCompetitiveAdvantages,
  getFeatureGapAnalysis,
} from "./data";

describe("competitors intelligence", () => {
  it("includes at least 20 competitors", () => {
    expect(COMPETITORS.length).toBeGreaterThanOrEqual(20);
  });

  it("filters competitors by tag", () => {
    const charting = filterCompetitors(["charting"]);
    expect(charting.length).toBeGreaterThan(0);
    expect(charting.every((c) => c.filters.includes("charting"))).toBe(true);
  });

  it("renders comparison matrix with HUSAI row", () => {
    const en = getComparisonMatrix("en");
    const ar = getComparisonMatrix("ar");
    expect(en.some((r) => r.isHusai)).toBe(true);
    expect(ar.some((r) => r.isHusai)).toBe(true);
    expect(en.length).toBe(COMPETITORS.length + 1);
  });

  it("renders feature gap analysis", () => {
    const gaps = getFeatureGapAnalysis();
    expect(gaps.some((g) => g.priority === "high")).toBe(true);
    expect(gaps.every((g) => g.titleEn && g.titleAr)).toBe(true);
  });

  it("renders competitive advantages", () => {
    const adv = getCompetitiveAdvantages();
    expect(adv.some((a) => a.id === "arabic")).toBe(true);
  });

  it("renders 3-phase roadmap", () => {
    expect(ROADMAP).toHaveLength(3);
    expect(ROADMAP[0].itemsEn.length).toBeGreaterThan(0);
    expect(ROADMAP[0].itemsAr.length).toBeGreaterThan(0);
  });

  it("supports Arabic competitor page data", () => {
    const c = COMPETITORS[0];
    expect(c.nameAr.length).toBeGreaterThan(0);
    expect(c.mainFeaturesAr.length).toBeGreaterThan(0);
  });

  it("supports English competitor page data", () => {
    const c = COMPETITORS[0];
    expect(c.name.length).toBeGreaterThan(0);
    expect(c.mainFeatures.length).toBeGreaterThan(0);
  });
});
