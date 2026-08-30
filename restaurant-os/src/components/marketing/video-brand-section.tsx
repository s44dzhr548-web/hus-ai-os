"use client";

import { useEffect, useState } from "react";
import type { StudioBrandContext, VideoBrandPayload } from "@/lib/marketing/video-brand-service";
import {
  DarkSelect,
  DarkSegment,
  darkFieldClass,
} from "@/components/marketing/dark-form-controls";

const CTA_OPTIONS = [
  { value: "احجز الآن", label: "احجز الآن" },
  { value: "اطلب الآن", label: "اطلب الآن" },
  { value: "زورونا اليوم", label: "زورونا اليوم" },
];

const POSITION_OPTIONS = [
  { value: "top_right", label: "أعلى يمين" },
  { value: "top_left", label: "أعلى يسار" },
  { value: "bottom_right", label: "أسفل يمين" },
  { value: "bottom_left", label: "أسفل يسار" },
  { value: "bottom_center", label: "وسط النهاية" },
];

const TIMING_OPTIONS = [
  { value: "start", label: "بداية الفيديو" },
  { value: "end", label: "نهاية الفيديو" },
  { value: "full", label: "طوال الفيديو" },
  { value: "start_and_end", label: "البداية والنهاية" },
];

export function VideoBrandSection({
  onChange,
  onPreview,
}: {
  onChange: (brand: VideoBrandPayload | null) => void;
  onPreview: () => void;
}) {
  const [ctx, setCtx] = useState<StudioBrandContext | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [showRestaurantName, setShowRestaurantName] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPosition, setLogoPosition] = useState("bottom_right");
  const [logoTiming, setLogoTiming] = useState("end");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [cta, setCta] = useState("احجز الآن");
  const [primaryColor, setPrimaryColor] = useState("#d4af37");
  const [secondaryColor, setSecondaryColor] = useState("#8b6914");
  const [textColor, setTextColor] = useState("#ffffff");
  const [referenceType, setReferenceType] = useState<string>("");
  const [referenceDataUri, setReferenceDataUri] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);

  useEffect(() => {
    fetch("/api/marketing/creative/video-brand")
      .then((r) => r.json())
      .then((d: StudioBrandContext) => {
        setCtx(d);
        setRestaurantName(d.restaurantName);
        setLogoUrl(d.logoUrl);
        setLogoPosition(d.defaultLogoPosition);
        setLogoTiming(d.defaultLogoTiming);
        setCta(d.defaultCTA);
        setPrimaryColor(d.primaryColor);
        setSecondaryColor(d.secondaryColor);
        setTextColor(d.textColor);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    onChange({
      restaurantName,
      showRestaurantName,
      logoUrl,
      logoPosition: logoPosition as VideoBrandPayload["logoPosition"],
      logoTiming: logoTiming as VideoBrandPayload["logoTiming"],
      headline,
      subheadline,
      cta,
      primaryColor,
      secondaryColor,
      textColor,
      referenceType: referenceType
        ? (referenceType as VideoBrandPayload["referenceType"])
        : null,
      referenceDataUri,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- notify parent when form fields change
  }, [
    restaurantName,
    showRestaurantName,
    logoUrl,
    logoPosition,
    logoTiming,
    headline,
    subheadline,
    cta,
    primaryColor,
    secondaryColor,
    textColor,
    referenceType,
    referenceDataUri,
  ]);

  async function uploadLogo(file: File) {
    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (ctx?.canEditBrandDefaults) fd.append("persist", "0");
      const res = await fetch("/api/marketing/creative/video-brand/logo", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الرفع");
      setLogoUrl(data.url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل رفع الشعار");
    } finally {
      setUploadBusy(false);
    }
  }

  function onReferenceFile(file: File | null) {
    if (!file) {
      setReferenceDataUri(null);
      setReferenceName("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceDataUri(String(reader.result));
      setReferenceName(file.name);
    };
    if (file.type.startsWith("image/")) {
      reader.readAsDataURL(file);
    } else {
      setReferenceDataUri(null);
      setReferenceName(file.name);
    }
  }

  return (
    <div className="sm:col-span-2 rounded-xl border border-stone-700 bg-stone-900/60 p-4">
      <h3 className="mb-3 text-lg font-semibold text-white">هوية المطعم داخل الفيديو</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-stone-200 sm:col-span-2">
          اسم المطعم (لهذا الفيديو)
          <input
            className={`${darkFieldClass()} mt-1`}
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-300 sm:col-span-2">
          <input
            type="checkbox"
            checked={showRestaurantName}
            onChange={(e) => setShowRestaurantName(e.target.checked)}
          />
          إظهار اسم المطعم داخل الفيديو
        </label>

        <div className="sm:col-span-2">
          <p className="text-sm text-stone-200">شعار المطعم</p>
          {logoUrl ? (
            <div className="mt-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="شعار المطعم"
                className="h-16 w-16 rounded-lg border border-stone-600 bg-stone-950 object-contain p-1"
              />
              <label className="cursor-pointer rounded border border-stone-600 px-3 py-2 text-xs text-stone-200 hover:bg-stone-800">
                استبدال الشعار
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadLogo(f);
                  }}
                />
              </label>
            </div>
          ) : (
            <label className="mt-2 inline-flex cursor-pointer rounded bg-amber-700 px-4 py-2 text-sm text-white hover:bg-amber-600">
              {uploadBusy ? "جاري الرفع…" : "رفع شعار"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={uploadBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogo(f);
                }}
              />
            </label>
          )}
          <p className="mt-1 text-xs text-stone-500">PNG · JPG · WEBP — يُفضّل PNG بخلفية شفافة</p>
        </div>

        <DarkSelect
          label="مكان ظهور الشعار"
          value={logoPosition}
          onChange={setLogoPosition}
          options={POSITION_OPTIONS}
        />
        <DarkSelect
          label="توقيت ظهور الشعار"
          value={logoTiming}
          onChange={setLogoTiming}
          options={TIMING_OPTIONS}
        />

        <label className="text-sm text-stone-200">
          عنوان رئيسي
          <input
            className={`${darkFieldClass()} mt-1`}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="عرض خاص"
          />
        </label>
        <label className="text-sm text-stone-200">
          نص فرعي
          <input
            className={`${darkFieldClass()} mt-1`}
            value={subheadline}
            onChange={(e) => setSubheadline(e.target.value)}
            placeholder="خصم 20% هذا الأسبوع"
          />
        </label>
        <DarkSelect label="دعوة لاتخاذ إجراء" value={cta} onChange={setCta} options={CTA_OPTIONS} />

        <label className="text-sm text-stone-200">
          اللون الأساسي
          <input
            type="color"
            className="mt-1 h-10 w-full cursor-pointer rounded border border-stone-600 bg-stone-900"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
          />
        </label>
        <label className="text-sm text-stone-200">
          اللون الثانوي
          <input
            type="color"
            className="mt-1 h-10 w-full cursor-pointer rounded border border-stone-600 bg-stone-900"
            value={secondaryColor}
            onChange={(e) => setSecondaryColor(e.target.value)}
          />
        </label>
        <label className="text-sm text-stone-200 sm:col-span-2">
          لون النص
          <input
            type="color"
            className="mt-1 h-10 w-full max-w-xs cursor-pointer rounded border border-stone-600 bg-stone-900"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
          />
        </label>

        <DarkSegment
          label="صورة أو فيديو مرجعي"
          value={referenceType}
          onChange={setReferenceType}
          options={[
            { value: "", label: "بدون" },
            { value: "dish", label: "طبق" },
            { value: "restaurant", label: "المطعم" },
            { value: "product", label: "منتج" },
            { value: "video", label: "فيديو قصير" },
          ]}
        />
        {referenceType && referenceType !== "video" && (
          <label className="text-sm text-stone-200 sm:col-span-2">
            رفع المرجع
            <input
              type="file"
              accept="image/*"
              className={`${darkFieldClass()} mt-1 file:me-2 file:rounded file:bg-stone-700 file:px-2 file:py-1 file:text-white`}
              onChange={(e) => onReferenceFile(e.target.files?.[0] ?? null)}
            />
            {referenceName && <span className="text-xs text-stone-400">{referenceName}</span>}
          </label>
        )}
      </div>

      <button
        type="button"
        onClick={onPreview}
        className="mt-4 rounded-lg border border-amber-600/60 px-4 py-2 text-sm text-amber-200 hover:bg-amber-950/40"
      >
        معاينة الهوية
      </button>
    </div>
  );
}

export function VideoBrandPreviewModal({
  open,
  onClose,
  brand,
  aspect,
}: {
  open: boolean;
  onClose: () => void;
  brand: VideoBrandPayload | null;
  aspect: string;
}) {
  if (!open || !brand) return null;
  const ratio = aspect === "9:16" ? "9/16" : aspect === "1:1" ? "1/1" : "16/9";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" dir="rtl">
      <div className="w-full max-w-sm rounded-xl border border-stone-600 bg-stone-950 p-4">
        <p className="mb-2 font-semibold text-white">معاينة تقريبية للهوية</p>
        <div
          className="relative w-full overflow-hidden rounded-lg bg-stone-800"
          style={{ aspectRatio: ratio }}
        >
          {brand.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt=""
              className={`absolute h-10 w-10 object-contain drop-shadow-md ${
                brand.logoPosition === "top_right"
                  ? "right-2 top-2"
                  : brand.logoPosition === "top_left"
                    ? "left-2 top-2"
                    : brand.logoPosition === "bottom_left"
                      ? "bottom-12 left-2"
                      : brand.logoPosition === "bottom_center"
                        ? "bottom-12 left-1/2 -translate-x-1/2"
                        : "bottom-12 right-2"
              }`}
            />
          )}
          <div
            className="absolute inset-x-2 bottom-2 rounded px-2 py-2 text-center text-xs"
            style={{ backgroundColor: `${brand.primaryColor}99`, color: brand.textColor }}
          >
            {brand.showRestaurantName && <p className="font-bold">{brand.restaurantName}</p>}
            {brand.headline && <p>{brand.headline}</p>}
            {brand.subheadline && <p className="opacity-90">{brand.subheadline}</p>}
            {brand.cta && <p className="mt-1 font-semibold">{brand.cta}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded bg-stone-700 py-2 text-sm text-white"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}
