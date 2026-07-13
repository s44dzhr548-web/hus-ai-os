import fs from "fs";
import path from "path";
import os from "os";

const authPath = path.join(
  os.homedir(),
  "AppData/Roaming/xdg.data/com.vercel.cli/auth.json"
);
const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
const token = auth.token;
const teamId = "team_22KVyDhzM2nxPmThaTLMnIwQ";
const projectId = "prj_ADOeyWvg6wuSXXYreN6vtmWYlKle";
const deploymentId = process.argv[2] || "dpl_F4Fjdktmfz7tHwrEAjHaSvB1pQq8";

async function api(pathname) {
  const url = `https://api.vercel.com${pathname}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text.slice(0, 500) };
  }
}

async function main() {
  const user = await api("/v2/user");
  console.log("=== USER ===");
  console.log(JSON.stringify(user, null, 2));

  const team = await api(`/v2/teams/${teamId}`);
  console.log("\n=== TEAM ===");
  console.log(JSON.stringify(team, null, 2));

  const project = await api(`/v9/projects/${projectId}?teamId=${teamId}`);
  console.log("\n=== PROJECT (git link) ===");
  const p = project.data;
  console.log(
    JSON.stringify(
      {
        name: p?.name,
        link: p?.link,
        paused: p?.paused,
        targets: p?.targets,
      },
      null,
      2
    )
  );

  const dep = await api(
    `/v13/deployments/${deploymentId}?teamId=${teamId}`
  );
  console.log("\n=== DEPLOYMENT ===");
  const d = dep.data;
  console.log(
    JSON.stringify(
      {
        id: d?.id,
        readyState: d?.readyState,
        url: d?.url,
        aliasAssigned: d?.aliasAssigned,
        errorMessage: d?.errorMessage,
        errorCode: d?.errorCode,
        meta: d?.meta,
        gitSource: d?.gitSource,
        origin: d?.origin,
        projectSettings: d?.projectSettings,
        checksState: d?.checksState,
        checksConclusion: d?.checksConclusion,
        inspectorUrl: d?.inspectorUrl,
      },
      null,
      2
    )
  );

  const checks = await api(
    `/v13/deployments/${deploymentId}/checks?teamId=${teamId}`
  );
  console.log("\n=== DEPLOYMENT CHECKS ===");
  console.log(JSON.stringify(checks, null, 2));

  const events = await api(
    `/v3/deployments/${deploymentId}/events?teamId=${teamId}&limit=20`
  );
  console.log("\n=== DEPLOYMENT EVENTS (last 20) ===");
  console.log(JSON.stringify(events, null, 2));
}

main().catch(console.error);
