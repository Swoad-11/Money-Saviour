import type { LucideIcon } from "lucide-react";

/** Temporary body for pages that later milestones fill in. */
export function Placeholder({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
      <Icon size={28} className="mb-3 text-muted" aria-hidden />
      <p className="max-w-sm text-sm text-muted">{text}</p>
    </div>
  );
}
