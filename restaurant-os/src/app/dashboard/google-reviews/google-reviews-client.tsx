"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MkPageHeader } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui";
import Link from "next/link";

type ReviewRow = {
  id: string;
  reviewerName: string | null;
  starRating: number | null;
  comment: string | null;
  createTime: string | null;
  reviewReply: string | null;
  replyStatus: string;
  draftText: string | null;
};

type GbpLocation = {
  locationName: string;
  locationId: string;
  displayName: string;
  address: string | null;
};

type GbpAccount = {
  accountName: string;
  accountId: string | null;
  displayName: string;
};

export default function GoogleReviewsClient() {
  const searchParams = useSearchParams();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [perms, setPerms] = useState({ canDraft: false, canPublish: false });
  const [connection, setConnection] = useState<{
    isActive?: boolean;
    hasLocation?: boolean;
    lastSyncError?: string | null;
    selectedLocation?: { displayName?: string | null } | null;
  } | null>(null);

  const [filterStars, setFilterStars] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const [noReplyOnly, setNoReplyOnly] = useState(false);

  const [setupOpen, setSetupOpen] = useState(false);
  const [accounts, setAccounts] = useState<GbpAccount[]>([]);
  const [locations, setLocations] = useState<GbpLocation[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [setupMessage, setSetupMessage] = useState<string | null>(null);

  const [activeReview, setActiveReview] = useState<ReviewRow | null>(null);
  const [draftBody, setDraftBody] = useState("");

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filterStars) p.set("stars", filterStars);
    if (filterStatus) p.set("replyStatus", filterStatus);
    if (filterQ.trim()) p.set("q", filterQ.trim());
    if (noReplyOnly) p.set("noReply", "1");
    return p.toString();
  }, [filterStars, filterStatus, filterQ, noReplyOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    const url = queryString
      ? `/api/integrations/google-business/reviews?${queryString}`
      : "/api/integrations/google-business/reviews";
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      setReviews(data.reviews || []);
      setConnection(data.connection);
      setPerms(data.permissions || { canDraft: false, canPublish: false });
      setHint(
        data.connection?.lastSyncError ||
          (data.connection?.isActive && !data.connection?.hasLocation
            ? "اختر موقع فابريكا من إعداد الربط"
            : null)
      );
    }
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      setHint("✓ تم ربط Google Business Profile — اختر حساب Google وموقع فابريكا");
      void load();
    }
    const err = searchParams.get("error");
    const reason = searchParams.get("reason");
    if (err === "select_restaurant") {
      setHint("اختر مطعم فابريكا من لوحة المنصة (المطعم النشط) قبل بدء ربط Google Business Profile");
    } else if (err === "use_menuhus_domain") {
      setHint("يجب إكمال الربط عبر https://www.menuhus.com وليس نطاق vercel.app");
    } else if (err === "state_mismatch") {
      setHint("انتهت جلسة الربط — أعد المحاولة من www.menuhus.com");
    } else if (err === "oauth_denied") {
      setHint("تم إلغاء موافقة Google");
    } else if (err === "oauth_failed") {
      const messages: Record<string, string> = {
        session_required: "يجب تسجيل الدخول على www.menuhus.com في نفس المتصفح قبل إكمال الربط",
        session_user_mismatch: "حساب Google لا يطابق المستخدم الذي بدأ الربط",
        token_exchange_failed: "فشل تبادل الرمز — تأكد من GOOGLE_BUSINESS_REDIRECT_URI في Google Cloud وVercel",
        encryption_not_configured: "MARKETING_TOKEN_SECRET غير مهيأ — لم يُحفظ الاتصال",
        database_save_failed: "تعذّر حفظ الاتصال في قاعدة البيانات",
        missing_refresh_token: "Google لم يُرجع refresh token — أعد الربط مع prompt=consent",
        oauth_env_missing: "GOOGLE_CLIENT_ID أو GOOGLE_CLIENT_SECRET ناقص",
      };
      setHint(messages[reason || ""] || `فشل الربط (${reason || err})`);
    }
  }, [searchParams, load]);

  async function syncReviews() {
    setBusy("sync");
    const res = await fetch("/api/integrations/google-business/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync" }),
    });
    const data = await res.json();
    setBusy("");
    setHint(data.message || data.error || hint);
    void load();
  }

  async function openSetup() {
    setSetupOpen(true);
    setSetupMessage(null);
    const accRes = await fetch("/api/integrations/google-business/accounts");
    const accData = await accRes.json();
    if (!accData.ok) {
      setSetupMessage(accData.message || "تعذّر جلب الحسابات — غالباً بانتظار موافقة Google API");
      setAccounts([]);
      return;
    }
    setAccounts(accData.accounts || []);
    if (accData.selectedAccountName) setSelectedAccount(accData.selectedAccountName);
  }

  async function pickAccount(accountName: string) {
    setBusy("account");
    const res = await fetch("/api/integrations/google-business/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountName }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setSetupMessage(data.error || "فشل حفظ الحساب");
      return;
    }
    setSelectedAccount(accountName);
    const locRes = await fetch(
      `/api/integrations/google-business/locations?accountName=${encodeURIComponent(accountName)}`
    );
    const locData = await locRes.json();
    if (!locData.ok) {
      setSetupMessage(locData.message || "تعذّر جلب المواقع");
      setLocations([]);
      return;
    }
    setLocations(locData.locations || []);
  }

  async function pickLocation(loc: GbpLocation) {
    setBusy("location");
    const res = await fetch("/api/integrations/google-business/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationName: loc.locationName,
        locationId: loc.locationId,
        displayName: loc.displayName,
      }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setSetupMessage(data.error || "فشل اختيار الموقع");
      return;
    }
    setSetupMessage(`✓ تم اختيار: ${loc.displayName}`);
    setSetupOpen(false);
    void load();
  }

  function openDraftModal(r: ReviewRow) {
    setActiveReview(r);
    setDraftBody(r.draftText || r.reviewReply || "");
  }

  async function draftAction(action: string, extra?: Record<string, unknown>) {
    if (!activeReview) return;
    setBusy(`draft-${action}`);
    const res = await fetch(
      `/api/integrations/google-business/reviews/${activeReview.id}/draft`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, body: draftBody, ...extra }),
      }
    );
    const data = await res.json();
    setBusy("");
    if (data.text) setDraftBody(data.text);
    if (!res.ok) {
      setHint(data.message || data.error);
      return;
    }
    void load();
    if (action === "approve" || action === "submit") {
      setHint(action === "submit" ? "تم إرسال المسودة للاعتماد" : "تم اعتماد المسودة");
    }
  }

  async function publishReply() {
    if (!activeReview) return;
    setBusy("publish");
    const res = await fetch(
      `/api/integrations/google-business/reviews/${activeReview.id}/reply`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draftBody }),
      }
    );
    const data = await res.json();
    setBusy("");
    setHint(data.message || data.error || (data.ok ? "تم النشر" : "لم يُنشر — راجع رسالة Google API"));
    void load();
  }

  async function deleteReply(reviewId: string) {
    setBusy("delete-reply");
    const res = await fetch(
      `/api/integrations/google-business/reviews/${reviewId}/delete-reply`,
      { method: "POST" }
    );
    const data = await res.json();
    setBusy("");
    setHint(data.message || (data.ok ? "تم حذف الرد" : "فشل الحذف"));
    void load();
  }

  return (
    <div className="space-y-6">
      <MkPageHeader
        title="Google Business Profile Reviews"
        desc="مسودات بالذكاء الاصطناعي — اعتماد ونشر يدوي فقط (لا رد تلقائي)"
      />

      <div className="flex flex-wrap gap-2">
        <a href="/api/integrations/google-business/connect">
          <Button type="button">ربط Google Business Profile</Button>
        </a>
        <Button type="button" variant="outline" onClick={() => void openSetup()}>
          حساب / موقع فابريكا
        </Button>
        <Button
          type="button"
          variant="outline"
          loading={busy === "sync"}
          disabled={!perms.canDraft}
          onClick={() => syncReviews()}
        >
          Sync Reviews
        </Button>
        <Link href="/dashboard/marketing/platforms">
          <Button type="button" variant="outline">
            Marketing Platforms
          </Button>
        </Link>
      </div>

      {connection?.selectedLocation?.displayName && (
        <p className="text-sm text-gray-600">
          الموقع المختار: <strong>{connection.selectedLocation.displayName}</strong>
        </p>
      )}

      {hint && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {hint}
        </p>
      )}

      <div className="flex flex-wrap gap-2 rounded-xl border p-3">
        <select
          className="rounded border px-2 py-1 text-sm"
          value={filterStars}
          onChange={(e) => setFilterStars(e.target.value)}
        >
          <option value="">كل التقييمات</option>
          {[5, 4, 3, 2, 1].map((s) => (
            <option key={s} value={String(s)}>
              {s} ★
            </option>
          ))}
        </select>
        <select
          className="rounded border px-2 py-1 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">كل الحالات</option>
          <option value="DRAFT">مسودة</option>
          <option value="PENDING_APPROVAL">بانتظار الاعتماد</option>
          <option value="APPROVED">معتمد</option>
          <option value="PUBLISHED">منشور</option>
          <option value="FAILED">فشل</option>
        </select>
        <input
          className="min-w-[160px] flex-1 rounded border px-2 py-1 text-sm"
          placeholder="بحث في الاسم أو النص"
          value={filterQ}
          onChange={(e) => setFilterQ(e.target.value)}
        />
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={noReplyOnly}
            onChange={(e) => setNoReplyOnly(e.target.checked)}
          />
          بدون رد
        </label>
        <Button size="sm" variant="outline" type="button" onClick={() => void load()}>
          تطبيق
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">جاري التحميل…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-600">لا توجد مراجعات مستوردة بعد.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{r.reviewerName || "—"}</p>
                  <p className="text-sm text-gray-600">{r.starRating ?? "—"} ★</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{r.replyStatus}</span>
              </div>
              <p className="mt-2 text-sm">{r.comment || "—"}</p>
              {r.reviewReply && (
                <p className="mt-2 rounded bg-green-50 p-2 text-sm text-green-900">
                  رد Google: {r.reviewReply}
                </p>
              )}
              {r.draftText && r.draftText !== r.reviewReply && (
                <p className="mt-2 rounded bg-blue-50 p-2 text-sm text-blue-900">
                  مسودة: {r.draftText}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {perms.canDraft && (
                  <Button size="sm" type="button" onClick={() => openDraftModal(r)}>
                    مسودة / رد
                  </Button>
                )}
                {perms.canPublish && r.reviewReply && (
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    loading={busy === "delete-reply"}
                    onClick={() => void deleteReply(r.id)}
                  >
                    حذف الرد على Google
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {setupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">اختيار حساب وموقع Google</h3>
            <p className="mt-1 text-sm text-gray-600">اختر موقع فابريكا يدوياً — لا مطابقة تلقائية بالاسم.</p>
            {setupMessage && <p className="mt-2 text-sm text-amber-800">{setupMessage}</p>}
            <div className="mt-4 space-y-2">
              {accounts.length === 0 ? (
                <p className="text-sm text-gray-500">لا حسابات — اربط OAuth أو انتظر موافقة API.</p>
              ) : (
                accounts.map((a) => (
                  <button
                    key={a.accountName}
                    type="button"
                    disabled={!!busy}
                    className="flex w-full rounded-lg border px-3 py-2 text-start text-sm hover:bg-gray-50"
                    onClick={() => void pickAccount(a.accountName)}
                  >
                    {a.displayName}
                    <span className="ms-auto text-xs text-gray-400" dir="ltr">
                      {a.accountId}
                    </span>
                  </button>
                ))
              )}
            </div>
            {selectedAccount && locations.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-sm font-medium">المواقع</p>
                {locations.map((loc) => (
                  <button
                    key={loc.locationId}
                    type="button"
                    disabled={!!busy}
                    className="mb-2 flex w-full flex-col rounded-lg border px-3 py-2 text-start text-sm hover:bg-gray-50"
                    onClick={() => void pickLocation(loc)}
                  >
                    <span>{loc.displayName}</span>
                    {loc.address && <span className="text-xs text-gray-500">{loc.address}</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSetupOpen(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">مسودة الرد</h3>
            <p className="text-sm text-gray-600">{activeReview.reviewerName}</p>
            <textarea
              className="mt-3 min-h-[140px] w-full rounded border p-2 text-sm"
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              disabled={!perms.canDraft}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {perms.canDraft && (
                <>
                  <Button
                    size="sm"
                    type="button"
                    loading={busy === "draft-generate_ai"}
                    onClick={() => void draftAction("generate_ai")}
                  >
                    توليد بالذكاء الاصطناعي
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    loading={busy === "draft-save"}
                    onClick={() => void draftAction("save")}
                  >
                    حفظ مسودة
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    loading={busy === "draft-submit"}
                    onClick={() => void draftAction("submit")}
                  >
                    إرسال للاعتماد
                  </Button>
                </>
              )}
              {perms.canPublish && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    loading={busy === "draft-approve"}
                    onClick={() => void draftAction("approve")}
                  >
                    اعتماد
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    loading={busy === "publish"}
                    onClick={() => void publishReply()}
                  >
                    نشر على Google
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    loading={busy === "draft-reject"}
                    onClick={() => void draftAction("reject")}
                  >
                    رفض
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" type="button" onClick={() => setActiveReview(null)}>
                إغلاق
              </Button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              النشر يتطلب اعتماد مدير — ولن ينجح حتى موافقة Google Business Profile API.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
