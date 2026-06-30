#!/usr/bin/env node
/**
 * Auto-configure husai-core after Supabase CLI login.
 * Fetches API keys via CLI — no manual copy required.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const PROJECT_NAME = "husai-core";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", cwd: root, stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function parseJson(cmd) {
  try {
    return JSON.parse(run(cmd));
  } catch (e) {
    return null;
  }
}

async function main() {
  const projects = parseJson("npx supabase projects list -o json");
  if (!projects?.length) {
    console.error("No projects found. Complete: npx supabase login");
    process.exit(1);
  }

  const project =
    projects.find((p) => p.name === PROJECT_NAME) ||
    projects.find((p) => p.name?.includes("husai")) ||
    projects[0];

  console.log(`Found project: ${project.name} (${project.id})`);

  run(`npx supabase link --project-ref ${project.id}`);

  const keys = parseJson(
    `npx supabase projects api-keys --project-ref ${project.id} --reveal -o json`
  );
  const anon =
    keys?.find((k) => k.name === "anon" || k.name === "publishable")?.api_key;
  const service =
    keys?.find((k) => k.name === "service_role" || k.name === "secret")?.api_key;

  if (!anon || !service) {
    console.error("Could not fetch API keys via CLI");
    process.exit(1);
  }

  const url = `https://${project.id}.supabase.co`;

  const husaiCore = [
    `NEXT_PUBLIC_SUPABASE_URL=${url}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}`,
    `SUPABASE_SERVICE_ROLE_KEY=${service}`,
    `SUPABASE_PROJECT_REF=${project.id}`,
  ].join("\n");

  fs.writeFileSync(path.join(root, ".env.husai-core"), husaiCore + "\n");
  console.log("Wrote .env.husai-core");

  console.log("Pushing migrations...");
  run("npx supabase db push");

  const apps = [
    ["restaurant-os", "NEXT_PUBLIC_APP_URL=http://localhost:3000"],
    ["trading-ai", "NEXT_PUBLIC_APP_URL=http://localhost:3001\nALPACA_API_KEY=\nALPACA_API_SECRET="],
    ["dropshipping-research", "NEXT_PUBLIC_APP_URL=http://localhost:3002"],
  ];

  for (const [app, extra] of apps) {
    const content = [
      `NEXT_PUBLIC_SUPABASE_URL=${url}`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}`,
      `SUPABASE_SERVICE_ROLE_KEY=${service}`,
      extra,
    ].join("\n");
    fs.writeFileSync(path.join(root, app, ".env.local"), content + "\n");
    console.log(`Wrote ${app}/.env.local`);
  }

  console.log("husai-core connected successfully.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
