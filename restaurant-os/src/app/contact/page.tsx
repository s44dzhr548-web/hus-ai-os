"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const mailto = `mailto:support@menuos.sa?subject=${encodeURIComponent(
      `تواصل من ${form.name}`
    )}&body=${encodeURIComponent(`${form.message}\n\n${form.email}`)}`;
    window.location.href = mailto;
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-4 py-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-emerald-800">
            Menu OS
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-12">
        <h1 className="text-3xl font-bold">تواصل معنا</h1>
        <p className="mt-2 text-gray-600">support@menuos.sa</p>
        {sent ? (
          <p className="mt-8 rounded-xl bg-emerald-50 p-4 text-emerald-800">
            شكراً! تم فتح بريدك لإرسال الرسالة.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl bg-white p-6 shadow">
            <Input
              placeholder="الاسم"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              type="email"
              placeholder="البريد"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <textarea
              className="w-full rounded-lg border border-gray-300 p-3"
              rows={5}
              placeholder="رسالتك"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
            />
            <Button type="submit" className="w-full">
              إرسال
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
