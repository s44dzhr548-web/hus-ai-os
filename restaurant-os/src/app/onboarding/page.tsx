"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { slugify } from "@/lib/validators";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [locationName, setLocationName] = useState("Main Location");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        locationName,
        address: address || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to create restaurant");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-lg space-y-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-widest text-amber-400">
            Step 1 of 1
          </p>
          <h1 className="text-2xl font-semibold text-zinc-50">
            Set up your restaurant
          </h1>
          <p className="text-zinc-400">
            Create your workspace to manage menus, orders, and kitchen display.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-zinc-400">Restaurant name</span>
            <input
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-50 outline-none focus:border-amber-400"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-zinc-400">URL slug</span>
            <input
              required
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-50 outline-none focus:border-amber-400"
            />
            <span className="text-xs text-zinc-500">
              Public menu: /menu/{slug || "your-slug"}
            </span>
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-zinc-400">First location name</span>
            <input
              required
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-50 outline-none focus:border-amber-400"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-zinc-400">Address (optional)</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-50 outline-none focus:border-amber-400"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-400 py-2.5 font-medium text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Launch restaurant"}
          </button>
        </form>
      </div>
    </div>
  );
}
