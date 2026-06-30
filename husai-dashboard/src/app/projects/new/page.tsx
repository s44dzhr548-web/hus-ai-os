"use client";

import { useState } from "react";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewProjectPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"P1" | "P2" | "P3">("P2");
  const [devPort, setDevPort] = useState(3004);
  const [supabase, setSupabase] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const projectSlug = slug || slugify(name);

    try {
      const res = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: projectSlug,
          name,
          description: description || `${name} — HUSAI-OS project`,
          priority,
          devPort,
          supabase,
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        error?: string;
        command?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Failed to create project");
        if (data.command) setResult(data.command);
        return;
      }

      setResult(data.message ?? "Project created");
    } catch {
      setError("Network error — run locally: npm run create-project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Create New Project</h2>
        <p className="mt-2 text-zinc-400">
          Scaffolds folder, registry entry, env files, and Vercel config
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
      >
        <Field label="Project name">
          <input
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) setSlug(slugify(e.target.value));
            }}
            placeholder="My SaaS App"
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm outline-none focus:border-cyan-500"
          />
        </Field>
        <Field label="Slug" hint="folder name">
          <input
            required
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="my-saas-app"
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 font-mono text-sm outline-none focus:border-cyan-500"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm outline-none focus:border-cyan-500"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as "P1" | "P2" | "P3")
              }
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm outline-none focus:border-cyan-500"
            >
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>
          </Field>
          <Field label="Dev port">
            <input
              type="number"
              value={devPort}
              onChange={(e) => setDevPort(Number(e.target.value))}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm outline-none focus:border-cyan-500"
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={supabase}
            onChange={(e) => setSupabase(e.target.checked)}
          />
          Connect to husai-core Supabase
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create project"}
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
        </div>
      )}
      {result && (
        <pre className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-300">
          {result}
        </pre>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm text-zinc-400">{label}</span>
      {hint && <span className="ml-2 text-xs text-zinc-600">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}
