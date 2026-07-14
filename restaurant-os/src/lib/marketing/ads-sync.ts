import prisma from "@/lib/prisma";
import type { MarketingPlatform } from "@prisma/client";
import { decryptToken, encryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import { refreshAccessTokenIfNeeded, discoverAdAccount } from "@/lib/marketing/ads-oauth";

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
    /* partial sync ok */
  }

  return { campaigns, spend: totalSpend };
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
      } else {
        const acct = await discoverAdAccount(conn.platform, token);
        if (acct) {
          await prisma.marketingAdConnection.update({
            where: { id: conn.id },
            data: {
              accountId: acct.accountId,
              accountName: acct.accountName,
              businessName: acct.businessName,
              currency: acct.currency,
              timezone: acct.timezone,
            },
          });
        }
      }

      await prisma.marketingAdConnection.update({
        where: { id: conn.id },
        data: { lastSyncAt: new Date(), syncStatus: "SYNCED" },
      });

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
      const msg = e instanceof Error ? e.message : "Sync failed";
      await prisma.marketingAdConnection.update({
        where: { id: conn.id },
        data: { syncStatus: "ERROR" },
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

export async function getOwnerPlatformCards(restaurantId: string) {
  const { OWNER_AD_PLATFORMS } = await import("@/lib/marketing/ads-platforms");
  const { isAdsIntegrationReady } = await import("@/lib/platform/ads-integrations");

  const connections = await prisma.marketingAdConnection.findMany({ where: { restaurantId } });
  const byPlatform = new Map(connections.map((c) => [c.platform, c]));

  return Promise.all(
    OWNER_AD_PLATFORMS.map(async (p) => {
      const conn = byPlatform.get(p.platform);
      const integrationReady = await isAdsIntegrationReady(p.integrationKey);
      const connected = Boolean(conn?.isActive && conn.accessTokenEnc);

      return {
        key: p.platform,
        labelAr: p.labelAr,
        brandColor: p.brandColor,
        logoLetter: p.logoLetter,
        status: connected ? "CONNECTED" : integrationReady ? "NOT_CONNECTED" : "PENDING_SETUP",
        statusLabel: connected ? "Connected" : integrationReady ? "Not Connected" : "بانتظار التفعيل",
        integrationReady,
        businessName: conn?.businessName ?? null,
        accountName: conn?.accountName ?? null,
        accountId: conn?.accountId ? maskId(conn.accountId) : null,
        currency: conn?.currency ?? null,
        timezone: conn?.timezone ?? null,
        lastSync: conn?.lastSyncAt?.toISOString() ?? null,
        syncStatus: conn?.syncStatus ?? null,
      };
    })
  );
}

function maskId(id: string): string {
  if (id.length <= 6) return "••••";
  return `${id.slice(0, 2)}••••${id.slice(-4)}`;
}
