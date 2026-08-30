import { Suspense } from "react";
import { MkLoading } from "@/components/marketing/marketing-shell";
import { requireAdsPlatformReadAccess } from "@/lib/marketing/auth";
import { getOwnerPlatformCards } from "@/lib/marketing/ads-sync";
import { logGoogleAdsDeveloperTokenConfigured } from "@/lib/marketing/google-ads-developer-token";
import {
  googleAdsEnvPayload,
} from "@/lib/marketing/google-ads-env-runtime";
import PlatformsClient from "./platforms-client";

export const dynamic = "force-dynamic";

export default async function PlatformsPage() {
  const { error, restaurantId, canConnect } = await requireAdsPlatformReadAccess();

  const googleAdsEnv = await googleAdsEnvPayload();
  logGoogleAdsDeveloperTokenConfigured("platforms_page", googleAdsEnv.developerTokenConfigured);

  const initialPlatforms =
    !error && restaurantId
      ? await getOwnerPlatformCards(restaurantId, {
          googleAdsDeveloperTokenConfigured: googleAdsEnv.developerTokenConfigured,
        })
      : [];
  const initialCanConnect = !error && canConnect;

  return (
    <Suspense fallback={<MkLoading />}>
      <PlatformsClient
        initialPlatforms={initialPlatforms}
        initialCanConnect={initialCanConnect}
        initialGoogleAdsEnv={googleAdsEnv}
      />
    </Suspense>
  );
}
