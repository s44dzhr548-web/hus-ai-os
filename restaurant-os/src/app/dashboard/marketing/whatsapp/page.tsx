import { Suspense } from "react";
import { MkLoading } from "@/components/marketing/marketing-shell";
import WhatsAppBusinessPage from "./whatsapp-business-client";

export default function WhatsAppPage() {
  return (
    <Suspense fallback={<MkLoading />}>
      <WhatsAppBusinessPage />
    </Suspense>
  );
}
