import type { MarketingPlatform } from "@prisma/client";
import {
  getOAuthStartUrl,
  isOAuthConfigured,
  parseOAuthState,
  exchangeOAuthCode,
  buildOAuthState,
  discoverAdAccount,
} from "@/lib/marketing/ads-oauth";
import { ADS_INTEGRATION_DEFS } from "@/lib/platform/ads-integrations";

/** @deprecated Use ads-oauth.ts — kept for backward compatibility */
export async function getOAuthStartUrlLegacy(
  platform: MarketingPlatform,
  restaurantId: string,
  _redirectBase: string
): Promise<string | null> {
  return getOAuthStartUrl(platform, restaurantId);
}

export { getOAuthStartUrl, isOAuthConfigured, parseOAuthState, exchangeOAuthCode, buildOAuthState, discoverAdAccount };

/** Legacy sync config shape for routes still importing OAUTH_CONFIG */
export const OAUTH_CONFIG = Object.fromEntries(
  Object.entries(ADS_INTEGRATION_DEFS).map(([key, def]) => [
    key,
    {
      authUrl: def.authUrl,
      tokenUrl: def.tokenUrl,
      scopes: def.defaultScopes,
      clientIdEnv: def.envClientId,
      clientSecretEnv: def.envClientSecret,
    },
  ])
) as Partial<
  Record<
    MarketingPlatform,
    { authUrl: string; tokenUrl: string; scopes: string[]; clientIdEnv: string; clientSecretEnv: string }
  >
>;
