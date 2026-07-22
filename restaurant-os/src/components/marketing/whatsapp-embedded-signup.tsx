"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

declare global {
  interface Window {
    FB?: {
      init: (opts: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
      login: (
        cb: (response: { authResponse?: { code?: string } }) => void,
        opts: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

type EmbeddedSignupPayload = {
  waba_id?: string;
  phone_number_id?: string;
  business_id?: string;
  display_phone_number?: string;
};

type Props = {
  appId: string;
  configId: string;
  disabled?: boolean;
  onComplete: (payload: {
    wabaId: string;
    phoneNumberId: string;
    metaBusinessId?: string;
    displayPhoneNumber?: string;
  }) => Promise<void>;
  onError?: (message: string) => void;
};

function loadFacebookSdk(appId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, cookie: true, xfbml: false, version: "v23.0" });
      resolve();
    };
    if (document.getElementById("facebook-jssdk")) {
      const wait = setInterval(() => {
        if (window.FB) {
          clearInterval(wait);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(wait);
        if (!window.FB) reject(new Error("Facebook SDK failed to load"));
      }, 15000);
      return;
    }
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onerror = () => reject(new Error("Facebook SDK failed to load"));
    document.body.appendChild(script);
  });
}

export function WhatsAppEmbeddedSignup({
  appId,
  configId,
  disabled,
  onComplete,
  onError,
}: Props) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const handlerRef = useRef<((event: MessageEvent) => void) | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    loadFacebookSdk(appId)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e) => onError?.(e instanceof Error ? e.message : "SDK load failed"));
    return () => {
      cancelled = true;
    };
  }, [appId, onError]);

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") {
        return;
      }
      let data: { type?: string; event?: string; data?: EmbeddedSignupPayload };
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.type !== "WA_EMBEDDED_SIGNUP" && data?.event !== "FINISH") return;

      const payload = data.data || (data as unknown as EmbeddedSignupPayload);
      const wabaId = payload.waba_id;
      const phoneNumberId = payload.phone_number_id;
      if (!wabaId || !phoneNumberId) return;

      setBusy(true);
      try {
        await onComplete({
          wabaId,
          phoneNumberId,
          metaBusinessId: payload.business_id,
          displayPhoneNumber: payload.display_phone_number,
        });
      } catch (e) {
        onError?.(e instanceof Error ? e.message : "Embedded signup failed");
      } finally {
        setBusy(false);
      }
    },
    [onComplete, onError]
  );

  useEffect(() => {
    handlerRef.current = handleMessage;
    const listener = (e: MessageEvent) => handlerRef.current?.(e);
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [handleMessage]);

  function launchSignup() {
    if (!window.FB || !ready) return;
    setBusy(true);
    window.FB.login(
      () => {
        /* completion handled via postMessage */
        setTimeout(() => setBusy(false), 30000);
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          feature: "whatsapp_embedded_signup",
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: 2,
          setup: {},
        },
      }
    );
  }

  return (
    <Button
      size="lg"
      loading={busy}
      disabled={disabled || !ready}
      onClick={launchSignup}
    >
      {ready ? "ربط حساب WhatsApp Business (Coexistence)" : "جاري تحميل Meta…"}
    </Button>
  );
}
