"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui";
import { McCard } from "@/components/marketing-center/mc-shell";

interface Rec {
  id: string;
  titleAr: string;
  description: string | null;
  type: string;
}

export default function RecommendationsPage() {
  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketing-center/recommendations")
      .then((r) => r.json())
      .then((d) => setItems(d.recommendations || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">محرك التوصيات AI</h1>
      <p className="mb-6 text-sm opacity-70">توصيات UI فقط — لا تنفيذ</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((r) => (
          <McCard key={r.id} glow className="cursor-default">
            <p className="font-semibold text-amber-400/90">{r.titleAr}</p>
            <p className="mt-2 text-sm opacity-70">{r.description}</p>
            <span className="mt-3 inline-block rounded-full bg-stone-800 px-2 py-0.5 text-xs">{r.type}</span>
          </McCard>
        ))}
      </div>
    </div>
  );
}
