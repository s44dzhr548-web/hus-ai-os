import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const match = env.match(/VERCEL_OIDC_TOKEN="([^"]+)"/);
if (!match) {
  console.error("no token");
  process.exit(1);
}

const res = await fetch(
  "https://api.vercel.com/v9/projects/prj_ADOeyWvg6wuSXXYreN6vtmWYlKle?teamId=team_22KVyDhzM2nxPmThaTLMnIwQ",
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${match[1]}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rootDirectory: null }),
  }
);
const data = await res.json();
console.log(JSON.stringify({ status: res.status, rootDirectory: data.rootDirectory, error: data.error }, null, 2));
