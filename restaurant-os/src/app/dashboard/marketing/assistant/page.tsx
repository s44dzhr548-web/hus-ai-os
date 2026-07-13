"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkPageHeader } from "@/components/marketing/marketing-shell";
import { stubAssistantReply } from "@/lib/marketing/simulation-engine";

export default function AssistantPage() {
  const [prompts, setPrompts] = useState<Array<{ q: string; ar: string; a: string }>>([]);
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    fetch("/api/marketing/command?section=assistant").then((r) => r.json()).then((d) => setPrompts(d.prompts ?? []));
  }, []);

  function send(text?: string) {
    const q = text ?? input;
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    const reply = stubAssistantReply(q);
    setMessages((m) => [...m, { role: "assistant", text: reply.content }]);
  }

  return (
    <div>
      <MkPageHeader title="Marketing AI Assistant" desc="Embedded chat — Phase 2 stub" />
      <div className="mb-3 flex flex-wrap gap-2">
        {prompts.map((p) => (
          <button key={p.q} type="button" onClick={() => send(p.ar)} className="rounded-full bg-stone-800 px-3 py-1 text-xs">{p.ar}</button>
        ))}
      </div>
      <MkCard className="mb-4 max-h-[50vh] space-y-2 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`rounded p-2 text-sm ${m.role === "user" ? "bg-amber-900/30 ms-6" : "bg-stone-800/50 me-6"}`}>
            {m.text}
            {m.role === "assistant" && <MkBadge type="simulation" />}
          </div>
        ))}
      </MkCard>
      <div className="flex gap-2">
        <input className="min-w-0 flex-1 rounded border bg-transparent px-3 py-2 text-sm" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="اسأل عن ROAS، الميزانية، الحملات…" />
        <button type="button" onClick={() => send()} className="rounded bg-amber-600 px-4 py-2 text-sm text-white">إرسال</button>
      </div>
    </div>
  );
}
