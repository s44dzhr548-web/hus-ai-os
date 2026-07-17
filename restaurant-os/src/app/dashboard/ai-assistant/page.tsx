"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, CheckCircle2, XCircle, History } from "lucide-react";
import {
  Button,
  Card,
  LoadingSpinner,
  PageHeader,
  Badge,
} from "@/components/ui";
import { SUGGESTED_COMMANDS } from "@/lib/ai-assistant/types";

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  metadata?: {
    toolResults?: Array<{ tool: string; summary: string; data?: unknown }>;
    pendingAction?: {
      pendingActionId: string;
      toolName: string;
      previewSummary: string;
      expiresAt: string;
    };
  };
  createdAt?: string;
};

type ActionLog = {
  id: string;
  toolName: string;
  commandText: string | null;
  resultSummary: string | null;
  status: string;
  confirmationStatus: string | null;
  executedAt: string;
};

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/ai-assistant/history");
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
      setActionLogs(data.actionLogs || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    setMessages((m) => [...m, { role: "user", content: msg }]);

    try {
      const res = await fetch("/api/ai-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.error || "حدث خطأ" },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.reply || data.assistantMessage?.content || "",
            metadata: {
              toolResults: data.toolResults,
              pendingAction: data.pendingAction,
            },
          },
        ]);
        loadHistory();
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "تعذر الاتصال بالخادم" },
      ]);
    }
    setSending(false);
  }

  async function handleConfirm(pendingActionId: string, confirm: boolean) {
    setConfirming(pendingActionId);
    try {
      const res = await fetch("/api/ai-assistant/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingActionId,
          idempotencyKey: pendingActionId,
          confirm,
        }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.message || (confirm ? "تم التنفيذ" : "تم الإلغاء"),
          metadata: { toolResults: data.toolResults },
        },
      ]);
      loadHistory();
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "فشل تأكيد العملية" },
      ]);
    }
    setConfirming(null);
  }

  const pendingFromLast = [...messages]
    .reverse()
    .find((m) => m.metadata?.pendingAction)?.metadata?.pendingAction;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="مساعد Menu OS الذكي"
        description="اكتب أمراً بالعربي وسينفّذه المساعد عبر وظائف آمنة داخل النظام"
        action={
          <Button variant="outline" size="sm" onClick={() => setShowLogs((v) => !v)}>
            <History className="ms-1 h-4 w-4" />
            سجل العمليات
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {SUGGESTED_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => sendMessage(cmd)}
            className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-500/20"
          >
            <Sparkles className="ms-1 inline h-3 w-3" />
            {cmd}
          </button>
        ))}
      </div>

      <Card className="flex min-h-[420px] flex-col border-stone-700/50 bg-stone-900/40 p-0 sm:min-h-[480px]">
        <div className="flex items-center gap-2 border-b border-stone-700/50 px-4 py-3">
          <Bot className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-semibold text-stone-100">محادثة المساعد</span>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:max-h-[55vh]">
          {messages.length === 0 && (
            <p className="text-center text-sm text-stone-400">
              مرحباً! جرّب: «اعرض حجوزات اليوم» أو «كم عدد زوار أمس؟»
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={m.id || i}
              className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[80%] ${
                  m.role === "user"
                    ? "bg-amber-600/20 text-stone-100"
                    : "bg-stone-800 text-stone-100"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.metadata?.toolResults?.map((t, j) => (
                  <div
                    key={j}
                    className="mt-2 rounded-lg border border-stone-600/50 bg-stone-950/50 p-2 text-xs"
                  >
                    <Badge variant="info" className="mb-1">
                      {t.tool}
                    </Badge>
                    <p>{t.summary}</p>
                  </div>
                ))}
                {m.metadata?.pendingAction && (
                  <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3">
                    <p className="mb-2 text-xs text-amber-200">
                      {m.metadata.pendingAction.previewSummary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={confirming === m.metadata.pendingAction.pendingActionId}
                        onClick={() =>
                          handleConfirm(m.metadata!.pendingAction!.pendingActionId, true)
                        }
                      >
                        <CheckCircle2 className="ms-1 h-3.5 w-3.5" />
                        تأكيد التنفيذ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={confirming === m.metadata.pendingAction.pendingActionId}
                        onClick={() =>
                          handleConfirm(m.metadata!.pendingAction!.pendingActionId, false)
                        }
                      >
                        <XCircle className="ms-1 h-3.5 w-3.5" />
                        إلغاء
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-end">
              <div className="rounded-2xl bg-stone-800 px-4 py-2 text-sm text-stone-400">
                جاري التفكير…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {pendingFromLast && (
          <div className="border-t border-amber-500/20 bg-amber-950/20 px-4 py-2 text-xs text-amber-200">
            في انتظار تأكيد: {pendingFromLast.previewSummary}
          </div>
        )}

        <div className="border-t border-stone-700/50 p-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب أمراً… مثل: اعرض حجوزات اليوم"
              className="min-w-0 flex-1 rounded-xl border border-stone-600 bg-stone-950 px-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
              disabled={sending}
              maxLength={2000}
            />
            <Button type="submit" disabled={sending || !input.trim()}>
              <Send className="h-4 w-4" />
              <span className="me-1 hidden sm:inline">إرسال</span>
            </Button>
          </form>
        </div>
      </Card>

      {showLogs && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-stone-700/50 px-4 py-3">
            <h3 className="text-sm font-semibold">سجل العمليات</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {actionLogs.length === 0 ? (
              <p className="p-4 text-sm text-stone-400">لا توجد عمليات بعد</p>
            ) : (
              <ul className="divide-y divide-stone-800">
                {actionLogs.map((log) => (
                  <li key={log.id} className="px-4 py-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          log.status === "success"
                            ? "success"
                            : log.status === "failed"
                              ? "danger"
                              : "default"
                        }
                      >
                        {log.status}
                      </Badge>
                      <span className="font-medium text-stone-200">{log.toolName}</span>
                      <span className="text-stone-500">
                        {new Date(log.executedAt).toLocaleString("ar-SA")}
                      </span>
                    </div>
                    {log.resultSummary && (
                      <p className="mt-1 text-stone-400">{log.resultSummary}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
