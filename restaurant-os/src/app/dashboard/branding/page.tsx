"use client";

import { useEffect, useState } from "react";
import { PageHeader, Button, Input, Select, LoadingSpinner } from "@/components/ui";
import { MediaUploader } from "@/components/media/media-uploader";
import { MENU_FONTS } from "@/lib/restaurant-links";
import { normalizeHex } from "@/lib/colors";

const COLOR_FIELDS = [
  { key: "primaryColor", label: "اللون الأساسي" },
  { key: "secondaryColor", label: "اللون الثانوي" },
  { key: "backgroundColor", label: "لون الخلفية" },
  { key: "buttonColor", label: "لون الأزرار" },
  { key: "textColor", label: "لون النص" },
  { key: "categoryColor", label: "لون الأقسام" },
] as const;

type ColorKey = (typeof COLOR_FIELDS)[number]["key"];

const defaultForm = {
  logoUrl: "",
  coverUrl: "",
  primaryColor: "#047857",
  secondaryColor: "#065f46",
  backgroundColor: "#f9fafb",
  buttonColor: "#047857",
  textColor: "#111827",
  categoryColor: "#047857",
  fontFamily: "cairo",
};

export default function BrandingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    fetch("/api/restaurants/branding")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          logoUrl: data.logoUrl || "",
          coverUrl: data.coverUrl || "",
          primaryColor: normalizeHex(data.primaryColor || defaultForm.primaryColor),
          secondaryColor: normalizeHex(data.secondaryColor || defaultForm.secondaryColor),
          backgroundColor: normalizeHex(data.backgroundColor || defaultForm.backgroundColor),
          buttonColor: normalizeHex(data.buttonColor || defaultForm.buttonColor),
          textColor: normalizeHex(data.textColor || defaultForm.textColor),
          categoryColor: normalizeHex(data.categoryColor || defaultForm.categoryColor),
          fontFamily: data.fontFamily || "cairo",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  function setColor(key: ColorKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: normalizeHex(value, prev[key]) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    const payload = {
      ...form,
      primaryColor: normalizeHex(form.primaryColor),
      secondaryColor: normalizeHex(form.secondaryColor),
      backgroundColor: normalizeHex(form.backgroundColor),
      buttonColor: normalizeHex(form.buttonColor),
      textColor: normalizeHex(form.textColor),
      categoryColor: normalizeHex(form.categoryColor),
    };

    const res = await fetch("/api/restaurants/branding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "فشل حفظ التخصيص");
      return;
    }

    const data = await res.json();
    setForm((prev) => ({
      ...prev,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      backgroundColor: data.backgroundColor,
      buttonColor: data.buttonColor,
      textColor: data.textColor,
      categoryColor: data.categoryColor,
    }));
    setSaved(true);
  }

  const fontCss =
    MENU_FONTS.find((f) => f.id === form.fontFamily)?.css ?? MENU_FONTS[0].css;

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="تخصيص المنيو"
        description="الشعار والألوان والخط — تظهر تلقائياً في قائمة العملاء"
      />

      <form onSubmit={save} className="max-w-2xl space-y-6 rounded-xl bg-white p-6 shadow">
        <MediaUploader
          mediaType="image"
          label="شعار المطعم"
          value={form.logoUrl}
          onChange={(url) => setForm({ ...form, logoUrl: url })}
          onClear={() => setForm({ ...form, logoUrl: "" })}
        />
        <MediaUploader
          mediaType="image"
          label="صورة الغلاف"
          value={form.coverUrl}
          onChange={(url) => setForm({ ...form, coverUrl: url })}
          onClear={() => setForm({ ...form, coverUrl: "" })}
        />

        <Select
          label="الخط"
          value={form.fontFamily}
          onChange={(e) => setForm({ ...form, fontFamily: e.target.value })}
        >
          {MENU_FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </Select>

        <div className="grid gap-4 sm:grid-cols-2">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={form[key]}
                onChange={(e) => setColor(key, e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border"
                aria-label={label}
              />
              <Input
                label={label}
                value={form[key]}
                onChange={(e) => setColor(key, e.target.value)}
                dir="ltr"
              />
            </div>
          ))}
        </div>

        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: form.backgroundColor,
            color: form.textColor,
            fontFamily: fontCss,
          }}
        >
          <div
            className="rounded-lg px-3 py-2 text-sm text-white"
            style={{ backgroundColor: form.primaryColor }}
          >
            شريط القائمة
          </div>
          <span
            className="mt-3 inline-block rounded-full px-3 py-1 text-xs text-white"
            style={{ backgroundColor: form.categoryColor }}
          >
            قسم المنيو
          </span>
          <button
            type="button"
            className="mt-3 rounded-lg px-4 py-2 text-white"
            style={{ backgroundColor: form.buttonColor }}
          >
            زر تجريبي
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">تم حفظ التخصيص</p>}
        <Button type="submit" loading={saving}>
          حفظ التخصيص
        </Button>
      </form>
    </div>
  );
}
