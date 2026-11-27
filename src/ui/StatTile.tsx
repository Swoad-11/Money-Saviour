import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  note,
  tone = "muted",
  emphasis = false,
}: {
  label: string;
  value: string;
  note?: ReactNode;
  tone?: "muted" | "good" | "bad";
  emphasis?: boolean;
}) {
  const toneClass = tone === "good" ? "text-primary" : tone === "bad" ? "text-danger" : "text-muted";
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`num mt-0.5 font-semibold ${emphasis ? "text-2xl" : "text-lg"}`}>{value}</dd>
      {note && <dd className={`mt-0.5 text-xs ${toneClass}`}>{note}</dd>}
    </div>
  );
}
