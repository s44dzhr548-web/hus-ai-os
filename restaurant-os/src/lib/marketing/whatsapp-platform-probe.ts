import prisma from "@/lib/prisma";
import { graphGet } from "@/lib/marketing/whatsapp-graph-api";
import { resolveMetaCredentials } from "@/lib/platform/meta-config";
import { resolveWhatsAppAccessToken } from "@/lib/platform/whatsapp-access-token";

export type WhatsAppProbeStep = {
  id: string;
  ok: boolean;
  detail: string;
};

async function wabaIdsFromDebugToken(
  userToken: string,
  clientId: string,
  clientSecret: string
): Promise<string[]> {
  const appToken = `${clientId}|${clientSecret}`;
  const data = await graphGet<{
    data?: { granular_scopes?: Array<{ scope?: string; target_ids?: string[] }> };
  }>("/debug_token", appToken, { input_token: userToken });
  const wabaIds: string[] = [];
  for (const scope of data.data?.granular_scopes || []) {
    if (scope.scope?.includes("whatsapp") && scope.target_ids?.length) {
      wabaIds.push(...scope.target_ids);
    }
  }
  return [...new Set(wabaIds)];
}

export async function resolveAssignedWabaIds(accessToken?: string): Promise<string[]> {
  const token = accessToken || (await resolveWhatsAppAccessToken());
  const creds = await resolveMetaCredentials();
  if (!token || !creds.clientId || !creds.clientSecret) return [];
  try {
    return await wabaIdsFromDebugToken(token, creds.clientId, creds.clientSecret);
  } catch {
    return [];
  }
}

/** Resolve Meta Business Portfolio IDs from DB, env, and Graph /me. */
export async function resolveMetaBusinessIds(accessToken?: string): Promise<Array<{ id: string; name: string }>> {
  const token = accessToken || (await resolveWhatsAppAccessToken());
  const row = await prisma.platformMetaConfig.findUnique({ where: { id: "default" } });
  const ids = new Map<string, string>();

  const add = (id: string | null | undefined, name: string) => {
    const trimmed = id?.trim();
    if (trimmed) ids.set(trimmed, name);
  };

  add(row?.metaBusinessId, "Platform config");
  add(process.env.META_BUSINESS_ID, "Environment");

  if (!token) return [...ids.entries()].map(([id, name]) => ({ id, name }));

  try {
    const me = await graphGet<{ id?: string; name?: string }>("/me", token, { fields: "id,name" });
    if (me.id) add(me.id, me.name || "System user");
  } catch {
    /* skip */
  }

  try {
    const businesses = await graphGet<{ data?: Array<{ id: string; name: string }> }>(
      "/me/businesses",
      token,
      { fields: "id,name", limit: "25" }
    );
    for (const biz of businesses.data || []) {
      add(biz.id, biz.name);
    }
  } catch {
    /* system user may lack /me/businesses */
  }

  return [...ids.entries()].map(([id, name]) => ({ id, name }));
}

export async function probeWhatsAppPlatformAccess(opts?: {
  wabaId?: string;
  phoneNumberId?: string;
}): Promise<{ steps: WhatsAppProbeStep[]; phoneCount: number }> {
  const token = await resolveWhatsAppAccessToken();
  const creds = await resolveMetaCredentials();
  const steps: WhatsAppProbeStep[] = [];
  let phoneCount = 0;

  if (!token) {
    return {
      steps: [{ id: "token", ok: false, detail: "WhatsApp Access Token is required" }],
      phoneCount: 0,
    };
  }

  try {
    const me = await graphGet<{ id?: string; name?: string }>("/me", token, { fields: "id,name" });
    steps.push({
      id: "me",
      ok: Boolean(me.id),
      detail: me.name ? `Connected as ${me.name}` : me.id || "OK",
    });
  } catch (e) {
    steps.push({
      id: "me",
      ok: false,
      detail: e instanceof Error ? e.message : "Graph /me failed",
    });
  }

  const businessIds = await resolveMetaBusinessIds(token);
  steps.push({
    id: "business_ids",
    ok: businessIds.length > 0,
    detail: businessIds.length
      ? businessIds.map((b) => `${b.name} (${b.id})`).join(" · ")
      : "Set Meta Business ID in platform settings",
  });

  const assignedWabas = await resolveAssignedWabaIds(token);
  steps.push({
    id: "debug_token_wabas",
    ok: assignedWabas.length > 0,
    detail: assignedWabas.length
      ? `${assignedWabas.length} WABA(s) from token scopes`
      : "No WhatsApp scopes on system user token",
  });
  phoneCount = Math.max(phoneCount, assignedWabas.length);

  for (const biz of businessIds) {
    try {
      const owned = await graphGet<{ data?: unknown[] }>(
        `/${biz.id}/owned_whatsapp_business_accounts`,
        token,
        { fields: "id,name", limit: "10" }
      );
      const count = owned.data?.length ?? 0;
      if (count) phoneCount += count;
      steps.push({
        id: `waba_owned_${biz.id}`,
        ok: count > 0,
        detail: count ? `${count} owned WABA(s)` : "No owned WABAs",
      });
    } catch (e) {
      steps.push({
        id: `waba_owned_${biz.id}`,
        ok: false,
        detail: e instanceof Error ? e.message : "owned WABAs failed",
      });
    }
  }

  const wabaId = opts?.wabaId?.trim();
  if (wabaId) {
    try {
      const nums = await graphGet<{ data?: unknown[] }>(`/${wabaId}/phone_numbers`, token, {
        fields: "id,display_phone_number,verified_name",
        limit: "10",
      });
      const count = nums.data?.length ?? 0;
      phoneCount = Math.max(phoneCount, count);
      steps.push({
        id: "waba_phones",
        ok: count > 0,
        detail: count ? `${count} phone number(s) on WABA ${wabaId}` : "No phones on WABA",
      });
    } catch (e) {
      steps.push({
        id: "waba_phones",
        ok: false,
        detail: e instanceof Error ? e.message : "WABA phone_numbers failed",
      });
    }
  }

  const phoneNumberId = opts?.phoneNumberId?.trim();
  if (phoneNumberId) {
    try {
      const phone = await graphGet<{ display_phone_number?: string; verified_name?: string }>(
        `/${phoneNumberId}`,
        token,
        { fields: "display_phone_number,verified_name" }
      );
      steps.push({
        id: "phone_lookup",
        ok: Boolean(phone.display_phone_number),
        detail: phone.display_phone_number || phone.verified_name || "Phone object reachable",
      });
    } catch (e) {
      steps.push({
        id: "phone_lookup",
        ok: false,
        detail: e instanceof Error ? e.message : "Phone lookup failed",
      });
    }
  }

  steps.push({
    id: "webhook_token",
    ok: Boolean(creds.webhookVerifyToken),
    detail: creds.webhookVerifyToken ? "Webhook verify token configured" : "Missing webhook verify token",
  });

  return { steps, phoneCount };
}
