"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PERMANENT_STORAGE_MESSAGE } from "@/lib/storage/constants";

export function PermanentStorageBanner() {
  const [enabled, setEnabled] = useState(true);
  const [missing, setMissing] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/upload/config")
      .then((r) => r.json())
      .then((d) => {
        setEnabled(!!d.permanentStorageEnabled);
        setMissing(Array.isArray(d.missingEnvVars) ? d.missingEnvVars : []);
        setLoaded(true);
      })
      .catch(() => {
        setEnabled(false);
        setLoaded(true);
      });
  }, []);

  if (!loaded || enabled) return null;

  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div className="space-y-1 text-sm">
        <p className="font-semibold">{PERMANENT_STORAGE_MESSAGE}</p>
        <p className="text-amber-900/80">
          Bucket: <span dir="ltr">menuos-media</span> — أضف متغيرات Cloudflare R2 في Vercel ثم
          أعد النشر.
        </p>
        {missing.length > 0 && (
          <p className="font-mono text-xs text-amber-900" dir="ltr">
            Missing: {missing.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
