"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui";
import { McCard } from "@/components/marketing-center/mc-shell";

const PROMPTS = [
  "Where should I spend 500 SAR?",
  "Why is TikTok better?",
  "How can I increase reservations?",
  "What should I advertise tomorrow?",
];

interface Msg {
  role: string;
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    const res = await fetch("/api/marketing-center/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "chat", message: msg }),
    });
    const data = await res.json();
    setMessages((m) => [...m, { role: "assistant", content: data.content }]);
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">محادثة AI</h1>
      <p className="mb-4 text-sm opacity-70">UI + ردود placeholder — Phase 1</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <Button key={p} size="sm" variant="outline" onClick={() => send(p)}>
            {p}
          </Button>
        ))}
      </div>
      <McCard className="flex h-[420px] flex-col p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-amber-600 text-white"
                  : "bg-stone-800/80"
              }`}
            >
              {m.content}
            </div>
          ))}
          <div ref={bottom} />
        </div>
        <div className="flex gap-2 border-t border-stone-700 p-3">
          <input
            className="flex-1 rounded-lg border border-stone-600 bg-transparent px-3 py-2 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="اسأل عن الميزانية أو المنصات..."
          />
          <Button onClick={() => send()}>إرسال</Button>
        </div>
      </McCard>
    </div>
  );
}
