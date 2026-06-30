import type { StatusTone } from "@/lib/types";

type Props =
  | { ok: boolean; label?: never; tone?: never }
  | { ok?: never; label: string; tone?: StatusTone };

export function StatusBadge(props: Props) {
  if ("ok" in props && props.ok !== undefined) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
          props.ok
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-red-500/15 text-red-400"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${props.ok ? "bg-emerald-400" : "bg-red-400"}`}
        />
        {props.ok ? "Healthy" : "Issue"}
      </span>
    );
  }

  const tone = props.tone ?? "neutral";
  const styles: Record<StatusTone, string> = {
    success: "bg-emerald-500/15 text-emerald-400",
    warning: "bg-amber-500/15 text-amber-400",
    error: "bg-red-500/15 text-red-400",
    neutral: "bg-zinc-800 text-zinc-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[tone]}`}
    >
      {props.label}
    </span>
  );
}
