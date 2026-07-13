import { Suspense } from "react";
import { MkLoading } from "@/components/marketing/marketing-shell";
import SetupWizardClient from "./setup-wizard-client";

export default function WhatsAppSetupPage() {
  return (
    <Suspense fallback={<MkLoading />}>
      <SetupWizardClient />
    </Suspense>
  );
}
