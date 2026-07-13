import { StudioShell } from "@/components/marketing/studio-shell";

export default function VideoStudioPage() {
  return (
    <StudioShell
      title="AI Video Studio"
      desc="Runway · Kling · Veo · Pika · HeyGen · Hailuo"
      providersHref="/dashboard/marketing/creative/videos/providers"
      formats={["TikTok", "Reel", "Snap Story", "YouTube Short", "Intro", "Product", "Offer", "Menu"]}
    />
  );
}
