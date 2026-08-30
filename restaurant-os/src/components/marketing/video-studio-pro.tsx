"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import {
  DarkSelect,
  DarkSegment,
  darkFieldClass,
} from "@/components/marketing/dark-form-controls";
import { RUNWAY_DURATIONS, RUNWAY_STUDIO_MODELS } from "@/lib/marketing/providers/runway-video";
import type { VideoBrandPayload } from "@/lib/marketing/video-brand-service";
import { VideoBrandPreviewModal, VideoBrandSection } from "@/components/marketing/video-brand-section";
import { VideoJobDetailModal, VideoJobHistoryPanel, type JobHistoryRow } from "@/components/marketing/video-job-history";
import { VideoStudioMediaThumb } from "@/components/marketing/video-studio-media-thumb";
import {
  jobStatusLabel,
  normalizeProgress,
  resolveVideoUrl,
} from "@/components/marketing/video-studio-ui-helpers";
import {
  MAX_REFERENCE_IMAGES,
  MAX_VIDEO_BYTES,
  VIDEO_MEDIA_CATEGORIES,
  VIDEO_MEDIA_CATEGORY_LABELS,
  estimateRunwayCostUsd,
  type MediaSource,
  type StoryboardScene,
  type VideoMediaAssetPublic,
} from "@/lib/marketing/video-studio-types";

type ConnectedProvider = {
  key: string;
  nameAr: string;
  nameEn: string;
  modelId: string | null;
  status: string;
};

type JobView = {
  jobId: string;
  projectId?: string | null;
  status: string;
  progress: number | null;
  outputUrl: string | null;
  rawOutputUrl?: string | null;
  finalOutputUrl?: string | null;
  error: string | null;
  creativeId: string | null;
  estimatedCost?: number | null;
  externalTaskId?: string | null;
};

type ProjectSummary = {
  id: string;
  name: string;
  prompt: string;
  updatedAt: string;
};

const STUDIO_SESSION_KEY = "video-studio-active-job";

function jobViewFromHistory(row: JobHistoryRow): JobView {
  return {
    jobId: row.jobId,
    projectId: row.projectId,
    status: row.status,
    progress: row.progress,
    outputUrl: resolveVideoUrl(row),
    finalOutputUrl: row.finalOutputUrl,
    rawOutputUrl: row.rawOutputUrl,
    error: row.error,
    creativeId: row.creativeId,
    estimatedCost: row.estimatedCost ?? null,
    externalTaskId: row.externalTaskId,
  };
}

function pickActiveJobFromHistory(rows: JobHistoryRow[]): JobHistoryRow | null {
  return rows.find((j) => j.status === "PROCESSING" || j.status === "PENDING") ?? rows[0] ?? null;
}

function newSceneId() {
  return `sc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function storyboardFromImages(assets: VideoMediaAssetPublic[], prev: StoryboardScene[]): StoryboardScene[] {
  const byAsset = new Map(prev.filter((s) => s.assetId).map((s) => [s.assetId!, s]));
  return assets.map((a, i) => {
    const existing = byAsset.get(a.id);
    return {
      id: existing?.id ?? newSceneId(),
      order: i,
      label: existing?.label ?? `المشهد ${i + 1}`,
      assetId: a.id,
    };
  });
}

const SOURCE_OPTIONS: { value: MediaSource; label: string }[] = [
  { value: "device", label: "رفع من الجهاز" },
  { value: "library", label: "مكتبة المطعم" },
  { value: "google_drive", label: "Google Drive" },
  { value: "dropbox", label: "Dropbox" },
  { value: "url", label: "رابط مباشر" },
];

const LIBRARY_TABS = [
  VIDEO_MEDIA_CATEGORIES.LOGO,
  VIDEO_MEDIA_CATEGORIES.DISH,
  VIDEO_MEDIA_CATEGORIES.VENUE_DAY,
  VIDEO_MEDIA_CATEGORIES.VENUE_NIGHT,
  VIDEO_MEDIA_CATEGORIES.PAST_VIDEO,
  VIDEO_MEDIA_CATEGORIES.REFERENCE_IMAGE,
  VIDEO_MEDIA_CATEGORIES.REFERENCE_VIDEO,
] as const;

export function VideoStudioPro({
  title,
  desc,
  providersHref,
}: {
  title: string;
  desc: string;
  providersHref: string;
}) {
  const [providers, setProviders] = useState<ConnectedProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [providerKey, setProviderKey] = useState("");
  const [mode, setMode] = useState<"text_to_video" | "image_to_video">("image_to_video");
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState("9:16");
  const [durationSec, setDurationSec] = useState(5);
  const [model, setModel] = useState("gen4.5");
  const [generating, setGenerating] = useState(false);
  const [job, setJob] = useState<JobView | null>(null);
  const [formError, setFormError] = useState("");
  const [brandPayload, setBrandPayload] = useState<VideoBrandPayload | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [refImages, setRefImages] = useState<VideoMediaAssetPublic[]>([]);
  const [refVideo, setRefVideo] = useState<VideoMediaAssetPublic | null>(null);
  const [storyboard, setStoryboard] = useState<StoryboardScene[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [jobHistory, setJobHistory] = useState<JobHistoryRow[]>([]);
  const [jobHistoryLoading, setJobHistoryLoading] = useState(true);
  const [jobHistoryError, setJobHistoryError] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const [uploadSource, setUploadSource] = useState<MediaSource>("device");
  const [urlInput, setUrlInput] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<VideoMediaAssetPublic[]>([]);
  const [libraryCategory, setLibraryCategory] = useState<string>(VIDEO_MEDIA_CATEGORIES.DISH);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const loadProviders = useCallback(() => {
    setLoadingProviders(true);
    fetch("/api/marketing/creative/video-providers")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.providers ?? []) as ConnectedProvider[];
        setProviders(list);
        setProviderKey((prev) => {
          if (prev && list.some((p) => p.key === prev)) return prev;
          return list[0]?.key ?? "";
        });
      })
      .finally(() => setLoadingProviders(false));
  }, []);

  const loadRefImages = useCallback(() => {
    fetch(`/api/marketing/creative/media-library?category=${VIDEO_MEDIA_CATEGORIES.REFERENCE_IMAGE}`)
      .then((r) => r.json())
      .then((d) => {
        const assets = (d.assets ?? []) as VideoMediaAssetPublic[];
        setRefImages(assets);
        setStoryboard((prev) => storyboardFromImages(assets, prev));
      })
      .catch(() => undefined);
  }, []);

  const loadRefVideo = useCallback(() => {
    fetch(`/api/marketing/creative/media-library?category=${VIDEO_MEDIA_CATEGORIES.REFERENCE_VIDEO}`)
      .then((r) => r.json())
      .then((d) => {
        const assets = (d.assets ?? []) as VideoMediaAssetPublic[];
        setRefVideo(assets[0] ?? null);
      })
      .catch(() => undefined);
  }, []);

  const loadProjects = useCallback(() => {
    fetch("/api/marketing/creative/video-projects")
      .then((r) => r.json())
      .then((d) => setProjects((d.projects ?? []) as ProjectSummary[]))
      .catch(() => undefined);
  }, []);

  const loadJobHistory = useCallback(async (sync = false): Promise<JobHistoryRow[] | null> => {
    try {
      if (!sync) {
        setJobHistoryLoading(true);
        setJobHistoryError("");
      }
      const q = sync ? "?sync=1" : "";
      const res = await fetch(`/api/marketing/creative/video/jobs${q}`, {
        signal: AbortSignal.timeout(sync ? 120000 : 30000),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "فشل جلب سجل التوليدات");
      const rows = (d.jobs ?? []) as JobHistoryRow[];
      setJobHistory(rows);
      return rows;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل جلب سجل التوليدات";
      if (!sync) setJobHistoryError(msg);
      return null;
    } finally {
      if (!sync) setJobHistoryLoading(false);
    }
  }, []);

  const refreshJobHistoryFromRunway = useCallback(() => {
    void loadJobHistory(true);
  }, [loadJobHistory]);

  const handleJobHistoryUpdate = useCallback((row: JobHistoryRow) => {
    setJobHistory((prev) => prev.map((j) => (j.jobId === row.jobId ? { ...j, ...row } : j)));
    if (job?.jobId === row.jobId) {
      setJob({
        jobId: row.jobId,
        projectId: row.projectId,
        status: row.status,
        progress: row.progress,
        outputUrl: resolveVideoUrl(row),
        finalOutputUrl: row.finalOutputUrl,
        rawOutputUrl: row.rawOutputUrl,
        error: row.error,
        creativeId: row.creativeId,
        externalTaskId: row.externalTaskId,
      });
    }
  }, [job?.jobId]);

  const pollJob = useCallback(async (jobId: string) => {
    const res = await fetch(`/api/marketing/creative/video/jobs/${jobId}`);
    const data = (await res.json()) as JobView & { error?: string };
    if (!res.ok) {
      setFormError(data.error ?? "فشل متابعة المهمة");
      setGenerating(false);
      return;
    }
    setJob(data);
    try {
      sessionStorage.setItem(STUDIO_SESSION_KEY, JSON.stringify({ jobId: data.jobId }));
    } catch {
      /* ignore */
    }
    if (data.status === "SUCCEEDED" || data.status === "FAILED") {
      setGenerating(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      loadProjects();
      loadJobHistory(true);
    }
  }, [loadJobHistory, loadProjects]);

  const startPolling = useCallback(
    (jobId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      void pollJob(jobId);
      pollRef.current = setInterval(() => void pollJob(jobId), 10000);
    },
    [pollJob]
  );

  useEffect(() => {
    loadProviders();
    loadRefImages();
    loadRefVideo();
    loadProjects();
    void (async () => {
      const rows = await loadJobHistory(false);
      if (rows?.length) {
        const active = pickActiveJobFromHistory(rows);
        if (active) {
          setJob(jobViewFromHistory(active));
          if (active.status === "PROCESSING" || active.status === "PENDING") {
            setGenerating(true);
            startPolling(active.jobId);
          }
        }
      }
      void loadJobHistory(true);
    })();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadProviders, loadRefImages, loadRefVideo, loadProjects, loadJobHistory, startPolling]);

  useEffect(() => {
    if (!job?.jobId) return;
    const row = jobHistory.find((j) => j.jobId === job.jobId);
    if (!row) return;
    setJob((prev) => {
      if (!prev || prev.jobId !== row.jobId) return prev;
      const url = resolveVideoUrl(row);
      if (
        prev.status === row.status &&
        prev.progress === row.progress &&
        prev.outputUrl === url &&
        prev.error === row.error
      ) {
        return prev;
      }
      return {
        ...prev,
        status: row.status,
        progress: row.progress,
        outputUrl: url,
        finalOutputUrl: row.finalOutputUrl,
        rawOutputUrl: row.rawOutputUrl,
        error: row.error,
        creativeId: row.creativeId,
      };
    });
    if (row.status === "SUCCEEDED" || row.status === "FAILED") {
      setGenerating(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [jobHistory, job?.jobId]);

  useEffect(() => {
    const hasProcessing = jobHistory.some(
      (j) => j.status === "PROCESSING" || j.status === "PENDING"
    );
    if (!hasProcessing) return;
    const t = setInterval(() => void loadJobHistory(true), 10000);
    return () => clearInterval(t);
  }, [jobHistory, loadJobHistory]);

  useEffect(() => {
    if (refImages.length > 0) setMode("image_to_video");
  }, [refImages.length]);

  const isRunway = providerKey === "RUNWAY";
  const primaryImage = useMemo(
    () => refImages.find((a) => a.isPrimary) ?? refImages[0] ?? null,
    [refImages]
  );

  const estimatedCost = useMemo(
    () => estimateRunwayCostUsd(durationSec, Math.max(1, storyboard.length || refImages.length), model),
    [durationSec, storyboard.length, refImages.length, model]
  );

  async function uploadFile(file: File, category: string, source: MediaSource, isPrimary?: boolean) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category);
    fd.append("source", source);
    if (isPrimary) fd.append("isPrimary", "true");
    fd.append("name", file.name);
    const res = await fetch("/api/marketing/creative/media-library", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "فشل الرفع");
    return data.asset as VideoMediaAssetPublic;
  }

  async function importFromUrl(category: string, source: MediaSource) {
    const res = await fetch("/api/marketing/creative/media-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: urlInput, category, source, name: urlInput.slice(0, 80) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "فشل الاستيراد");
    return data.asset as VideoMediaAssetPublic;
  }

  async function handleAddImages(files: FileList | File[]) {
    setFormError("");
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      setFormError("اختر ملفات صورة");
      return;
    }
    if (refImages.length + list.length > MAX_REFERENCE_IMAGES) {
      setFormError(`الحد الأقصى ${MAX_REFERENCE_IMAGES} صورة`);
      return;
    }
    setUploading(true);
    try {
      for (const file of list) {
        const asset = await uploadFile(
          file,
          VIDEO_MEDIA_CATEGORIES.REFERENCE_IMAGE,
          uploadSource === "library" ? "device" : uploadSource,
          refImages.length === 0
        );
        setRefImages((prev) => [...prev, asset]);
        setStoryboard((prev) =>
          storyboardFromImages([...refImages, asset], prev.length ? prev : [])
        );
      }
      loadRefImages();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  }

  async function handleAddVideo(file: File) {
    if (!file.type.match(/^(video\/(mp4|quicktime)|application\/octet-stream)/) && !file.name.match(/\.(mp4|mov)$/i)) {
      setFormError("الفيديو المرجعي: MP4 أو MOV فقط");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setFormError("الحد الأقصى 200MB للفيديو المرجعي");
      return;
    }
    setUploading(true);
    try {
      const asset = await uploadFile(file, VIDEO_MEDIA_CATEGORIES.REFERENCE_VIDEO, uploadSource);
      setRefVideo(asset);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "فشل رفع الفيديو");
    } finally {
      setUploading(false);
    }
  }

  async function onUrlImport(asVideo: boolean) {
    if (!urlInput.trim()) {
      setFormError("أدخل الرابط");
      return;
    }
    setUploading(true);
    try {
      const cat = asVideo ? VIDEO_MEDIA_CATEGORIES.REFERENCE_VIDEO : VIDEO_MEDIA_CATEGORIES.REFERENCE_IMAGE;
      const asset = await importFromUrl(cat, uploadSource);
      if (asVideo) setRefVideo(asset);
      else {
        setRefImages((prev) => [...prev, asset]);
        loadRefImages();
      }
      setUrlInput("");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "فشل الاستيراد");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(id: string) {
    await fetch(`/api/marketing/creative/media-library/${id}`, { method: "DELETE" });
    setRefImages((prev) => prev.filter((a) => a.id !== id));
    setStoryboard((prev) => prev.filter((s) => s.assetId !== id));
  }

  async function setPrimary(id: string) {
    await fetch(`/api/marketing/creative/media-library/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    setRefImages((prev) => prev.map((a) => ({ ...a, isPrimary: a.id === id })));
  }

  function reorderImages(from: number, to: number) {
    if (from === to) return;
    setRefImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      setStoryboard(storyboardFromImages(next, storyboard));
      return next;
    });
  }

  function reorderStoryboard(from: number, to: number) {
    setStoryboard((prev) => {
      const next = [...prev].sort((a, b) => a.order - b.order);
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      const images = next
        .map((s) => refImages.find((a) => a.id === s.assetId))
        .filter(Boolean) as VideoMediaAssetPublic[];
      if (images.length === refImages.length) setRefImages(images);
      return next.map((s, i) => ({ ...s, order: i, label: `المشهد ${i + 1}` }));
    });
  }

  async function openLibrary() {
    setLibraryOpen(true);
    const res = await fetch(`/api/marketing/creative/media-library?category=${libraryCategory}`);
    const d = await res.json();
    setLibraryAssets((d.assets ?? []) as VideoMediaAssetPublic[]);
  }

  function pickFromLibrary(asset: VideoMediaAssetPublic) {
    if (asset.mimeType.startsWith("video/")) {
      setRefVideo(asset);
    } else if (refImages.length < MAX_REFERENCE_IMAGES && !refImages.some((a) => a.id === asset.id)) {
      setRefImages((prev) => [...prev, asset]);
      loadRefImages();
    }
    setLibraryOpen(false);
  }

  async function runGenerate(regenerateOnly?: boolean, overrideProjectId?: string) {
    setFormError("");
    if (!providerKey) {
      setFormError("اختر مزود التوليد");
      return;
    }
    if (!prompt.trim()) {
      setFormError("أدخل وصف الفيديو (Prompt)");
      return;
    }
    if (mode === "image_to_video" && refImages.length === 0 && !brandPayload?.referenceDataUri) {
      setFormError("أضف صورة مرجعية واحدة على الأقل");
      return;
    }

    setGenerating(true);
    setJob(null);
    setPreflightOpen(false);

    const effectiveProjectId = overrideProjectId ?? projectId;

    const body = {
      providerKey,
      mode,
      prompt: prompt.trim(),
      aspect,
      durationSec,
      model: isRunway ? model : undefined,
      brand: brandPayload,
      projectId: effectiveProjectId ?? undefined,
      storyboard: storyboard.length > 1 ? storyboard : undefined,
      imageAssetIds: refImages.map((a) => a.id),
      referenceVideoAssetId: refVideo?.id ?? null,
      saveProject: true,
      projectName: brandPayload?.restaurantName ? `فيديو ${brandPayload.restaurantName}` : undefined,
    };

    const url =
      regenerateOnly && effectiveProjectId
        ? `/api/marketing/creative/video-projects/${effectiveProjectId}/regenerate`
        : "/api/marketing/creative/video/generate";

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setFormError(data.error ?? "فشل بدء التوليد");
      setGenerating(false);
      return;
    }
    if (data.projectId) setProjectId(data.projectId);
    startPolling(data.jobId as string);
  }

  async function regenerateFromProject(id: string) {
    await loadProject(id);
    setProjectId(id);
    await runGenerate(true, id);
  }

  async function loadProject(id: string) {
    const res = await fetch(`/api/marketing/creative/video-projects?id=${id}`);
    const d = await res.json();
    if (!res.ok || !d.project) return;
    const p = d.project;
    setProjectId(p.id);
    setPrompt(p.prompt);
    if (p.providerKey) setProviderKey(p.providerKey);
    if (p.mode) setMode(p.mode);
    if (p.aspectRatio) setAspect(p.aspectRatio);
    if (p.durationSec) setDurationSec(p.durationSec);
    if (p.modelId) setModel(p.modelId);
    if (p.brand) setBrandPayload(p.brand);
    if (p.storyboard?.length) setStoryboard(p.storyboard);
    loadRefImages();
    loadRefVideo();
  }

  const providerOptions = providers.map((p) => ({
    value: p.key,
    label: p.nameAr || p.nameEn,
  }));

  if (loadingProviders) return <MkLoading />;

  return (
    <div dir="rtl" className="text-stone-100">
      <MkPageHeader title={title} desc={desc} />
      <MkCard className="mb-4 border-stone-700 bg-stone-950/80">
        <Link href={providersHref} className="text-sm text-amber-400 hover:text-amber-300">
          إعدادات المزودين والمفاتيح →
        </Link>
      </MkCard>

      {providers.length === 0 ? (
        <MkCard className="border-stone-700 bg-stone-950/80 py-10 text-center">
          <p className="text-stone-200">
            لا يوجد مزود توليد فيديو متصل.{" "}
            <Link href={providersHref} className="text-amber-400 underline">
              اذهب إلى إعدادات المزودين للربط.
            </Link>
          </p>
        </MkCard>
      ) : (
        <>
          <VideoJobHistoryPanel
            jobs={jobHistory}
            providers={providers}
            loading={jobHistoryLoading}
            error={jobHistoryError}
            onRefresh={refreshJobHistoryFromRunway}
            onSelectJob={setSelectedJobId}
            onRegenerateProject={(id) => void regenerateFromProject(id)}
          />

          {projects.length > 0 && (
            <MkCard className="mb-4 border-stone-700 bg-stone-950/80">
              <h3 className="mb-2 text-sm font-semibold text-amber-200">مشاريع محفوظة — إعادة التوليد بدون رفع</h3>
              <div className="flex flex-wrap gap-2">
                {projects.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => void loadProject(p.id)}
                    className="rounded-lg border border-stone-600 px-3 py-1.5 text-xs hover:bg-stone-800"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </MkCard>
          )}

          <MkCard className="mb-4 border-stone-700 bg-stone-950/80">
            <h3 className="mb-3 font-semibold text-white">مصادر الوسائط</h3>
            <DarkSegment
              label="مصدر الرفع"
              value={uploadSource}
              onChange={(v) => setUploadSource(v as MediaSource)}
              options={SOURCE_OPTIONS}
            />

            {(uploadSource === "url" || uploadSource === "google_drive" || uploadSource === "dropbox") && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  className={darkFieldClass()}
                  placeholder={
                    uploadSource === "google_drive"
                      ? "رابط Google Drive…"
                      : uploadSource === "dropbox"
                        ? "رابط Dropbox…"
                        : "https://…"
                  }
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void onUrlImport(false)}
                  className="rounded-lg bg-stone-700 px-4 py-2 text-sm hover:bg-stone-600 disabled:opacity-50"
                >
                  استيراد صورة
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void onUrlImport(true)}
                  className="rounded-lg bg-stone-700 px-4 py-2 text-sm hover:bg-stone-600 disabled:opacity-50"
                >
                  استيراد فيديو
                </button>
              </div>
            )}

            {uploadSource === "library" && (
              <button
                type="button"
                className="mt-3 rounded-lg border border-amber-700/50 px-4 py-2 text-sm text-amber-300 hover:bg-amber-950/30"
                onClick={() => void openLibrary()}
              >
                فتح مكتبة المطعم
              </button>
            )}

            {uploadSource === "device" && (
              <div
                className={`mt-4 rounded-xl border-2 border-dashed p-6 transition ${
                  dragOver ? "border-amber-500 bg-amber-950/20" : "border-stone-600 bg-stone-900/40"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const files = e.dataTransfer.files;
                  if (files.length) void handleAddImages(files);
                }}
              >
                <p className="mb-2 text-sm text-stone-300">اسحب الصور هنا (حتى {MAX_REFERENCE_IMAGES}) أو</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className={`${darkFieldClass()} file:me-3 file:rounded file:border-0 file:bg-amber-700 file:px-3 file:py-1 file:text-white`}
                  onChange={(e) => e.target.files && void handleAddImages(e.target.files)}
                />
                <p className="mt-3 text-xs text-stone-500">فيديو مرجعي MP4/MOV حتى 200MB</p>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,.mp4,.mov"
                  className={`${darkFieldClass()} mt-2 file:me-3 file:rounded file:border-0 file:bg-stone-600 file:px-3 file:py-1 file:text-white`}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleAddVideo(f);
                  }}
                />
              </div>
            )}
          </MkCard>

          <MkCard className="mb-4 border-stone-700 bg-stone-950/80">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-white">
                صور مرجعية ({refImages.length}/{MAX_REFERENCE_IMAGES})
              </h3>
              {primaryImage && (
                <span className="text-xs text-emerald-400">أساسية: {primaryImage.name ?? primaryImage.id.slice(0, 6)}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {refImages.map((img, index) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => {
                    dragIndex.current = index;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex.current !== null) reorderImages(dragIndex.current, index);
                    dragIndex.current = null;
                  }}
                  className={`relative w-32 overflow-hidden rounded-lg border ${
                    img.isPrimary ? "border-amber-500 ring-2 ring-amber-500/40" : "border-stone-600"
                  } bg-stone-900`}
                >
                  <VideoStudioMediaThumb
                    assetId={img.id}
                    mimeType={img.mimeType}
                    alt={img.name ?? "صورة مرجعية"}
                    className="h-28 w-full object-cover bg-stone-800"
                  />
                  <div className="flex gap-1 p-1">
                    <button
                      type="button"
                      title="أساسية"
                      className="flex-1 rounded bg-stone-800 py-0.5 text-[10px] hover:bg-amber-900"
                      onClick={() => void setPrimary(img.id)}
                    >
                      ★
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded bg-red-950 py-0.5 text-[10px] text-red-300"
                      onClick={() => void removeImage(img.id)}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {refVideo && (
              <div className="mt-4 rounded-lg border border-stone-600 p-3">
                <p className="text-xs text-stone-400">فيديو مرجعي (حركة/أسلوب)</p>
                <p className="text-sm">{refVideo.name ?? refVideo.url.slice(0, 48)}</p>
              </div>
            )}
          </MkCard>

          <MkCard className="mb-4 border-stone-700 bg-stone-950/80">
            <h3 className="mb-3 font-semibold text-white">Storyboard</h3>
            <p className="mb-2 text-xs text-stone-400">اسحب لإعادة ترتيب المشاهد — كل مشهد مرتبط بصورة</p>
            <div className="space-y-2">
              {(storyboard.length ? storyboard : storyboardFromImages(refImages, [])).map((scene, index) => {
                const asset = refImages.find((a) => a.id === scene.assetId);
                return (
                  <div
                    key={scene.id}
                    draggable
                    onDragStart={() => {
                      dragIndex.current = index;
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex.current !== null) reorderStoryboard(dragIndex.current, index);
                      dragIndex.current = null;
                    }}
                    className="flex items-center gap-3 rounded-lg border border-stone-700 bg-stone-900/60 p-2"
                  >
                    <span className="cursor-grab text-stone-500">⋮⋮</span>
                    <span className="w-24 shrink-0 text-xs text-amber-300">{scene.label}</span>
                    {asset ? (
                      <VideoStudioMediaThumb
                        assetId={asset.id}
                        mimeType={asset.mimeType}
                        alt={scene.label}
                        className="h-14 w-20 shrink-0 rounded object-cover bg-stone-800"
                      />
                    ) : (
                      <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded bg-stone-800 text-[10px] text-stone-500">
                        —
                      </div>
                    )}
                    <span className="truncate text-xs text-stone-400">{asset?.name ?? "—"}</span>
                  </div>
                );
              })}
            </div>
          </MkCard>

          <MkCard className="mb-4 grid gap-4 border-stone-700 bg-stone-950/80 sm:grid-cols-2">
            <DarkSelect
              label="مزود التوليد"
              value={providerKey}
              onChange={setProviderKey}
              options={providerOptions}
              placeholder="— اختر المزود —"
            />

            {isRunway && (
              <>
                <DarkSegment
                  label="نوع التوليد"
                  value={mode}
                  onChange={(v) => setMode(v as typeof mode)}
                  options={[
                    { value: "text_to_video", label: "نص → فيديو" },
                    { value: "image_to_video", label: "نص + صور → فيديو" },
                  ]}
                />

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm text-stone-200">وصف الفيديو (Prompt)</label>
                  <textarea
                    className={`${darkFieldClass()} min-h-[100px]`}
                    rows={4}
                    placeholder="يُدمج تلقائيًا مع كل الصور المرجعية للحفاظ على هوية المطعم…"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>

                <DarkSelect
                  label="المقاس"
                  value={aspect}
                  onChange={setAspect}
                  options={[
                    { value: "9:16", label: "9:16 (Reels / TikTok)" },
                    { value: "16:9", label: "16:9 (YouTube)" },
                    { value: "1:1", label: "1:1 (مربع)" },
                  ]}
                />

                <DarkSelect
                  label="المدة (ثوانٍ)"
                  value={String(durationSec)}
                  onChange={(v) => setDurationSec(Number(v))}
                  options={RUNWAY_DURATIONS.map((d) => ({ value: String(d), label: `${d} ث` }))}
                />

                <DarkSelect
                  label="النموذج"
                  value={model}
                  onChange={setModel}
                  options={RUNWAY_STUDIO_MODELS.map((m) => ({ value: m.id, label: m.labelAr }))}
                />

                <VideoBrandSection onChange={setBrandPayload} onPreview={() => setPreviewOpen(true)} />
              </>
            )}

            {!isRunway && providerKey && (
              <p className="text-sm text-amber-300 sm:col-span-2">
                التوليد متعدد المشاهد وصورة→فيديو متاح حاليًا عبر Runway المتصل.
              </p>
            )}

            {formError && (
              <p className="text-sm text-red-400 sm:col-span-2" role="alert">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="button"
                disabled={generating || !isRunway || !providerKey}
                onClick={() => setPreflightOpen(true)}
                className="rounded-lg border border-amber-600 px-6 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-950/40 disabled:opacity-40"
              >
                معاينة قبل التوليد
              </button>
              {projectId && (
                <button
                  type="button"
                  disabled={generating || !isRunway}
                  onClick={() => void runGenerate(true)}
                  className="rounded-lg border border-stone-500 px-6 py-3 text-sm hover:bg-stone-800 disabled:opacity-40"
                >
                  إعادة التوليد (نفس الملفات)
                </button>
              )}
            </div>
          </MkCard>

          {job && (
            <MkCard className="border-stone-700 bg-stone-950/80">
              <h3 className="mb-2 font-semibold text-white">حالة التوليد الحالية</h3>
              <p className="text-sm text-stone-300">
                الحالة:{" "}
                <span className="text-amber-300">{jobStatusLabel(job.status)}</span>
                {normalizeProgress(job.progress) != null && job.status === "PROCESSING" && (
                  <span className="mr-2"> · {normalizeProgress(job.progress)}%</span>
                )}
                {job.estimatedCost != null && (
                  <span className="mr-2 text-stone-500"> · تقدير ~${job.estimatedCost}</span>
                )}
              </p>
              {generating && job.status === "PROCESSING" && (
                <p className="mt-2 text-xs text-stone-400">يتم فحص الحالة من Runway كل 10 ثوانٍ…</p>
              )}
              {job.error && job.status === "FAILED" && (
                <p className="mt-2 text-sm text-red-400">{job.error}</p>
              )}
              {job.status === "SUCCEEDED" && resolveVideoUrl(job) && (
                <div className="mt-4 space-y-3">
                  <video
                    src={resolveVideoUrl(job)!}
                    controls
                    className="max-h-[420px] w-full rounded-lg border border-stone-700 bg-black"
                  />
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={resolveVideoUrl(job)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-amber-700 px-4 py-2 text-sm text-white hover:bg-amber-600"
                    >
                      فتح الفيديو
                    </a>
                    <a
                      href={resolveVideoUrl(job)!}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-lg border border-stone-600 px-4 py-2 text-sm text-white hover:bg-stone-800"
                    >
                      تنزيل النهائي
                    </a>
                  </div>
                </div>
              )}
            </MkCard>
          )}

          {preflightOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="max-w-md rounded-xl border border-stone-600 bg-stone-950 p-6 shadow-xl">
                <h3 className="mb-4 text-lg font-semibold text-white">معاينة قبل التوليد</h3>
                <ul className="space-y-2 text-sm text-stone-300">
                  <li>عدد الصور: {refImages.length}</li>
                  <li>فيديوهات مرجعية: {refVideo ? 1 : 0}</li>
                  <li>الشعار: {brandPayload?.logoUrl ? "نعم (يُطبّق تلقائيًا)" : "من إعدادات المطعم إن وُجد"}</li>
                  <li>المطعم: {brandPayload?.restaurantName ?? "—"}</li>
                  <li>المقاس: {aspect}</li>
                  <li>المدة: {durationSec} ث</li>
                  <li>النموذج: {model}</li>
                  <li>المشاهد: {Math.max(storyboard.length, refImages.length, 1)}</li>
                  <li className="text-amber-300">التكلفة التقديرية: ~${estimatedCost} USD</li>
                </ul>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg px-4 py-2 text-sm text-stone-400 hover:bg-stone-800"
                    onClick={() => setPreflightOpen(false)}
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                    onClick={() => void runGenerate(false)}
                  >
                    تأكيد التوليد
                  </button>
                </div>
              </div>
            </div>
          )}

          {libraryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl border border-stone-600 bg-stone-950 p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {LIBRARY_TABS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`rounded px-2 py-1 text-xs ${
                        libraryCategory === cat ? "bg-amber-700 text-white" : "bg-stone-800"
                      }`}
                      onClick={() => {
                        setLibraryCategory(cat);
                        fetch(`/api/marketing/creative/media-library?category=${cat}`)
                          .then((r) => r.json())
                          .then((d) => setLibraryAssets((d.assets ?? []) as VideoMediaAssetPublic[]));
                      }}
                    >
                      {VIDEO_MEDIA_CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {libraryAssets.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => pickFromLibrary(a)}
                      className="overflow-hidden rounded border border-stone-700 hover:border-amber-500"
                    >
                      {a.mimeType.startsWith("video/") ? (
                        <span className="flex h-20 items-center justify-center bg-stone-900 text-xs">▶ فيديو</span>
                      ) : (
                        <VideoStudioMediaThumb
                          assetId={a.id}
                          mimeType={a.mimeType}
                          className="h-20 w-full object-cover bg-stone-800"
                        />
                      )}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-4 w-full rounded-lg bg-stone-800 py-2 text-sm"
                  onClick={() => setLibraryOpen(false)}
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}

          <VideoBrandPreviewModal
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            brand={brandPayload}
            aspect={aspect}
          />

          <VideoJobDetailModal
            jobId={selectedJobId}
            providers={providers}
            onClose={() => setSelectedJobId(null)}
            onRegenerate={(id) => {
              setSelectedJobId(null);
              void regenerateFromProject(id);
            }}
            onUpdated={handleJobHistoryUpdate}
          />
        </>
      )}
    </div>
  );
}
