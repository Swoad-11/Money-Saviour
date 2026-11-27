import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { MonthSummary } from "@/core";
import { useConfig } from "@/state/config";
import { categoryById } from "@/state/month";
import { useToast } from "@/ui/toast-store";
import { Button } from "@/ui/controls";
import { dayParts, monthLabel, taka } from "@/ui/format";
import { CategorySelect } from "./CategorySelect";
import { useUncategorized } from "./usage";

export function ReviewQueue({ months }: { months: MonthSummary[] }) {
  const items = useUncategorized(months);
  const setRule = useConfig((s) => s.setRule);
  const showToast = useToast((s) => s.show);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCat, setBulkCat] = useState("");

  if (!items.length) {
    return (
      <div className="grid place-items-center gap-2 py-12 text-center">
        <CheckCircle2 size={28} className="text-primary" aria-hidden />
        <p className="font-medium">Everything is categorized.</p>
        <p className="text-[13px] text-muted">New item names you type will show up here.</p>
      </div>
    );
  }

  const total = items.reduce((s, i) => s + i.total, 0);
  const assign = (keys: string[], categoryId: string) => {
    for (const k of keys) {
      const it = items.find((i) => i.key === k);
      if (it) setRule(it.key, categoryId);
    }
    setSelected(new Set());
    showToast({
      message: `${keys.length === 1 ? `"${keys[0]}"` : `${keys.length} items`} → ${categoryById(categoryId).name}. Applied to every month.`,
    });
  };
  const toggle = (k: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <div className="grid gap-3">
      <p className="text-[13px] text-muted">
        {items.length === 1 ? "1 item name" : `${items.length} item names`} ({taka(total)}) {items.length === 1 ? "doesn't" : "don't"} match a rule yet. Pick a category and it becomes a rule for
        every month, past and future.
      </p>

      {selected.size > 0 && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary-soft px-3 py-2 text-[13px]">
          <span className="font-medium">{selected.size} selected</span>
          <CategorySelect label="Category for selected items" value={bulkCat} onChange={setBulkCat} allowNone={false} placeholder="Choose a category" />
          <Button size="sm" variant="primary" disabled={!bulkCat} onClick={() => assign([...selected], bulkCat)}>
            Assign
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <ul className="divide-y divide-line rounded-xl border border-line">
        {items.map((it) => {
          const last = dayParts(it.lastDate);
          return (
            <li key={it.key} className="grid grid-cols-[24px_1fr] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 sm:grid-cols-[24px_1fr_110px_180px]">
              <input
                type="checkbox"
                aria-label={`Select ${it.name}`}
                checked={selected.has(it.key)}
                onChange={() => toggle(it.key)}
                className="size-4 accent-[var(--ms-primary)]"
              />
              <div className="min-w-0">
                <p className="truncate font-medium">{it.name}</p>
                <p className="truncate text-xs text-muted">
                  {it.count}× · last {last.day} {monthLabel(it.lastDate.slice(0, 7), false).split(" ")[0]} · e.g.{" "}
                  <span className="font-mono">{it.examples.join(", ")}</span>
                </p>
              </div>
              <span className="num col-start-2 text-[13px] font-semibold sm:col-start-auto sm:text-right">{taka(it.total)}</span>
              <CategorySelect
                className="col-start-2 sm:col-start-auto"
                label={`Category for ${it.name}`}
                value=""
                placeholder="Assign category…"
                allowNone={false}
                onChange={(id) => assign([it.key], id)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
