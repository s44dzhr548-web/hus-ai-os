import { describe, expect, it } from "vitest";
import { slugify } from "./registry";

describe("slugify", () => {
  it("converts names to kebab-case", () => {
    expect(slugify("My New App")).toBe("my-new-app");
    expect(slugify("  Trading Bot  ")).toBe("trading-bot");
  });
});
