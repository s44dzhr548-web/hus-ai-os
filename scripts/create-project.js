#!/usr/bin/env node
/**
 * Scaffold a new HUSAI-OS project.
 * Usage:
 *   node scripts/create-project.js "Project Name" "Description"
 *   node scripts/create-project.js --slug my-app --name "My App" --description "..." --priority P2 --port 3004 --supabase
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

const { flags, positional } = parseArgs(process.argv.slice(2));
const name = flags.name || positional[0];
const description = flags.description || positional[1] || "";
const slug = (flags.slug || name || "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
const priority = flags.priority || "P3";
const port = Number(flags.port || flags.devPort || 3000 + Math.floor(Math.random() * 900));
const useSupabase = flags["no-supabase"] ? false : Boolean(flags.supabase);

if (!name || !slug) {
  console.error('Usage: node scripts/create-project.js "Project Name" "Description"');
  console.error("   or: node scripts/create-project.js --slug my-app --name \"My App\"");
  process.exit(1);
}

const projectDir = path.join(root, slug);
if (fs.existsSync(projectDir)) {
  console.error(`Project folder already exists: ${slug}`);
  process.exit(1);
}

fs.mkdirSync(path.join(projectDir, "src", "app", "api", "health"), { recursive: true });

const pkg = {
  name: slug,
  version: "0.1.0",
  private: true,
  scripts: {
    dev: `next dev -p ${port}`,
    build: "next build",
    start: "next start",
    lint: "eslint",
    test: "vitest run",
  },
  dependencies: {
    next: "16.2.9",
    react: "19.2.4",
    "react-dom": "19.2.4",
  },
  devDependencies: {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    eslint: "^9",
    "eslint-config-next": "16.2.9",
    tailwindcss: "^4",
    typescript: "^5",
    vitest: "^4.1.9",
  },
};

if (useSupabase) {
  pkg.dependencies["@supabase/ssr"] = "^0.12.0";
  pkg.dependencies["@supabase/supabase-js"] = "^2.109.0";
}

fs.writeFileSync(path.join(projectDir, "package.json"), JSON.stringify(pkg, null, 2));

fs.writeFileSync(
  path.join(projectDir, "next.config.ts"),
  `import type { NextConfig } from "next";\nconst nextConfig: NextConfig = { turbopack: { root: __dirname } };\nexport default nextConfig;\n`
);

fs.writeFileSync(
  path.join(projectDir, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "react-jsx",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./src/*"] },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2
  )
);

fs.writeFileSync(
  path.join(projectDir, "src", "app", "layout.tsx"),
  `export default function Layout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}\n`
);

fs.writeFileSync(
  path.join(projectDir, "src", "app", "page.tsx"),
  `export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: "system-ui", background: "#09090b", color: "#fafafa", minHeight: "100vh" }}>
      <p style={{ color: "#22d3ee", fontSize: 12, letterSpacing: 2 }}>HUSAI-OS</p>
      <h1>${name.replace(/"/g, '\\"')}</h1>
      <p style={{ color: "#a1a1aa" }}>${(description || "New HUSAI project").replace(/"/g, '\\"')}</p>
    </main>
  );
}\n`
);

fs.writeFileSync(
  path.join(projectDir, "src", "app", "api", "health", "route.ts"),
  `import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ status: "ok", app: "${slug}", timestamp: new Date().toISOString() });
}\n`
);

const envExample = [`NEXT_PUBLIC_APP_URL=http://localhost:${port}`];
if (useSupabase) {
  envExample.push("NEXT_PUBLIC_SUPABASE_URL=", "NEXT_PUBLIC_SUPABASE_ANON_KEY=");
}
fs.writeFileSync(path.join(projectDir, ".env.example"), envExample.join("\n") + "\n");
fs.writeFileSync(path.join(projectDir, "vercel.json"), JSON.stringify({ framework: "nextjs" }, null, 2));
fs.writeFileSync(
  path.join(projectDir, "README.md"),
  `# ${name}\n\n${description || "HUSAI-OS project"}\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`
);

const registryPath = path.join(root, "projects", "registry.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
registry.updatedAt = new Date().toISOString();
registry.projects.push({
  slug,
  name,
  description: description || `${name} — HUSAI-OS project`,
  priority,
  stack: useSupabase ? ["Next.js", "Supabase"] : ["Next.js"],
  localPath: slug,
  githubPath: slug,
  vercelProject: slug,
  productionUrl: `https://${slug}.vercel.app`,
  healthPath: "/api/health",
  devPort: port,
  supabase: useSupabase,
  status: "planned",
});
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");

fs.writeFileSync(
  path.join(root, "projects", `${slug}.md`),
  `# ${name}\n\n**Status:** Planned\n**Created:** ${new Date().toISOString().slice(0, 10)}\n\n${description}\n`
);

try {
  execSync("node scripts/sync-registry.js", { cwd: root, stdio: "pipe" });
} catch {}

console.log(`Created project: ${slug}`);
console.log(`Folder: ${projectDir}`);
console.log(`Dev port: ${port}`);
console.log(`Registry updated: projects/registry.json`);
console.log(`Spec: projects/${slug}.md`);
console.log(`[Orchestrator] Setup Agent will create GitHub repo + Vercel project (rootDirectory: ${slug})`);
console.log(`[Orchestrator] Run: node scripts/set-vercel-root.js ${slug} ${slug} after Vercel project exists`);
