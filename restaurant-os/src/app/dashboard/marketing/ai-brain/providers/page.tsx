import { ProviderHub } from "@/components/marketing/providers/provider-hub";
import { BRAIN_ROLES } from "@/lib/marketing/providers/client-constants";

export default function BrainProvidersPage() {
  return (
    <ProviderHub
      title="Marketing Brain — مزودو الذكاء الاصطناعي"
      desc="اختر المزود لكل دور: مدير التسويق · محلل البيانات · كاتب الإعلانات…"
      category="BRAIN"
      roleOptions={[...BRAIN_ROLES]}
    />
  );
}
