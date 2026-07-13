import { ProviderHub } from "@/components/marketing/providers/provider-hub";
import { VIDEO_TASKS } from "@/lib/marketing/providers/client-constants";

export default function VideoProvidersPage() {
  return (
    <ProviderHub
      title="مزودو توليد الفيديو"
      desc="Runway · Kling · Veo · Luma · HeyGen…"
      category="VIDEO"
      taskOptions={[...VIDEO_TASKS]}
    />
  );
}
