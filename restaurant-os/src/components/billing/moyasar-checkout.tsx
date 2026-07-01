"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    Moyasar?: {
      init: (config: Record<string, unknown>) => void;
    };
  }
}

interface MoyasarCheckoutProps {
  publishableKey: string;
  amountHalalas: number;
  description: string;
  callbackUrl: string;
  metadata: Record<string, string>;
  onError?: (msg: string) => void;
}

export function MoyasarCheckout({
  publishableKey,
  amountHalalas,
  description,
  callbackUrl,
  metadata,
  onError,
}: MoyasarCheckoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !publishableKey) return;

    function initForm() {
      if (!window.Moyasar || !containerRef.current) return;
      initialized.current = true;
      containerRef.current.innerHTML = "";
      window.Moyasar.init({
        element: containerRef.current,
        amount: amountHalalas,
        currency: "SAR",
        description,
        publishable_api_key: publishableKey,
        callback_url: callbackUrl,
        methods: ["creditcard", "applepay"],
        metadata,
        language: "ar",
        fixed_width: false,
      });
    }

    const existingCss = document.querySelector('link[href*="moyasar"]');
    const existingJs = document.querySelector('script[src*="moyasar"]');

    if (!existingCss) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.css";
      document.head.appendChild(link);
    }

    if (window.Moyasar) {
      initForm();
      return;
    }

    if (!existingJs) {
      const script = document.createElement("script");
      script.src = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.js";
      script.onload = initForm;
      script.onerror = () => onError?.("Failed to load Moyasar");
      document.body.appendChild(script);
    } else {
      existingJs.addEventListener("load", initForm);
    }
  }, [publishableKey, amountHalalas, description, callbackUrl, metadata, onError]);

  if (!publishableKey) {
    return (
      <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
        مفاتيح Moyasar غير مُعدّة. أضف MOYASAR_PUBLISHABLE_KEY في إعدادات Vercel.
      </p>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="mb-4 text-sm text-gray-600">
        ادفع بـ Mada · Visa · Mastercard · Apple Pay
      </p>
      <div ref={containerRef} className="mysr-form" dir="ltr" />
    </div>
  );
}
