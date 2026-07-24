"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui";
import { WHATSAPP_INBOX_CATEGORIES } from "@/lib/whatsapp-inbox/constants";
import { cn } from "@/lib/utils";

type ConversationRow = {
  id: string;
  status: string;
  category: string | null;
  assignedUserId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  withinServiceWindow: boolean;
  contact: { id: string; waId: string; displayName: string };
  reservationDraft?: { status?: string; reservationId?: string } | null;
};

type MessageRow = {
  id: string;
  direction: string;
  messageType: string;
  bodyText: string | null;
  mediaUrl: string | null;
  templateName: string | null;
  status: string;
  deliveredAt: string | null;
  readAt: string | null;
  failedReason: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "قيد الإرسال",
  SENT: "مرسلة",
  DELIVERED: "مستلمة",
  READ: "مقروءة",
  FAILED: "فشلت",
};

export function WhatsAppInboxClient() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [notes, setNotes] = useState<Array<{ id: string; body: string; createdAt: string }>>([]);
  const [detail, setDetail] = useState<{
    status: string;
    category: string | null;
    withinServiceWindow: boolean;
    reservationDraft?: { status?: string; reservationId?: string } | null;
  } | null>(null);
  const [composer, setComposer] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState<Array<{ name: string; language: string; status: string }>>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const [canSend, setCanSend] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [error, setError] = useState("");
  const [noteText, setNoteText] = useState("");
  const [resDate, setResDate] = useState("");
  const [resTime, setResTime] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadList = useCallback(async () => {
    const qs = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
    const res = await fetch(`/api/whatsapp/inbox${qs}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "تعذّر تحميل Inbox");
      return;
    }
    setConversations(data.conversations || []);
    setTemplates(data.templates || []);
    setQuickReplies(data.quickReplies || []);
    setWebhookConfigured(Boolean(data.webhookConfigured));
    setCanSend(Boolean(data.permissions?.canSend));
    if (!selectedId && data.conversations?.[0]?.id) {
      setSelectedId(data.conversations[0].id);
    }
  }, [search, selectedId]);

  const loadThread = useCallback(async (id: string) => {
    const res = await fetch(`/api/whatsapp/inbox/conversations/${id}`);
    const data = await res.json();
    if (!res.ok) return;
    setMessages(data.conversation.messages || []);
    setNotes(data.conversation.notes || []);
    setDetail({
      status: data.conversation.status,
      category: data.conversation.category,
      withinServiceWindow: data.conversation.withinServiceWindow,
      reservationDraft: data.conversation.reservationDraft,
    });
    void loadList();
  }, [loadList]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadList();
      setLoading(false);
    })();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) return;
    void loadThread(selectedId);
    const t = setInterval(() => loadThread(selectedId), 15000);
    return () => clearInterval(t);
  }, [selectedId, loadThread]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  );

  async function sendText() {
    if (!selectedId || !composer.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/whatsapp/inbox/conversations/${selectedId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", kind: "text", text: composer }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "فشل الإرسال");
      return;
    }
    setComposer("");
    await loadThread(selectedId);
  }

  async function sendTemplate() {
    if (!selectedId || !templateName) return;
    setBusy(true);
    const tpl = templates.find((t) => t.name === templateName);
    const res = await fetch(`/api/whatsapp/inbox/conversations/${selectedId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        kind: "template",
        templateName,
        templateLanguage: tpl?.language || "ar",
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "فشل إرسال القالب");
      return;
    }
    await loadThread(selectedId);
  }

  async function uploadAndSend(file: File) {
    if (!selectedId) return;
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    form.append("filename", file.name);
    const up = await fetch("/api/whatsapp/inbox/media", { method: "POST", body: form });
    const upData = await up.json();
    if (!up.ok) {
      setBusy(false);
      setError(upData.error || "فشل رفع الوسائط");
      return;
    }
    const res = await fetch(`/api/whatsapp/inbox/conversations/${selectedId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        kind: "media",
        mediaId: upData.mediaId,
        mediaType: upData.mediaType,
        mediaCaption: composer || undefined,
        mediaFilename: file.name,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "فشل إرسال الوسائط");
      return;
    }
    setComposer("");
    await loadThread(selectedId);
  }

  async function patchConversation(body: Record<string, unknown>) {
    if (!selectedId) return;
    await fetch(`/api/whatsapp/inbox/conversations/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await loadThread(selectedId);
  }

  if (loading) return <MkLoading />;

  return (
    <div className="space-y-4 pb-10">
      <MkPageHeader
        title="WhatsApp Inbox"
        desc="محادثات واتساب الأعمال — معزولة لكل مطعم، رسائل جديدة من Webhook فقط"
        production
      />

      <div className="flex flex-wrap gap-3 text-xs text-stone-400">
        <span>Webhook verify: {webhookConfigured ? "✅ Platform" : "⚠️ غير مضبوط"}</span>
        <span>Service window: {detail?.withinServiceWindow ? "24h OPEN" : "Templates only"}</span>
      </div>

      {error && (
        <p className="rounded border border-red-800/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="grid min-h-[70vh] grid-cols-1 gap-4 lg:grid-cols-12">
        <aside className="rounded-xl border border-stone-700 bg-stone-900/60 p-3 lg:col-span-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadList()}
            placeholder="بحث بالاسم أو الرقم"
            className="mb-3 w-full rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-sm text-white"
            dir="auto"
          />
          <Button variant="outline" className="mb-3 w-full" onClick={() => loadList()}>
            بحث
          </Button>
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-right text-sm",
                    selectedId === c.id ?
                      "border-emerald-600 bg-emerald-950/40 text-white"
                    : "border-stone-700 text-stone-200 hover:bg-stone-800"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{c.contact.displayName}</span>
                    {c.unreadCount > 0 && (
                      <span className="rounded-full bg-emerald-600 px-2 text-xs">{c.unreadCount}</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-stone-400" dir="ltr">
                    {c.contact.waId}
                  </p>
                  <p className="truncate text-xs text-stone-300">{c.lastMessagePreview || "—"}</p>
                  <p className="text-[10px] text-stone-500">
                    {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString("ar-SA") : ""}
                  </p>
                </button>
              </li>
            ))}
            {!conversations.length && (
              <li className="py-8 text-center text-sm text-stone-500">
                لا محادثات بعد — تُحفظ الرسائل الجديدة من Webhook فقط
              </li>
            )}
          </ul>
        </aside>

        <section className="flex flex-col rounded-xl border border-stone-700 bg-stone-900/60 lg:col-span-8">
          {!selected ?
            <div className="flex flex-1 items-center justify-center text-stone-500">اختر محادثة</div>
          : <>
              <header className="border-b border-stone-700 px-4 py-3">
                <h2 className="text-lg font-semibold text-white">{selected.contact.displayName}</h2>
                <p className="text-xs text-stone-400" dir="ltr">
                  {selected.contact.waId}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    className="rounded border border-stone-600 bg-stone-950 px-2 py-1 text-xs text-white"
                    value={detail?.category || ""}
                    onChange={(e) => patchConversation({ category: e.target.value || null })}
                    disabled={!canSend}
                  >
                    <option value="">تصنيف</option>
                    {WHATSAPP_INBOX_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.labelAr}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    className="text-xs"
                    disabled={!canSend}
                    onClick={() =>
                      patchConversation({ status: detail?.status === "CLOSED" ? "OPEN" : "CLOSED" })
                    }
                  >
                    {detail?.status === "CLOSED" ? "إعادة فتح" : "إغلاق المحادثة"}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-xs"
                    disabled={!canSend}
                    onClick={async () => {
                      const res = await fetch(
                        `/api/whatsapp/inbox/conversations/${selectedId}/suggest`,
                        { method: "POST" }
                      );
                      const data = await res.json();
                      setSuggestion(data.suggestion || "");
                    }}
                  >
                    اقتراح AI
                  </Button>
                </div>
                {suggestion && (
                  <div className="mt-2 rounded border border-amber-700/40 bg-amber-950/20 p-2 text-xs text-amber-100">
                    {suggestion}
                    <button
                      type="button"
                      className="mr-2 text-emerald-300 underline"
                      onClick={() => setComposer(suggestion)}
                    >
                      استخدام
                    </button>
                  </div>
                )}
                {detail?.reservationDraft?.status === "PENDING_STAFF_APPROVAL" && (
                  <div className="mt-2 rounded border border-sky-700/40 bg-sky-950/20 p-2 text-xs text-sky-100">
                    اقتراح حجز — أكّد التاريخ والوقت
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        type="date"
                        value={resDate}
                        onChange={(e) => setResDate(e.target.value)}
                        className="rounded border border-stone-600 bg-stone-950 px-2 py-1"
                      />
                      <input
                        type="time"
                        value={resTime}
                        onChange={(e) => setResTime(e.target.value)}
                        className="rounded border border-stone-600 bg-stone-950 px-2 py-1"
                      />
                      <Button
                        className="text-xs"
                        disabled={!canSend || !resDate || !resTime}
                        onClick={async () => {
                          const res = await fetch("/api/whatsapp/inbox/reservation", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              conversationId: selectedId,
                              reservationDate: resDate,
                              reservationTime: resTime,
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok) setError(data.error || "فشل إنشاء الحجز");
                          else await loadThread(selectedId!);
                        }}
                      >
                        إنشاء حجز
                      </Button>
                    </div>
                  </div>
                )}
              </header>

              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      m.direction === "INBOUND" ?
                        "ml-auto bg-stone-800 text-stone-100"
                      : "mr-auto bg-emerald-900/50 text-emerald-50"
                    )}
                  >
                    <p>{m.bodyText || m.templateName || m.messageType}</p>
                    {m.mediaUrl && (
                      <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="text-xs underline">
                        وسائط
                      </a>
                    )}
                    <p className="mt-1 text-[10px] opacity-70">
                      {STATUS_LABEL[m.status] || m.status} ·{" "}
                      {new Date(m.createdAt).toLocaleTimeString("ar-SA")}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-stone-700 p-3 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {quickReplies.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="rounded-full border border-stone-600 px-2 py-1 text-[11px] text-stone-300"
                      onClick={() => setComposer(q)}
                    >
                      {q.slice(0, 40)}
                    </button>
                  ))}
                </div>
                {!detail?.withinServiceWindow && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="rounded border border-stone-600 bg-stone-950 px-2 py-1 text-xs text-white"
                    >
                      <option value="">قالب Meta معتمد</option>
                      {templates.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name} ({t.language})
                        </option>
                      ))}
                    </select>
                    <Button variant="outline" disabled={!canSend || busy} onClick={sendTemplate}>
                      إرسال قالب
                    </Button>
                  </div>
                )}
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  rows={2}
                  disabled={!canSend || (!detail?.withinServiceWindow && !composer.startsWith("/template"))}
                  placeholder={
                    detail?.withinServiceWindow ?
                      "اكتب رداً..."
                    : "انتهت نافذة 24 ساعة — استخدم قالب Meta"
                  }
                  className="w-full rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-sm text-white"
                />
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadAndSend(f);
                      e.target.value = "";
                    }}
                  />
                  <Button variant="outline" disabled={!canSend || busy} onClick={() => fileRef.current?.click()}>
                    📎 وسائط
                  </Button>
                  <Button disabled={!canSend || busy || !detail?.withinServiceWindow} onClick={sendText}>
                    إرسال
                  </Button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="ملاحظة داخلية (لا تُرسل للعميل)"
                    className="flex-1 rounded border border-stone-600 bg-stone-950 px-2 py-1 text-xs text-white"
                  />
                  <Button
                    variant="outline"
                    className="text-xs"
                    disabled={!canSend || !noteText.trim()}
                    onClick={async () => {
                      await fetch(`/api/whatsapp/inbox/conversations/${selectedId}/send`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "note", body: noteText }),
                      });
                      setNoteText("");
                      await loadThread(selectedId!);
                    }}
                  >
                    حفظ ملاحظة
                  </Button>
                </div>
                {notes.length > 0 && (
                  <div className="rounded border border-stone-700 bg-stone-950/50 p-2 text-xs text-stone-400">
                    {notes.slice(0, 3).map((n) => (
                      <p key={n.id}>📝 {n.body}</p>
                    ))}
                  </div>
                )}
              </div>
            </>
          }
        </section>
      </div>
    </div>
  );
}
