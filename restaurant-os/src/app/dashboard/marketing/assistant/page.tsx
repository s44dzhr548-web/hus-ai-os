"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui";
import { fetchWithTimeout, isAbortError } from "@/lib/fetch-with-timeout";
import type { MarketingCampaignProposal } from "@/lib/marketing/marketing-assistant-service";

const FETCH_TIMEOUT_MS = 60000;

const SUGGESTIONS = [
  "أنشئ حملة إعلانية لفابريكا تبدأ اليوم، الميزانية 500 ريال، الهدف زيادة الحجوزات، سناب وتيك توك، ولا تنشر قبل موافقتي.",
  "ما أفضل طبق للترويج هذا الأسبوع؟",
  "كيف أحسّن ROAS للحملات الحالية؟",
];

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  source?: "openai" | "error";
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [proposal, setProposal] = useState<MarketingCampaignProposal | null>(null);
  const [draftCampaignId, setDraftCampaignId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetchWithTimeout("/api/marketing/assistant", { timeoutMs: 15000 });
      const data = await res.json();
      if (res.ok && Array.isArray(data.messages)) {
        setMessages(
          data.messages.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            text: m.content,
            source: "openai" as const,
          }))
        );
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    setStatusMsg(null);
    setProposal(null);
    setDraftCampaignId(null);
    setEditing(false);
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");

    try {
      const res = await fetchWithTimeout("/api/marketing/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
        timeoutMs: FETCH_TIMEOUT_MS,
      });
      const data = await res.json();

      if (!res.ok || data.type === "error") {
        const errMsg =
          data.error ||
          (isAbortError(null) ? "انتهت مهلة الطلب — حاول مجدداً." : "تعذّر الاتصال بـ OpenAI");
        setError(errMsg);
        setMessages((m) => [...m, { role: "assistant", text: errMsg, source: "error" }]);
        return;
      }

      if (data.type === "campaign_proposal" && data.proposal) {
        setProposal(data.proposal as MarketingCampaignProposal);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: data.proposal.summaryAr || data.message?.content || "تم إنشاء مقترح الحملة.",
            source: "openai",
          },
        ]);
        return;
      }

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: data.content || data.message?.content || "",
          source: "openai",
        },
      ]);
    } catch (e) {
      const errMsg = isAbortError(e)
        ? "انتهت مهلة الطلب — حاول مجدداً."
        : "تعذّر الاتصال بالخادم";
      setError(errMsg);
      setMessages((m) => [...m, { role: "assistant", text: errMsg, source: "error" }]);
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (!proposal) return;
    setBusy("save");
    setStatusMsg(null);
    try {
      const res = await fetch("/api/marketing/assistant/campaign", {
        method: draftCampaignId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          draftCampaignId
            ? { action: "edit", campaignId: draftCampaignId, proposal }
            : { proposal }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذّر حفظ المسودة");
        return;
      }
      setDraftCampaignId(data.campaignId || data.campaign?.id || draftCampaignId);
      setEditing(false);
      setStatusMsg(data.message || "تم حفظ الحملة كمسودة");
    } finally {
      setBusy("");
    }
  }

  async function approveDraft() {
    if (!proposal) return;
    setBusy("approve");
    setStatusMsg(null);
    try {
      let id = draftCampaignId;
      if (!id) {
        const saveRes = await fetch("/api/marketing/assistant/campaign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposal }),
        });
        const saveData = await saveRes.json();
        if (!saveRes.ok) {
          setError(saveData.error || "تعذّر حفظ المسودة قبل الاعتماد");
          return;
        }
        id = saveData.campaign?.id;
        setDraftCampaignId(id);
      }

      const res = await fetch("/api/marketing/assistant/campaign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", campaignId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذّر اعتماد الحملة");
        return;
      }
      setStatusMsg(data.message);
    } finally {
      setBusy("");
    }
  }

  async function rejectDraft() {
    if (!draftCampaignId) {
      setProposal(null);
      setStatusMsg("تم رفض المقترح");
      return;
    }
    setBusy("reject");
    try {
      const res = await fetch("/api/marketing/assistant/campaign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", campaignId: draftCampaignId }),
      });
      const data = await res.json();
      if (res.ok) {
        setProposal(null);
        setDraftCampaignId(null);
        setStatusMsg(data.message || "تم رفض الحملة");
      }
    } finally {
      setBusy("");
    }
  }

  function updateProposal(field: keyof MarketingCampaignProposal, value: string | number) {
    if (!proposal) return;
    setProposal({ ...proposal, [field]: value });
    setEditing(true);
  }

  if (historyLoading) return <MkLoading />;

  return (
    <div className="space-y-4 pb-16">
      <MkPageHeader
        title="مساعد التسويق الذكي"
        desc="مدعوم بـ OpenAI المركزي — AI Brain · لا ينشر إعلانات قبل ربط المنصات وموافقتك"
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => send(p)}
            disabled={loading}
            className="rounded-full bg-stone-800 px-3 py-1 text-xs hover:bg-stone-700 disabled:opacity-50"
          >
            {p.length > 60 ? `${p.slice(0, 60)}…` : p}
          </button>
        ))}
      </div>

      {error && (
        <MkCard className="border-red-800/50 bg-red-950/20 text-sm text-red-200">{error}</MkCard>
      )}
      {statusMsg && (
        <MkCard className="border-emerald-800/50 bg-emerald-950/20 text-sm text-emerald-200">
          {statusMsg}
        </MkCard>
      )}

      <MkCard className="max-h-[40vh] space-y-2 overflow-y-auto">
        {!messages.length && (
          <p className="text-sm opacity-60">اسأل بالعربية — مثال: أنشئ حملة بميزانية 500 ريال</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded p-2 text-sm ${m.role === "user" ? "bg-amber-900/30 ms-6" : "bg-stone-800/50 me-6"}`}
          >
            {m.text}
            {m.role === "assistant" && m.source === "openai" && (
              <span className="mt-1 block text-[10px] text-emerald-400">OpenAI · AI Brain</span>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm opacity-70">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            جاري التفكير…
          </div>
        )}
      </MkCard>

      {proposal && (
        <MkCard className="space-y-4 border-amber-800/40">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs text-emerald-400">رد فعلي من OpenAI · مدير التسويق</p>
              <h3 className="text-lg font-bold">{proposal.name}</h3>
            </div>
            <span className="rounded bg-stone-800 px-2 py-1 text-xs">{proposal.totalBudgetSar} ر.س</span>
          </div>

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="opacity-60">الهدف</dt>
              <dd>{proposal.goal}</dd>
            </div>
            <div>
              <dt className="opacity-60">الجمهور</dt>
              <dd>{editing ? (
                <input className="w-full rounded border bg-transparent px-2 py-1" value={proposal.audience} onChange={(e) => updateProposal("audience", e.target.value)} />
              ) : proposal.audience}</dd>
            </div>
            <div>
              <dt className="opacity-60">العنوان</dt>
              <dd>{proposal.headline}</dd>
            </div>
            <div>
              <dt className="opacity-60">الدعوة للحجز</dt>
              <dd>{proposal.cta}</dd>
            </div>
            <div>
              <dt className="opacity-60">مواعيد التشغيل</dt>
              <dd>{proposal.scheduleStart} — {proposal.scheduleEnd}</dd>
            </div>
            <div>
              <dt className="opacity-60">مؤشرات الأداء</dt>
              <dd>{proposal.kpis.join(" · ")}</dd>
            </div>
          </dl>

          <div>
            <h4 className="mb-2 font-semibold">توزيع الميزانية والمنصات</h4>
            <div className="space-y-3">
              {proposal.platforms.map((p) => (
                <div key={p.platform} className="rounded-lg bg-stone-900/60 p-3 text-sm">
                  <div className="flex justify-between font-medium">
                    <span>{p.labelAr}</span>
                    <span>{p.budgetAmount} ر.س ({p.budgetPercent}%)</span>
                  </div>
                  <p className="mt-1 text-xs opacity-70">السبب: {p.allocationReason}</p>
                  <ul className="mt-2 list-inside list-decimal space-y-1 text-xs">
                    {p.adCopies.filter(Boolean).map((copy, idx) => (
                      <li key={idx}>{copy}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold">فكرة فيديو 15 ثانية</h4>
            <p className="mt-1 text-sm opacity-90">{proposal.videoIdea15s}</p>
          </div>

          <p className="rounded bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
            {proposal.publishNote}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={!!busy} onClick={() => void saveDraft()}>
              {busy === "save" ? "جاري الحفظ…" : "حفظ كمسودة"}
            </Button>
            <Button type="button" variant="outline" disabled={!!busy} onClick={() => setEditing(true)}>
              تعديل
            </Button>
            <Button type="button" variant="outline" disabled={!!busy} onClick={() => void rejectDraft()}>
              رفض
            </Button>
            <Button type="button" disabled={!!busy} onClick={() => void approveDraft()}>
              {busy === "approve" ? "جاري الاعتماد…" : "اعتماد الحملة"}
            </Button>
            {draftCampaignId && (
              <Link href="/dashboard/marketing/campaigns" className="text-xs underline opacity-70 self-center">
                عرض المسودات
              </Link>
            )}
          </div>
        </MkCard>
      )}

      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded border bg-transparent px-3 py-2 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="اكتب أمراً بالعربية…"
          disabled={loading}
        />
        <Button type="button" onClick={() => send()} disabled={loading}>
          إرسال
        </Button>
      </div>
    </div>
  );
}
