import fs from "fs";
for (const f of [".env.production.local", ".env.local"]) {
  if (!fs.existsSync(f)) continue;
  console.log("---", f);
  for (const line of fs.readFileSync(f, "utf8").split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (k.includes("URL") || k.includes("URI")) {
      try {
        new URL(v);
      } catch {
        console.log("INVALID_URL_KEY", k, "len", v.length);
      }
    }
  }
}
