import { NextResponse } from "next/server";
import { isRealTradingAllowed } from "@/lib/compliance/config";
import { formatPaperE2EReportMarkdown, runPaperTradingE2E } from "@/lib/paper/e2e-workflow";

export async function GET(request: Request) {
  if (isRealTradingAllowed()) {
    return NextResponse.json({ error: "Real trading enabled — E2E blocked" }, { status: 403 });
  }

  const secret = process.env.PAPER_E2E_SECRET;
  if (secret) {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("key") !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const report = await runPaperTradingE2E();
  const markdown = formatPaperE2EReportMarkdown(report);

  return NextResponse.json({
    ok: report.allPassed,
    report,
    markdown,
    productionUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  });
}
