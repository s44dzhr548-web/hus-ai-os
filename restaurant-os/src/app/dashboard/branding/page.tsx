"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Button, Input, Select, LoadingSpinner } from "@/components/ui";
import { MediaUploader } from "@/components/media/media-uploader";
import { CustomerHomepage } from "@/components/customer/customer-homepage";
import { MENU_FONTS } from "@/lib/restaurant-links";
import { normalizeHex } from "@/lib/colors";
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  type HomepageSectionConfig,
} from "@/lib/homepage-sections";
import {
  DEFAULT_BRANDING_FORM,
  resolveCustomerBranding,
  type CardStyle,
} from "@/lib/restaurant-branding";
import {
  DEFAULT_LANDING_PAGE_CONFIG,
  type LandingPageConfig,
} from "@/lib/landing-page-config";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";

const COLOR_FIELDS = [
  { key: "primaryColor", label: "اللون الأساسي (ذهبي)" },
  { key: "secondaryColor", label: "اللون الثانوي" },
  { key: "backgroundColor", label: "لون الخلفية" },
  { key: "buttonColor", label: "لون الأزرار" },
  { key: "textColor", label: "لون النص" },
  { key: "categoryColor", label: "لون الأقسام" },
] as const;

type ColorKey = (typeof COLOR_FIELDS)[number]["key"];

type FormState = typeof DEFAULT_BRANDING_FORM;

export default function BrandingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(true);
  const [restaurantName, setRestaurantName] = useState("مطعمي");
  const [restaurantNameEn, setRestaurantNameEn] = useState("My Restaurant");
  const [form, setForm] = useState<FormState>(DEFAULT_BRANDING_FORM);

  useEffect(() => {
    fetch("/api/restaurants/branding")
      .then((r) => r.json())
      .then((data) => {
        setRestaurantName(data.nameAr || data.name || "مطعمي");
        setRestaurantNameEn(data.nameEn || data.name || "My Restaurant");
        setForm({
          logoUrl: data.logoUrl || "",
          coverUrl: data.coverUrl || "",
          heroVideoUrl: data.heroVideoUrl || "",
          heroImageUrl: data.heroImageUrl || data.coverUrl || "",
          welcomeText: data.welcomeText || "",
          welcomeTextEn: data.welcomeTextEn || "",
          ctaText: data.ctaText || DEFAULT_BRANDING_FORM.ctaText,
          ctaTextEn: data.ctaTextEn || DEFAULT_BRANDING_FORM.ctaTextEn,
          cardStyle: (data.cardStyle || "glass") as CardStyle,
          primaryColor: normalizeHex(data.primaryColor || DEFAULT_BRANDING_FORM.primaryColor),
          secondaryColor: normalizeHex(data.secondaryColor || DEFAULT_BRANDING_FORM.secondaryColor),
          backgroundColor: normalizeHex(data.backgroundColor || DEFAULT_BRANDING_FORM.backgroundColor),
          buttonColor: normalizeHex(data.buttonColor || DEFAULT_BRANDING_FORM.buttonColor),
          textColor: normalizeHex(data.textColor || DEFAULT_BRANDING_FORM.textColor),
          categoryColor: normalizeHex(data.categoryColor || DEFAULT_BRANDING_FORM.categoryColor),
          fontFamily: data.fontFamily || "cairo",
          homepageSections: data.homepageSections?.length
            ? data.homepageSections
            : DEFAULT_HOMEPAGE_SECTIONS,
          landingPageConfig: data.landingPageConfig || DEFAULT_LANDING_PAGE_CONFIG,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  function setColor(key: ColorKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: normalizeHex(value, prev[key]) }));
  }

  function updateSection(id: HomepageSectionConfig["id"], patch: Partial<HomepageSectionConfig>) {
    setForm((prev) => {
      const sections = prev.homepageSections.map((s) =>
        s.id === id ? { ...s, ...patch } : s
      );
      return { ...prev, homepageSections: sections };
    });
  }

  function moveSection(id: HomepageSectionConfig["id"], dir: -1 | 1) {
    setForm((prev) => {
      const sections = [...prev.homepageSections].sort((a, b) => a.order - b.order);
      const index = sections.findIndex((s) => s.id === id);
      const j = index + dir;
      if (index < 0 || j < 0 || j >= sections.length) return prev;
      [sections[index], sections[j]] = [sections[j], sections[index]];
      return {
        ...prev,
        homepageSections: sections.map((s, i) => ({ ...s, order: i })),
      };
    });
  }

  function setHeroVideo(patch: Partial<LandingPageConfig["heroVideo"]>) {
    setForm((prev) => ({
      ...prev,
      landingPageConfig: {
        ...prev.landingPageConfig,
        heroVideo: { ...prev.landingPageConfig.heroVideo, ...patch },
      },
    }));
  }

  function setPopupBanner(patch: Partial<LandingPageConfig["popupBanner"]>) {
    setForm((prev) => ({
      ...prev,
      landingPageConfig: {
        ...prev.landingPageConfig,
        popupBanner: { ...prev.landingPageConfig.popupBanner, ...patch },
      },
    }));
  }

  const previewBranding = useMemo(
    () =>
      resolveCustomerBranding({
        ...form,
        homepageSections: form.homepageSections,
        landingPageConfig: form.landingPageConfig,
        name: restaurantName,
        nameAr: restaurantName,
        nameEn: restaurantNameEn,
      }),
    [form, restaurantName, restaurantNameEn]
  );

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
      homepageSections: form.homepageSections.map((s, i) => ({ ...s, order: i })),
      landingPageConfig: form.landingPageConfig,
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
    setSaved(true);
  }

  if (loading) return <LoadingSpinner />;

  const sortedSections = [...form.homepageSections].sort((a, b) => a.order - b.order);

  return (
    <div>
      <PageHeader
        title="تخصيص الصفحة الرئيسية"
        description="الألوان، الهيرو، الأقسام — معاينة مباشرة قبل الحفظ"
        action={
          <Button type="button" variant="outline" onClick={() => setPreviewOpen((v) => !v)}>
            <Eye className="h-4 w-4" />
            {previewOpen ? "إخفاء المعاينة" : "معاينة مباشرة"}
          </Button>
        }
      />

      <div className={`grid gap-6 ${previewOpen ? "xl:grid-cols-2" : ""}`}>
        <form onSubmit={save} className="space-y-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900">الوسائط</h2>
          <MediaUploader
            mediaType="image"
            label="شعار المطعم"
            value={form.logoUrl}
            onChange={(url) => setForm({ ...form, logoUrl: url })}
            onClear={() => setForm({ ...form, logoUrl: "" })}
          />
          <MediaUploader
            mediaType="video"
            label="فيديو الهيرو"
            value={form.heroVideoUrl}
            onChange={(url) => setForm({ ...form, heroVideoUrl: url })}
            onClear={() => setForm({ ...form, heroVideoUrl: "" })}
          />
          <MediaUploader
            mediaType="image"
            label="صورة الهيرو (بديل)"
            value={form.heroImageUrl}
            onChange={(url) => setForm({ ...form, heroImageUrl: url })}
            onClear={() => setForm({ ...form, heroImageUrl: "" })}
          />
          <MediaUploader
            mediaType="image"
            label="صورة الغلاف (احتياطي)"
            value={form.coverUrl}
            onChange={(url) => setForm({ ...form, coverUrl: url })}
            onClear={() => setForm({ ...form, coverUrl: "" })}
          />

          <h2 className="text-lg font-semibold text-gray-900">إعدادات الفيديو</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.landingPageConfig.heroVideo.autoplay}
                onChange={(e) => setHeroVideo({ autoplay: e.target.checked })}
              />
              تشغيل تلقائي (Autoplay)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.landingPageConfig.heroVideo.loop}
                onChange={(e) => setHeroVideo({ loop: e.target.checked })}
              />
              تكرار (Loop)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.landingPageConfig.heroVideo.muted}
                onChange={(e) => setHeroVideo({ muted: e.target.checked })}
              />
              بدون صوت (Muted)
            </label>
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                شفافية التعتيم ({form.landingPageConfig.heroVideo.overlayOpacity}%)
              </label>
              <input
                type="range"
                min={20}
                max={70}
                value={form.landingPageConfig.heroVideo.overlayOpacity}
                onChange={(e) =>
                  setHeroVideo({ overlayOpacity: parseInt(e.target.value, 10) })
                }
                className="w-full"
              />
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-900">بانر منبثق</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.landingPageConfig.popupBanner.enabled}
              onChange={(e) => setPopupBanner({ enabled: e.target.checked })}
            />
            تفعيل البانر المنبثق
          </label>
          {form.landingPageConfig.popupBanner.enabled && (
            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <Input
                label="عنوان البانر (عربي)"
                value={form.landingPageConfig.popupBanner.titleAr}
                onChange={(e) => setPopupBanner({ titleAr: e.target.value })}
              />
              <Input
                label="Banner title (English)"
                value={form.landingPageConfig.popupBanner.titleEn}
                onChange={(e) => setPopupBanner({ titleEn: e.target.value })}
                dir="ltr"
              />
              <Input
                label="الرسالة (عربي)"
                value={form.landingPageConfig.popupBanner.messageAr}
                onChange={(e) => setPopupBanner({ messageAr: e.target.value })}
              />
              <Input
                label="Message (English)"
                value={form.landingPageConfig.popupBanner.messageEn}
                onChange={(e) => setPopupBanner({ messageEn: e.target.value })}
                dir="ltr"
              />
              <MediaUploader
                mediaType="image"
                label="صورة البانر"
                value={form.landingPageConfig.popupBanner.imageUrl}
                onChange={(url) => setPopupBanner({ imageUrl: url })}
                onClear={() => setPopupBanner({ imageUrl: "" })}
              />
              <Input
                label="رابط (اختياري)"
                value={form.landingPageConfig.popupBanner.linkUrl}
                onChange={(e) => setPopupBanner({ linkUrl: e.target.value })}
                dir="ltr"
              />
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-900">النصوص</h2>
          <Input
            label="نص الترحيب (عربي)"
            value={form.welcomeText}
            onChange={(e) => setForm({ ...form, welcomeText: e.target.value })}
          />
          <Input
            label="نص الترحيب (English)"
            value={form.welcomeTextEn}
            onChange={(e) => setForm({ ...form, welcomeTextEn: e.target.value })}
            dir="ltr"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="زر CTA (عربي)"
              value={form.ctaText}
              onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
            />
            <Input
              label="CTA (English)"
              value={form.ctaTextEn}
              onChange={(e) => setForm({ ...form, ctaTextEn: e.target.value })}
              dir="ltr"
            />
          </div>

          <Select
            label="نمط البطاقات"
            value={form.cardStyle}
            onChange={(e) => setForm({ ...form, cardStyle: e.target.value as CardStyle })}
          >
            <option value="glass">زجاجي (Glass)</option>
            <option value="solid">صلب</option>
            <option value="outline">حدود فقط</option>
          </Select>

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

          <h2 className="text-lg font-semibold text-gray-900">الألوان</h2>
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

          <h2 className="text-lg font-semibold text-gray-900">أقسام الصفحة الرئيسية</h2>
          <div className="space-y-3">
            {sortedSections.map((section) => (
              <div
                key={section.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={section.enabled}
                      onChange={(e) =>
                        updateSection(section.id, { enabled: e.target.checked })
                      }
                    />
                    {section.titleAr}
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveSection(section.id, -1)}
                      className="rounded p-1 hover:bg-gray-100"
                      aria-label="Up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(section.id, 1)}
                      className="rounded p-1 hover:bg-gray-100"
                      aria-label="Down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    label="العنوان (عربي)"
                    value={section.titleAr}
                    onChange={(e) =>
                      updateSection(section.id, { titleAr: e.target.value })
                    }
                  />
                  <Input
                    label="Title (English)"
                    value={section.titleEn}
                    onChange={(e) =>
                      updateSection(section.id, { titleEn: e.target.value })
                    }
                    dir="ltr"
                  />
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-emerald-600">تم حفظ التخصيص</p>}
          <Button type="submit" loading={saving}>
            حفظ التخصيص
          </Button>
        </form>

        {previewOpen && (
          <div className="overflow-hidden rounded-xl border border-gray-200 shadow-lg">
            <div className="border-b bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600">
              معاينة مباشرة — كما يراها العميل
            </div>
            <div className="max-h-[85vh] overflow-y-auto">
              <CustomerHomepage
                branding={previewBranding}
                restaurantName={restaurantName}
                restaurantNameEn={restaurantNameEn}
                slug="menu-os-demo"
                tableId="preview"
                tableNumber={1}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
