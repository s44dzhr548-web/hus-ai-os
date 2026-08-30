import prisma from "@/lib/prisma";
import { apiAccessPendingMessage } from "@/lib/google-business/reviews-service";

export type GoogleBusinessPlatformCard = {
  key: "GOOGLE_BUSINESS";
  labelAr: string;
  brandColor: string;
  logoLetter: string;
  status: "NOT_CONNECTED" | "CONNECTED" | "PENDING_LOCATION" | "PENDING_API";
  statusLabel: string;
  connectUrl: string;
  reviewsUrl: string;
  accountName: string | null;
  locationDisplayName: string | null;
  lastSyncAt: string | null;
  setupHint: string | null;
  canSync: boolean;
};

export async function getGoogleBusinessPlatformCard(
  restaurantId: string
): Promise<GoogleBusinessPlatformCard> {
  const conn = await prisma.googleBusinessConnection.findUnique({
    where: { restaurantId },
    include: { locations: { where: { isSelected: true }, take: 1 } },
  });

  const base = {
    key: "GOOGLE_BUSINESS" as const,
    labelAr: "Google Business Profile",
    brandColor: "#34A853",
    logoLetter: "G",
    connectUrl: "/api/integrations/google-business/connect",
    reviewsUrl: "/dashboard/google-reviews",
    accountName: conn?.accountName ?? null,
    locationDisplayName: conn?.locations[0]?.displayName ?? null,
    lastSyncAt: conn?.lastSyncAt?.toISOString() ?? null,
    canSync: Boolean(conn?.isActive && conn.locations.length),
  };

  if (!conn?.isActive) {
    return {
      ...base,
      status: "NOT_CONNECTED",
      statusLabel: "غير مربوط",
      setupHint: "ربط منفصل عن Google Ads — OAuth business.manage",
    };
  }
  if (!conn.locations.length) {
    return {
      ...base,
      status: "PENDING_LOCATION",
      statusLabel: "اختر الموقع",
      setupHint: "اختر موقع فابريكا يدوياً من قائمة المواقع",
    };
  }
  if (!conn.lastSyncAt || conn.lastSyncError) {
    return {
      ...base,
      status: "PENDING_API",
      statusLabel: conn.lastSyncError ? "بانتظار موافقة API" : "لم تُزامَن المراجعات بعد",
      setupHint: conn.lastSyncError || apiAccessPendingMessage(),
    };
  }

  return {
    ...base,
    status: "CONNECTED",
    statusLabel: "متصل — مراجعات مُزامَنة",
    setupHint: null,
  };
}

export function googleBusinessToMarketingCard(card: GoogleBusinessPlatformCard) {
  return {
    key: card.key,
    labelAr: card.labelAr,
    brandColor: card.brandColor,
    logoLetter: card.logoLetter,
    status:
      card.status === "NOT_CONNECTED"
        ? "NOT_CONNECTED"
        : card.status === "PENDING_LOCATION"
          ? "PENDING_SETUP"
          : card.status === "PENDING_API"
            ? "PENDING_SETUP"
            : "CONNECTED",
    statusLabel: card.statusLabel,
    connectionState:
      card.status === "NOT_CONNECTED"
        ? "NOT_CONNECTED"
        : card.status === "PENDING_LOCATION"
          ? "PENDING_SETUP"
          : card.status === "PENDING_API"
            ? "PENDING_SETUP"
            : "CONNECTED",
    connectionStateLabel: card.statusLabel,
    integrationReady: true,
    showConnectButton: card.status === "NOT_CONNECTED" || card.status === "PENDING_LOCATION",
    connectUrl: card.connectUrl,
    setupHint: card.setupHint,
    businessName: card.locationDisplayName,
    accountName: card.accountName,
    accountId: null,
    currency: null,
    timezone: null,
    lastSync: card.lastSyncAt,
    syncStatus: card.status,
    reviewsUrl: card.reviewsUrl,
  };
}
