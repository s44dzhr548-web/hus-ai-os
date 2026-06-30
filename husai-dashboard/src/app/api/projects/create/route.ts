import { NextResponse } from "next/server";
import { execFileSync } from "child_process";
import path from "path";
import type { CreateProjectInput } from "@/lib/types";
import { getMonorepoRoot } from "@/lib/registry";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as CreateProjectInput;
  const root = getMonorepoRoot();
  const scriptPath = path.join(root, "scripts", "create-project.js");

  try {
    const output = execFileSync(
      process.execPath,
      [
        scriptPath,
        "--slug",
        body.slug,
        "--name",
        body.name,
        "--description",
        body.description,
        "--priority",
        body.priority,
        "--port",
        String(body.devPort),
        ...(body.supabase ? ["--supabase"] : ["--no-supabase"]),
      ],
      { cwd: root, encoding: "utf8" }
    );

    return NextResponse.json({ ok: true, message: output });
  } catch (error) {
    const err = error as { stderr?: string; stdout?: string; message?: string };
    const message = err.stderr || err.stdout || err.message || "Failed";

    if (message.includes("ENOENT") || message.includes("Cannot find module")) {
      return NextResponse.json(
        {
          error: "Project creation is only available when running the dashboard locally.",
          command: `node scripts/create-project.js --slug ${body.slug} --name "${body.name}"`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
