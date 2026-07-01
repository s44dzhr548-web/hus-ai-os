#!/usr/bin/env node
/** Set Vercel project rootDirectory for monorepo apps */
const fs = require("fs");
const path = require("path");
const https = require("https");

const projectName = process.argv[2];
const rootDirectory = process.argv[3];

if (!projectName || !rootDirectory) {
  console.error("Usage: node set-vercel-root.js <project-name> <root-directory>");
  process.exit(1);
}

const authPath = path.join(
  process.env.APPDATA || path.join(process.env.HOME || "", "AppData", "Roaming"),
  "xdg.data",
  "com.vercel.cli",
  "auth.json"
);

if (!fs.existsSync(authPath)) {
  console.error("Vercel auth not found. OAuth approval required.");
  process.exit(2);
}

const { token } = JSON.parse(fs.readFileSync(authPath, "utf8"));
const teamId = "team_22KVyDhzM2nxPmThaTLMnIwQ";
const projectIds = {
  "restaurant-os": "prj_ADOeyWvg6wuSXXYreN6vtmWYlKle",
  "trading-ai": "prj_ySTMavWJmLlDPd7eCI6stnfkpaIk",
  "husai-dropshipping-research": null,
  "husai-dashboard": null,
};

const projectId = projectIds[projectName];
if (!projectId) {
  console.error(`Unknown project id for ${projectName}`);
  process.exit(1);
}

const body = JSON.stringify({ rootDirectory });
const options = {
  hostname: "api.vercel.com",
  path: `/v9/projects/${projectId}?teamId=${teamId}`,
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (c) => (data += c));
  res.on("end", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const parsed = JSON.parse(data);
      console.log(`Updated ${projectName} rootDirectory → ${parsed.rootDirectory || rootDirectory}`);
    } else {
      console.error(`API error ${res.statusCode}: ${data}`);
      process.exit(1);
    }
  });
});

req.on("error", (e) => {
  console.error(e.message);
  process.exit(1);
});
req.write(body);
req.end();
