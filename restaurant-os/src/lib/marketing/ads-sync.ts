import prisma from "@/lib/prisma";
import type { MarketingPlatform } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { decryptToken, encryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import { refreshAccessTokenIfNeeded } from "@/lib/marketing/ads-oauth";
import {
  GoogleAdsApiError,
  isPlaceholderGoogleAccountId,
  logGoogleAdsSyncFailure,
  syncGoogleAdsEntities,
} from "@/lib/marketing/google-ads-api-service";
import { getGoogleAdsManagerCustomerId } from "@/lib/marketing/google-ads-oauth-service";
import {
  isGoogleAdsDeveloperTokenConfigured,
  logGoogleAdsDeveloperTokenConfigured,
  resolveGoogleAdsSetupHintForCard,
} from "@/lib/marketing/google-ads-developer-token";

const GRAPH = "https://graph.facebook.com/v21.0";

async function getAccessToken(restaurantId: string, platform: MarketingPlatform): Promise<string | null> {
  const conn = await prisma.marketingAdConnection.findUnique({
    where: { restaurantId_platform: { restaurantId, platform } },
  });
  if (!conn?.accessTokenEnc || !conn.isActive || !canEncryptTokens()) return null;

  if (conn.tokenExpiresAt && conn.tokenExpiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    const refreshed = await refreshAccessTokenIfNeeded(platform, conn.refreshTokenEnc);
    if (refreshed) {
      await prisma.marketingAdConnection.update({
        where: { id: conn.id },
        data: {
          accessTokenEnc: encryptToken(refreshed.accessToken),
          tokenExpiresAt: refreshed.expiresIn
            ? new Date(Date.now() + refreshed.expiresIn * 1000)
            : conn.tokenExpiresAt,
        },
      });
      return refreshed.accessToken;
    }
  }

  try {
    return decryptToken(conn.accessTokenEnc);
  } catch {
    return null;
  }
}

async function syncMetaEntities(restaurantId: string, platform: MarketingPlatform, accessToken: string) {
  const conn = await prisma.marketingAdConnection.findUnique({
    where: { restaurantId_platform: { restaurantId, platform } },
  });
  if (!conn?.accountId) return { campaigns: 0, spend: 0 };

  const accountRef = conn.accountId.startsWith("act_") ? conn.accountId : `act_${conn.accountId}`;
  let campaigns = 0;
  let totalSpend = 0;

  try {
    const campRes = await fetch(
      `${GRAPH}/${accountRef}/campaigns?fields=id,name,status,objective&limit=50&access_token=${accessToken}`
    );
    const campData = (await campRes.json()) as {
      data?: Array<{ id: string; name: string; status: string; objective?: string }>;
    };

    for (const c of campData.data || []) {
      campaigns++;
      let spend = 0;
      let impressions = 0;
      let clicks = 0;
      let reach = 0;

      try {
        const insRes = await fetch(
          `${GRAPH}/${c.id}/insights?fields=spend,impressions,clicks,reach,actions&date_preset=last_30d&access_token=${accessToken}`
        );
        const ins = (await insRes.json()) as {
          data?: Array<{
            spend?: string;
            impressions?: string;
            clicks?: string;
            reach?: string;
            actions?: Array<{ action_type: string; value: string }>;
          }>;
        };
        const row = ins.data?.[0];
        if (row) {
          spend = parseFloat(row.spend || "0");
          impressions = parseInt(row.impressions || "0", 10);
          clicks = parseInt(row.clicks || "0", 10);
          reach = parseInt(row.reach || "0", 10);
          totalSpend += spend;
        }
      } catch {
        /* insights optional */
      }

      await prisma.marketingAdEntity.upsert({
        where: {
          restaurantId_platform_entityType_externalId: {
            restaurantId,
            platform,
            entityType: "CAMPAIGN",
            externalId: c.id,
          },
        },
        create: {
          restaurantId,
          platform,
          entityType: "CAMPAIGN",
          externalId: c.id,
          name: c.name,
          status: c.status,
          spend,
          impressions,
          clicks,
          reach,
          syncedAt: new Date(),
        },
        update: {
          name: c.name,
          status: c.status,
          spend,
          impressions,
          clicks,
          reach,
          syncedAt: new Date(),
        },
      });
    }
  } catch {
    throw new Error("Meta Ads sync failed");
  }

  return { campaigns, spend: totalSpend };
}

function metadataWithSyncError(
  existing: unknown,
  error: string | null
): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  if (error) {
    base.lastSyncError = error;
    base.lastSyncErrorAt = new Date().toISOString();
  } else {
    delete base.lastSyncError;
    delete base.lastSyncErrorAt;
  }
  return base as Prisma.InputJsonValue;
}

export async function syncRestaurantAds(restaurantId: string, platform?: MarketingPlatform) {
  const connections = await prisma.marketingAdConnection.findMany({
    where: {
      restaurantId,
      isActive: true,
      ...(platform ? { platform } : {}),
    },
  });

  const results = [];
  for (const conn of connections) {
    const token = await getAccessToken(restaurantId, conn.platform);
    if (!token) {
      await prisma.marketingAdConnection.update({
        where: { id: conn.id },
        data: { syncStatus: "NEEDS_RECONNECT" },
      });
      results.push({ platform: conn.platform, ok: false, error: "Token unavailable" });
      continue;
    }

    try {
      let summary = { campaigns: 0, spend: 0 };

      if (["META", "FACEBOOK", "INSTAGRAM"].includes(conn.platform)) {
        summary = await syncMetaEntities(restaurantId, conn.platform, token);
        await prisma.marketingAdConnection.update({
          where: { id: conn.id },
          data: {
            lastSyncAt: new Date(),
            syncStatus: "SYNCED",
            metadataJson: metadataWithSyncError(conn.metadataJson, null),
          },
        });
      } else if (conn.platform === "GOOGLE" || conn.platform === "YOUTUBE") {
        const meta =
          conn.metadataJson && typeof conn.metadataJson === "object"
            ? (conn.metadataJson as Record<string, unknown>)
            : {};
        const google = await syncGoogleAdsEntities({
          restaurantId,
          accessToken: token,
          storedAccountId: conn.accountId,
          loginCustomerId:
            (meta.managerCustomerId as string | undefined) || getGoogleAdsManagerCustomerId(),
        });

        summary = { campaigns: google.campaigns, spend: google.spend };

        await prisma.marketingAdConnection.update({
          where: { id: conn.id },
          data: {
            accountId: google.customerId,
            accountName: google.accountName,
            businessName: google.accountName,
            currency: google.currency,
            lastSyncAt: new Date(),
            syncStatus: "SYNCED",
            metadataJson: metadataWithSyncError(
              {
                ...meta,
                googleCustomerId: google.customerId,
                lastSuccessfulSyncAt: new Date().toISOString(),
              },
              null
            ),
          },
        });
      } else {
        throw new Error(`Sync not implemented for ${conn.platform}`);
      }

      await prisma.marketingAdSyncLog.create({
        data: {
          restaurantId,
          platform: conn.platform,
          kind: "DAILY_SYNC",
          ok: true,
          message: `${summary.campaigns} campaigns · spend ${summary.spend.toFixed(2)}`,
        },
      });

      results.push({ platform: conn.platform, ok: true, ...summary });
    } catch (e) {
      const msg =
        e instanceof GoogleAdsApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Sync failed";

      if (e instanceof GoogleAdsApiError) {
        logGoogleAdsSyncFailure({
          restaurantId,
          code: e.code,
          message: e.message,
          httpStatus: e.httpStatus,
        });
      }

      await prisma.marketingAdConnection.update({
        where: { id: conn.id },
        data: {
          syncStatus:
            e instanceof GoogleAdsApiError &&
            (e.message.includes("Basic Access") ||
              e.message.includes("بانتظار موافقة Google"))
              ? "CONNECTED_PENDING_API_APPROVAL"
              : "ERROR",
          metadataJson: metadataWithSyncError(conn.metadataJson, msg),
        },
      });
      await prisma.marketingAdSyncLog.create({
        data: { restaurantId, platform: conn.platform, kind: "DAILY_SYNC", ok: false, message: msg },
      });
      results.push({ platform: conn.platform, ok: false, error: msg });
    }
  }

  return results;
}

export async function syncAllRestaurantsAds() {
  const connections = await prisma.marketingAdConnection.findMany({
    where: { isActive: true },
    select: { restaurantId: true },
    distinct: ["restaurantId"],
  });

  let ok = 0;
  let fail = 0;
  for (const { restaurantId } of connections) {
    const results = await syncRestaurantAds(restaurantId);
    results.forEach((r) => (r.ok ? ok++ : fail++));
  }
  return { restaurants: connections.length, ok, fail };
}

export async function getOwnerPlatformCards(
  restaurantId: string,
  opts?: { googleAdsDeveloperTokenConfigured?: boolean }
) {
  const { OWNER_AD_PLATFORMS } = await import("@/lib/marketing/ads-platforms");
  const { isAdsIntegrationReady, googleAdsSetupHint } = await import("@/lib/platform/ads-integrations");
  const {
    isMetaAdsConfigured,
    resolveMetaAdsConnectionState,
    META_CONNECTION_STATE_LABELS,
    META_CONNECT_URL,
    metaAdsShowsConnectButton,
  } = await import("@/lib/marketing/meta-ads-connect");

  const connections = await prisma.marketingAdConnection.findMany({ where: { restaurantId } });
  const byPlatform = new Map(connections.map((c) => [c.platform, c]));
  const metaConfigured = await isMetaAdsConfigured();
  const devTokenConfigured =
    opts?.googleAdsDeveloperTokenConfigured ?? isGoogleAdsDeveloperTokenConfigured();

  return Promise.all(
    OWNER_AD_PLATFORMS.map(async (p) => {
      const conn = byPlatform.get(p.platform);
      const integrationReady =
        p.platform === "META" ? metaConfigured : await isAdsIntegrationReady(p.integrationKey);
      const connected = Boolean(conn?.isActive && conn.accessTokenEnc);

      let connectionState: string | undefined;
      let connectionStateLabel: string | undefined;
      let connectUrl: string | null = null;
      let showConnectButton = false;
      let setupHint: string | null = null;

      const metaJson =
        conn?.metadataJson && typeof conn.metadataJson === "object"
          ? (conn.metadataJson as Record<string, unknown>)
          : {};
      const lastSyncError =
        typeof metaJson.lastSyncError === "string" ? metaJson.lastSyncError : null;

      if (p.platform === "META") {
        const metaState = resolveMetaAdsConnectionState(
          conn
            ? {
                isActive: conn.isActive,
                accessTokenEnc: conn.accessTokenEnc,
                syncStatus: conn.syncStatus,
                tokenExpiresAt: conn.tokenExpiresAt,
              }
            : null,
          metaConfigured
        );
        connectionState = metaState;
        connectionStateLabel = META_CONNECTION_STATE_LABELS[metaState];
        if (metaAdsShowsConnectButton(metaState)) {
          connectUrl = META_CONNECT_URL;
          showConnectButton = true;
        }
      } else if (p.platform === "GOOGLE") {
        connectUrl = "/api/integrations/google/connect";
        showConnectButton = !connected;
      } else if (integrationReady) {
        connectUrl = `/api/marketing/connections/${p.platform.toLowerCase()}/oauth`;
        showConnectButton = !connected;
      }

      if (p.platform === "GOOGLE" || p.platform === "YOUTUBE") {
        if (p.platform === "GOOGLE") {
          logGoogleAdsDeveloperTokenConfigured("getOwnerPlatformCards");
        }
        const baseHint = googleAdsSetupHint();
        setupHint = resolveGoogleAdsSetupHintForCard({
          setupHint: baseHint,
          lastSyncError,
          syncStatus: conn?.syncStatus,
          developerTokenConfigured: devTokenConfigured,
        });
      }

      const legacyStatus = connected
        ? "CONNECTED"
        : integrationReady
          ? "NOT_CONNECTED"
          : "PENDING_SETUP";

      const rawAccountId = conn?.accountId;
      const displayAccountId =
        rawAccountId && !isPlaceholderGoogleAccountId(rawAccountId)
          ? maskId(rawAccountId)
          : null;

      const rawAccountName = conn?.accountName;
      const displayAccountName =
        rawAccountName && !/account$/i.test(rawAccountName.trim()) ? rawAccountName : null;

      return {
        key: p.platform,
        labelAr: p.labelAr,
        brandColor: p.brandColor,
        logoLetter: p.logoLetter,
        status: legacyStatus,
        statusLabel: connectionStateLabel ?? (connected ? "Connected ✅" : integrationReady ? "Not Connected" : "بانتظار التفعيل"),
        connectionState: connectionState ?? legacyStatus,
        connectionStateLabel: connectionStateLabel ?? statusLabelFromLegacy(legacyStatus),
        integrationReady,
        showConnectButton,
        connectUrl,
        setupHint,
        businessName: conn?.businessName ?? null,
        accountName: displayAccountName ?? conn?.businessName ?? null,
        accountId: displayAccountId,
        currency: conn?.currency ?? null,
        timezone: conn?.timezone ?? null,
        lastSync: conn?.lastSyncAt?.toISOString() ?? null,
        syncStatus: conn?.syncStatus ?? null,
        lastSyncError,
      };
    })
  );
}

function statusLabelFromLegacy(status: string): string {
  if (status === "CONNECTED") return "متصل";
  if (status === "NOT_CONNECTED") return "جاهز للربط";
  return "غير مهيأ";
}

function maskId(id: string): string {
  const digits = id.replace(/-/g, "");
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 3)}••••${digits.slice(-4)}`;
}
