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
const deploymentId = process.argv[2] || "dpl_52ZfL5RWowiiLp68rG9t9Qmznnop";

const res = await fetch(
  `https://api.vercel.com/v3/deployments/${deploymentId}/events?teamId=${teamId}&limit=100&direction=backward`,
  { headers: { Authorization: `Bearer ${auth.token}` } }
);
const data = await res.json();
for (const e of (data || []).reverse()) {
  if (e.text) console.log(e.text);
}
