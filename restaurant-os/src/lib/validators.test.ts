import { describe, expect, it } from "vitest";
import { formatCurrency, slugify } from "./validators";

describe("validators", () => {
  it("slugifies text", () => {
    expect(slugify("My Restaurant Name")).toBe("my-restaurant-name");
    expect(slugify("  Hello World!  ")).toBe("hello-world");
  });

  it("formats currency", () => {
    expect(formatCurrency(1299)).toBe("$12.99");
    expect(formatCurrency(0)).toBe("$0.00");
  });
});
