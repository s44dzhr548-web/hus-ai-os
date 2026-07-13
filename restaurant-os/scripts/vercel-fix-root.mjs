import fs from "fs";
import path from "path";
import os from "os";

const auth = JSON.parse(
  fs.readFileSync(
    path.join(os.homedir(), "AppData/Roaming/xdg.data/com.vercel.cli/auth.json"),
    "utf8"
  )
);
const teamId = "team_22KVyDhzM2nxPmThaTLMnIwQ";
const projectId = "prj_ADOeyWvg6wuSXXYreN6vtmWYlKle";

async function api(method, pathname, body) {
  const res = await fetch(`https://api.vercel.com${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const patch = await api("PATCH", `/v9/projects/${projectId}?teamId=${teamId}`, {
  rootDirectory: "restaurant-os",
  buildCommand:
    "prisma generate && prisma migrate deploy && next build",
  installCommand: "npm install",
  framework: "nextjs",
});

console.log("PATCH project:", JSON.stringify(patch, null, 2));

const redeploy = await api(
  "POST",
  `/v13/deployments?teamId=${teamId}&forceNew=1`,
  {
    name: "restaurant-os",
    project: projectId,
    target: "production",
    gitSource: {
      type: "github",
      org: "s44dzhr548-web",
      repo: "hus-ai-os",
      ref: "main",
      repoId: 1285144556,
    },
  }
);

console.log("REDEPLOY:", JSON.stringify(redeploy, null, 2));
