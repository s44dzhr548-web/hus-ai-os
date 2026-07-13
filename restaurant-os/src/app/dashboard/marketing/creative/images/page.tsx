import { StudioShell } from "@/components/marketing/studio-shell";

export default function ImageStudioPage() {
  return (
    <StudioShell
      title="AI Image Studio"
      desc="OpenAI · Imagen · Ideogram · Leonardo · Flux · Recraft"
      providersHref="/dashboard/marketing/creative/images/providers"
      formats={["صور أطباق", "عروض", "Instagram", "Story", "Banner", "Ramadan", "Eid", "Arabic poster"]}
    />
  );
}
