"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatJobDate,
  jobStatusLabel,
  jobStatusTone,
  normalizeProgress,
  providerDisplayName,
  resolveVideoUrl,
} from "@/components/marketing/video-studio-ui-helpers";

export type JobHistoryRow = {
  jobId: string;
  status: string;
  prompt: string;
  mode: string;
  providerKey: string;
  durationSec: number;
  aspectRatio: string;
  modelId: string | null;
  progress: number | null;
  outputUrl: string | null;
  finalOutputUrl?: string | null;
  rawOutputUrl?: string | null;
  error: string | null;
  creativeId: string | null;
  projectId: string | null;
  externalTaskId?: string | null;
  estimatedCost?: number | null;
  createdAt: string;
  updatedAt: string;
  runwayStatus?: string | null;
  lastRunwayPollAt?: string | null;
};

type ProviderOption = { key: string; nameAr: string; nameEn: string };

export function VideoJobDetailModal({
  jobId,
  providers,
  onClose,
  onRegenerate,
  onUpdated,
}: {
  jobId: string | null;
  providers: ProviderOption[];
  onClose: () => void;
  onRegenerate: (projectId: string) => void;
  onUpdated: (job: JobHistoryRow) => void;
}) {
  const [job, setJob] = useState<JobHistoryRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTechnical, setShowTechnical] = useState(false);

  const refresh = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/marketing/creative/video/jobs/${jobId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل جلب التفاصيل");
      const row: JobHistoryRow = {
        jobId: data.jobId,
        status: data.status,
        prompt: data.prompt ?? "",
        mode: data.mode ?? "",
        providerKey: data.providerKey ?? "",
        durationSec: data.durationSec ?? 0,
        aspectRatio: data.aspectRatio ?? "",
        modelId: data.modelId ?? null,
        progress: data.progress ?? null,
        outputUrl: data.outputUrl ?? null,
        finalOutputUrl: data.finalOutputUrl ?? null,
        rawOutputUrl: data.rawOutputUrl ?? null,
        error: data.error ?? null,
        creativeId: data.creativeId ?? null,
        projectId: data.projectId ?? null,
        externalTaskId: data.externalTaskId ?? null,
        estimatedCost: data.estimatedCost ?? null,
        runwayStatus: data.runwayStatus ?? null,
        lastRunwayPollAt: data.lastRunwayPollAt ?? null,
        createdAt: data.createdAt ?? new Date().toISOString(),
        updatedAt: data.updatedAt ?? new Date().toISOString(),
      };
      setJob(row);
      onUpdated(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التحديث");
    } finally {
      setLoading(false);
    }
  }, [jobId, onUpdated]);

  useEffect(() => {
    if (jobId) void refresh();
    else setJob(null);
  }, [jobId, refresh]);

  useEffect(() => {
    if (!jobId || !job || (job.status !== "PROCESSING" && job.status !== "PENDING")) return;
    const t = setInterval(() => void refresh(), 10000);
    return () => clearInterval(t);
  }, [jobId, job?.status, refresh]);

  if (!jobId) return null;

  const videoUrl = job ? resolveVideoUrl(job) : null;
  const pct = job ? normalizeProgress(job.progress) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-600 bg-stone-950 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">تفاصيل التوليد</h3>
          <button type="button" className="text-stone-400 hover:text-white" onClick={onClose}>
            ✕
          </button>
        </div>

        {loading && !job && <p className="text-sm text-stone-400">جاري التحديث من Runway…</p>}
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {job && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-xs ${jobStatusTone(job.status)}`}>
                {jobStatusLabel(job.status)}
              </span>
              {pct != null && job.status === "PROCESSING" && (
                <span className="text-xs text-stone-400">{pct}% (Runway)</span>
              )}
              {job.status === "PROCESSING" && pct == null && (
                <span className="text-xs text-stone-400">جاري المعالجة على Runway…</span>
              )}
            </div>

            {job.status === "PROCESSING" && pct != null && (
              <div className="h-2 overflow-hidden rounded-full bg-stone-800">
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}

            <p className="text-stone-300">{job.prompt}</p>

            <dl className="grid grid-cols-2 gap-2 text-xs text-stone-400">
              <div>
                <dt className="text-stone-500">تاريخ الإنشاء</dt>
                <dd className="text-stone-200">{formatJobDate(job.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-stone-500">المزود</dt>
                <dd className="text-stone-200">{providerDisplayName(job.providerKey, providers)}</dd>
              </div>
              <div>
                <dt className="text-stone-500">النموذج</dt>
                <dd className="text-stone-200">{job.modelId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-stone-500">المدة / المقاس</dt>
                <dd className="text-stone-200">
                  {job.durationSec} ث · {job.aspectRatio}
                </dd>
              </div>
            </dl>

            {job.status === "FAILED" && job.error && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-xs text-red-300">
                <p className="mb-1 font-medium text-red-200">سبب الفشل</p>
                {job.error}
              </div>
            )}

            {videoUrl && job.status === "SUCCEEDED" && (
              <div className="space-y-2">
                <video src={videoUrl} controls className="max-h-64 w-full rounded-lg border border-stone-700 bg-black" />
                <div className="flex flex-wrap gap-2">
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs text-white hover:bg-amber-600"
                  >
                    تشغيل
                  </a>
                  <a
                    href={videoUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-stone-600 px-3 py-1.5 text-xs hover:bg-stone-800"
                  >
                    تنزيل
                  </a>
                </div>
                <p className="break-all text-[10px] text-stone-500">
                  <span className="text-stone-400">رابط الفيديو النهائي: </span>
                  <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400/90 hover:underline">
                    {videoUrl}
                  </a>
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void refresh()}
                className="rounded-lg border border-stone-600 px-3 py-1.5 text-xs hover:bg-stone-800 disabled:opacity-50"
              >
                {loading ? "جاري التحديث…" : "تحديث من Runway"}
              </button>
              {job.projectId && (
                <button
                  type="button"
                  onClick={() => onRegenerate(job.projectId!)}
                  className="rounded-lg border border-amber-700 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-950/40"
                >
                  إعادة التوليد
                </button>
              )}
            </div>

            <button
              type="button"
              className="text-xs text-stone-500 underline hover:text-stone-300"
              onClick={() => setShowTechnical((v) => !v)}
            >
              {showTechnical ? "إخفاء التفاصيل التقنية" : "التفاصيل التقنية"}
            </button>
            {showTechnical && (
              <div className="rounded border border-stone-800 bg-stone-900/50 p-2 font-mono text-[10px] text-stone-500">
                <p>Job: {job.jobId}</p>
                {job.externalTaskId && <p>Runway task: {job.externalTaskId}</p>}
                {job.creativeId && <p>Creative: {job.creativeId}</p>}
                {job.projectId && <p>Project: {job.projectId}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function VideoJobHistoryPanel({
  jobs,
  providers,
  loading,
  error,
  onSelectJob,
  onRegenerateProject,
  onRefresh,
}: {
  jobs: JobHistoryRow[];
  providers: ProviderOption[];
  loading?: boolean;
  error?: string;
  onSelectJob: (jobId: string) => void;
  onRegenerateProject: (projectId: string) => void;
  onRefresh?: () => void;
}) {
  return (
    <div className="mb-4 rounded-xl border border-stone-700 bg-stone-950/80 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-amber-200">سجل التوليدات</h3>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded border border-stone-600 px-2 py-1 text-xs text-stone-300 hover:bg-stone-800 disabled:opacity-50"
          >
            {loading ? "جاري التحديث…" : "تحديث من Runway"}
          </button>
        )}
      </div>

      {loading && jobs.length === 0 && (
        <p className="text-sm text-stone-400">جاري تحميل المهام من قاعدة البيانات…</p>
      )}
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      {!loading && !error && jobs.length === 0 && (
        <p className="text-sm text-stone-400">لا توجد مهام توليد محفوظة بعد.</p>
      )}

      {jobs.length > 0 && (
      <ul className="max-h-[32rem] space-y-3 overflow-y-auto">
        {jobs.map((h) => {
          const pct = normalizeProgress(h.progress);
          const videoUrl = resolveVideoUrl(h);
          return (
            <li key={h.jobId}>
              <div className="w-full rounded-lg border border-stone-700 bg-stone-900/50 p-3 text-right text-xs">
                <button
                  type="button"
                  onClick={() => onSelectJob(h.jobId)}
                  className="w-full text-right transition hover:opacity-90"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded-full border px-2 py-0.5 ${jobStatusTone(h.status)}`}>
                      {jobStatusLabel(h.status)}
                    </span>
                    {pct != null && h.status === "PROCESSING" && (
                      <span className="text-stone-400">{pct}% (Runway)</span>
                    )}
                    {h.status === "PROCESSING" && pct == null && (
                      <span className="text-stone-500">Runway…</span>
                    )}
                    <span className="text-stone-500">{formatJobDate(h.createdAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-stone-300">{h.prompt}</p>
                  <p className="mt-1 text-stone-500">
                    {providerDisplayName(h.providerKey, providers)}
                    {h.modelId ? ` · ${h.modelId}` : ""} · {h.durationSec} ث · {h.aspectRatio}
                  </p>
                  {h.status === "FAILED" && h.error && (
                    <p className="mt-2 line-clamp-3 text-red-400">{h.error}</p>
                  )}
                  {h.status === "PROCESSING" && pct != null && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-800">
                      <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </button>

                {h.status === "SUCCEEDED" && videoUrl && (
                  <div className="mt-3 space-y-2 border-t border-stone-800 pt-3" onClick={(e) => e.stopPropagation()}>
                    <video
                      src={videoUrl}
                      controls
                      preload="metadata"
                      className="max-h-48 w-full rounded-lg border border-stone-700 bg-black"
                    />
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-emerald-700 px-2 py-1 text-emerald-400 hover:bg-emerald-950/30"
                      >
                        تشغيل
                      </a>
                      <a
                        href={videoUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-stone-600 px-2 py-1 hover:bg-stone-800"
                      >
                        تنزيل
                      </a>
                    </div>
                    <p className="break-all text-[10px] text-stone-500">
                      <span className="text-stone-400">رابط الفيديو: </span>
                      <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400/90 hover:underline">
                        {videoUrl}
                      </a>
                    </p>
                  </div>
                )}

                <div className="mt-2 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  {h.projectId && (
                    <button
                      type="button"
                      onClick={() => onRegenerateProject(h.projectId!)}
                      className="rounded border border-amber-800 px-2 py-1 text-amber-300 hover:bg-amber-950/30"
                    >
                      إعادة التوليد
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectJob(h.jobId)}
                    className="rounded border border-stone-600 px-2 py-1 hover:bg-stone-800"
                  >
                    التفاصيل
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      )}
    </div>
  );
}
