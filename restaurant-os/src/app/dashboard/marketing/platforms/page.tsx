import { Suspense } from "react";
import { MkLoading } from "@/components/marketing/marketing-shell";
import PlatformsClient from "./platforms-client";

export default function PlatformsPage() {
  return (
    <Suspense fallback={<MkLoading />}>
      <PlatformsClient />
    </Suspense>
  );
}
