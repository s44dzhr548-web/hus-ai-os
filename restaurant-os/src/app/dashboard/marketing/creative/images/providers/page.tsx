import { ProviderHub } from "@/components/marketing/providers/provider-hub";
import { IMAGE_TASKS } from "@/lib/marketing/providers/client-constants";

export default function ImageProvidersPage() {
  return (
    <ProviderHub
      title="مزودو توليد الصور"
      desc="OpenAI · Imagen · Ideogram · Stability · Flux…"
      category="IMAGE"
      taskOptions={[...IMAGE_TASKS]}
    />
  );
}
