"use client";

import { useEffect, useState } from "react";
import { Button, LoadingSpinner } from "@/components/ui";
import { McCard } from "@/components/marketing-center/mc-shell";
import { cn } from "@/lib/utils";

export default function GoalsPage() {
  const [options, setOptions] = useState<{ type: string; labelAr: string }[]>([]);
  const [active, setActive] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketing-center/goals")
      .then((r) => r.json())
      .then((d) => {
        setOptions(d.options || []);
        setActive(d.active || []);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggle(type: string) {
    setActive((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function save() {
    await fetch("/api/marketing-center/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goals: active }),
    });
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">أهداف المطعم</h1>
      <p className="mb-6 text-sm opacity-70">اختر أهدافك التسويقية</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {options.map((o) => (
          <button
            key={o.type}
            type="button"
            onClick={() => toggle(o.type)}
            className="text-right"
          >
            <McCard
              className={cn(
                "transition ring-2",
                active.includes(o.type) ? "ring-amber-500" : "ring-transparent"
              )}
            >
              <p className="font-medium">{o.labelAr}</p>
            </McCard>
          </button>
        ))}
      </div>
      <Button className="mt-6" onClick={save}>
        حفظ الأهداف
      </Button>
    </div>
  );
}
