import { Suspense } from "react";
import { MkLoading } from "@/components/marketing/marketing-shell";
import { requireAdsPlatformReadAccess } from "@/lib/marketing/auth";
import { getOwnerPlatformCards } from "@/lib/marketing/ads-sync";
import PlatformsClient from "./platforms-client";

export const dynamic = "force-dynamic";

export default async function PlatformsPage() {
  const { error, restaurantId, canConnect } = await requireAdsPlatformReadAccess();

  const initialPlatforms =
    !error && restaurantId ? await getOwnerPlatformCards(restaurantId) : [];
  const initialCanConnect = !error && canConnect;

  return (
    <Suspense fallback={<MkLoading />}>
      <PlatformsClient
        initialPlatforms={initialPlatforms}
        initialCanConnect={initialCanConnect}
      />
    </Suspense>
  );
}
