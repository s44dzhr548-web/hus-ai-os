import { StudioShell } from "@/components/marketing/studio-shell";

export default function AudioStudioPage() {
  return (
    <StudioShell
      title="Voice & Audio Studio"
      desc="ElevenLabs · OpenAI Audio · Google TTS · Azure · Polly"
      providersHref="/dashboard/marketing/creative/audio/providers"
      formats={["Arabic VO", "English VO", "Subtitles", "Speech-to-text", "Audio cleanup"]}
    />
  );
}
