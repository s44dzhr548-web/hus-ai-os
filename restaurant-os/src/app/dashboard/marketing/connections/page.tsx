"use client";

import { MkPageHeader } from "@/components/marketing/marketing-shell";
import { ConnectionCenterLinks } from "@/components/marketing/providers/provider-hub";

export default function ConnectionsCenterPage() {
  return (
    <div>
      <MkPageHeader
        title="مركز ربط خدمات الذكاء الاصطناعي والتسويق"
        desc="OAuth رسمي · API Keys مشفّرة · لا كلمات مرور"
      />
      <ConnectionCenterLinks />
    </div>
  );
}
