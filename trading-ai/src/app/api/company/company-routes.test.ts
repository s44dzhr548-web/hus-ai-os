import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/company/[symbol]/profile/route";
import { POST as paperOrder } from "@/app/api/paper/order/route";

describe("company API routes", () => {
  it("GET /api/company/AAPL/profile returns intelligence profile", async () => {
    const res = await GET(new Request("http://localhost/api/company/AAPL/profile"), {
      params: Promise.resolve({ symbol: "AAPL" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile.overview.symbol).toBe("AAPL");
    expect(data.brokerEnabled).toBe(false);
    expect(data.executionMode).toBe("paper_only");
  }, 120000);

  it("GET /api/company/2222.SR/profile resolves Saudi symbol", async () => {
    const res = await GET(new Request("http://localhost/api/company/2222.SR/profile"), {
      params: Promise.resolve({ symbol: "2222.SR" }),
    });
    const data = await res.json();
    expect(data.profile.overview.symbol).toBe("2222");
  }, 120000);

  it("returns 404 for unknown symbol", async () => {
    const res = await GET(new Request("http://localhost/api/company/ZZZZZZ/profile"), {
      params: Promise.resolve({ symbol: "ZZZZZZ" }),
    });
    expect(res.status).toBe(404);
  });

  it("POST /api/paper/order blocks real broker and accepts paper buy", async () => {
    const res = await paperOrder(
      new Request("http://localhost/api/paper/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: "AAPL", side: "buy", quantity: 1 }),
      })
    );
    const data = await res.json();
    expect(data.brokerEnabled).toBe(false);
    expect(data.executionMode).toBe("paper_only");
  }, 120000);
});
