import { AlertTriangle } from "lucide-react";
import type { CategorizedItem } from "@/core";
import { categoryById } from "@/state/month";
import { useLivePreview } from "./preview";
import { categoryColor, taka } from "@/ui/format";

export function ItemChips({ items }: { items: CategorizedItem[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => {
        const cat = categoryById(item.categoryId);
        return (
          <span
            key={i}
            title={`${cat.name} · ${item.kind}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-muted py-0.5 pr-1.5 pl-1 text-xs"
          >
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: categoryColor(cat) }} />
            <span className="text-ink">{item.name}</span>
            <span className="num text-muted">{item.amount.toLocaleString("en-IN")}</span>
            <span className="sr-only">, {cat.name}</span>
          </span>
        );
      })}
    </div>
  );
}

export function LivePreview({ text, prefix }: { text: string; prefix?: string }) {
  const p = useLivePreview(text);
  if (!text.trim()) return null;
  return (
    <div className="grid gap-1.5" aria-live="polite">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{p.items.length ? <ItemChips items={p.items} /> : null}</div>
        <span className="num shrink-0 text-[13px] font-semibold">
          {prefix}
          {taka(p.total)}
        </span>
      </div>
      {p.warnings.map((w, i) => (
        <p key={i} className="flex items-center gap-1.5 text-xs text-warning">
          <AlertTriangle size={13} aria-hidden /> {w.message}
        </p>
      ))}
    </div>
  );
}
