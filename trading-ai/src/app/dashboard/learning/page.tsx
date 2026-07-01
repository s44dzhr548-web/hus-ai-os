import { LearningClient } from "@/components/learning-client";

export default function LearningPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Learning System</h1>
      <p className="mt-1 text-sm text-zinc-500">Track predictions · Compare outcomes · Improve recommendations</p>
      <div className="mt-8">
        <LearningClient />
      </div>
    </div>
  );
}
