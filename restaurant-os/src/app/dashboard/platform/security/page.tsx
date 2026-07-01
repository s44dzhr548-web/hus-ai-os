"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input, Card, LoadingSpinner, Badge } from "@/components/ui";
import { Shield, ArrowRight } from "lucide-react";

export default function PlatformSecurityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  function load() {
    fetch("/api/platform/security/2fa")
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d.enabled)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.isPlatformAdmin) load();
  }, [session]);

  async function runAction(action: string, body: Record<string, unknown> = {}) {
    setActionLoading(action);
    const res = await fetch("/api/platform/security/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await res.json();
    setActionLoading("");
    if (!res.ok) {
      alert(data.error || "Failed");
      return data;
    }
    if (action === "setup") {
      setSetup({ secret: data.secret, otpauthUrl: data.otpauthUrl });
    }
    if (action === "enable" || action === "disable") {
      setSetup(null);
      setCode("");
      load();
    }
    return data;
  }

  if (status === "loading" || loading) return <LoadingSpinner />;
  if (!session?.user?.isPlatformAdmin) {
    return <div className="rounded-xl bg-white p-8 text-center shadow">Access denied</div>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/dashboard/platform" className="inline-flex items-center gap-1 text-sm text-emerald-700">
        <ArrowRight className="h-4 w-4" /> Platform
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Shield className="h-6 w-6 text-emerald-600" /> Platform Security
      </h1>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Two-Factor Authentication (2FA)</p>
            <p className="text-sm text-gray-500">Optional TOTP for platform owner login</p>
          </div>
          <Badge variant={enabled ? "success" : "default"}>
            {enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>

        {!enabled && !setup && (
          <Button loading={actionLoading === "setup"} onClick={() => runAction("setup")}>
            Setup 2FA
          </Button>
        )}

        {setup && (
          <div className="space-y-3 rounded-lg bg-gray-50 p-3 text-sm">
            <p className="font-mono text-xs break-all" dir="ltr">
              Secret: {setup.secret}
            </p>
            <p className="font-mono text-xs break-all" dir="ltr">
              {setup.otpauthUrl}
            </p>
            <Input
              label="Verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              dir="ltr"
            />
            <Button
              loading={actionLoading === "enable"}
              onClick={() => runAction("enable", { code, secret: setup.secret })}
            >
              Enable 2FA
            </Button>
          </div>
        )}

        {enabled && (
          <div className="space-y-3">
            <Input
              label="Verification code to disable"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              dir="ltr"
            />
            <Button
              variant="outline"
              loading={actionLoading === "disable"}
              onClick={() => runAction("disable", { code })}
            >
              Disable 2FA
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
