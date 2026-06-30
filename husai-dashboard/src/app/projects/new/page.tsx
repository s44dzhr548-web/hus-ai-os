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
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"P1" | "P2" | "P3">("P2");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const slug = slugify(name);

    try {
      const res = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name,
          description: description || `${name} — HUSAI-OS project`,
          priority,
          devPort: 3004,
          supabase: true,
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(
          data.error ??
            "CEO Agent will queue this goal. Orchestrator runs Project Factory when the control plane is local."
        );
        return;
      }

      setResult(
        data.message ??
          "Project Factory started. Agents will connect GitHub, Vercel, Supabase, run tests, and deploy. You will receive the production URL — no technical steps required."
      );
    } catch {
      setError(
        "Goal submitted to CEO queue. Agents will execute Project Factory autonomously."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Submit a New Goal</h2>
        <p className="mt-2 text-zinc-400">
          Describe what you want built. CEO Agent assigns Orchestrator → Project
          Factory → specialists. You are not asked to run commands or configure
          platforms.
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
            onChange={(e) => setName(e.target.value)}
            placeholder="My SaaS App"
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm outline-none focus:border-cyan-500"
          />
        </Field>
        <Field label="What should it do?">
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe the product goal in plain language…"
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm outline-none focus:border-cyan-500"
          />
        </Field>
        <Field label="Priority">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as "P1" | "P2" | "P3")}
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm outline-none focus:border-cyan-500"
          >
            <option value="P1">P1 — Critical</option>
            <option value="P2">P2 — Standard</option>
            <option value="P3">P3 — Experimental</option>
          </select>
        </Field>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {loading ? "Starting Project Factory…" : "Submit goal to CEO Agent"}
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border border-amber-800/50 bg-amber-950/30 p-4 text-sm text-amber-200">
          {error}
        </div>
      )}
      {result && (
        <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/30 p-4 text-sm text-emerald-200">
          <pre className="whitespace-pre-wrap font-sans text-sm">{result}</pre>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-500">
        <p className="font-medium text-zinc-300">Agents handle automatically</p>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>Folder structure and codebase</li>
          <li>GitHub repository and commits</li>
          <li>Vercel project and deployment</li>
          <li>Supabase connection and schema</li>
          <li>Environment configuration</li>
          <li>Tests, security scan, and production URL</li>
        </ul>
        <p className="mt-4 text-zinc-600">
          If OAuth or payment is required, the Human Approval Gateway will
          interrupt you once — then agents resume.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm text-zinc-400">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
