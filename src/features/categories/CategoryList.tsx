import { useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { BUILTIN_CATEGORIES, BUILTIN_RULES, type Category, type MonthSummary } from "@/core";
import { categoryIdFor, useConfig } from "@/state/config";
import { Button, TextInput } from "@/ui/controls";
import { categoryColor, taka } from "@/ui/format";
import { useUsage } from "./usage";

const SLOTS: (number | null)[] = [0, 1, 2, 3, 4, 5, 6, null];

export function CategoryList({ months }: { months: MonthSummary[] }) {
  const { categories, userRules, upsertCategory, deleteCategory } = useConfig();
  const usage = useUsage(months);
  const [name, setName] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const ruleCount = (id: string) => {
    const user = new Map(userRules.map((r) => [r.key, r]));
    const builtin = BUILTIN_RULES.filter((r) => !user.has(r.key) && r.categoryId === id).length;
    return builtin + userRules.filter((r) => r.categoryId === id).length;
  };
  const builtinIds = new Set(BUILTIN_CATEGORIES.map((c) => c.id));
  const visible = categories.filter((c) => showArchived || !c.archived);
  const archivedCount = categories.filter((c) => c.archived).length;

  const add = () => {
    const n = name.trim();
    if (!n) return;
    upsertCategory({ id: categoryIdFor(n, categories.map((c) => c.id)), name: n, color: null, kind: "variable", archived: false });
    setName("");
  };

  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        <TextInput aria-label="New category name" placeholder="New category, e.g. Eating out" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button variant="primary" onClick={add} disabled={!name.trim()}>
          Add
        </Button>
      </div>

      <ul className="divide-y divide-line rounded-xl border border-line">
        {visible.map((c) => (
          <CategoryRow
            key={c.id}
            c={c}
            rules={ruleCount(c.id)}
            yearTotal={usage.byCategory.get(c.id) ?? 0}
            canRemove={!builtinIds.has(c.id) && ruleCount(c.id) === 0}
            onChange={(patch) => upsertCategory({ id: c.id, ...patch })}
            onRemove={() => deleteCategory(c.id)}
          />
        ))}
      </ul>
      {archivedCount > 0 && (
        <Button variant="ghost" className="w-fit" onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? "Hide" : "Show"} {archivedCount} archived
        </Button>
      )}
      <p className="text-xs text-muted">
        Colors: seven categories can have a chart color, so colors stay easy to tell apart; the rest share gray. Fixed
        or variable is the default for the category's items; a rule can override it.
      </p>
    </div>
  );
}

function CategoryRow({
  c,
  rules,
  yearTotal,
  canRemove,
  onChange,
  onRemove,
}: {
  c: Category;
  rules: number;
  yearTotal: number;
  canRemove: boolean;
  onChange: (patch: Partial<Category>) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(c.name);
  const [last, setLast] = useState(c.name);
  if (c.name !== last) {
    setLast(c.name);
    setName(c.name);
  }
  return (
    <li className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto_auto_110px_40px] ${c.archived ? "opacity-60" : ""}`}>
      <div className="flex min-w-0 items-center gap-2">
        <ColorPicker value={c.color} onChange={(color) => onChange({ color })} label={c.name} />
        <input
          aria-label={`Name of ${c.name}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name.trim() !== c.name && onChange({ name: name.trim() })}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 font-medium hover:border-line focus:border-primary focus:bg-surface focus:outline-none"
        />
      </div>
      <div role="radiogroup" aria-label={`Kind for ${c.name}`} className="col-span-2 col-start-2 row-start-1 flex w-fit justify-self-end rounded-lg bg-surface-muted p-0.5 text-xs md:col-span-1 md:col-start-auto md:row-start-auto">
        {(["fixed", "variable"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={c.kind === k}
            onClick={() => onChange({ kind: k })}
            className={`rounded-md px-2 py-1 font-medium capitalize ${c.kind === k ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
          >
            {k}
          </button>
        ))}
      </div>
      <span className="text-xs text-muted">{rules} rule{rules === 1 ? "" : "s"}</span>
      <span className="num text-right text-[13px]">{taka(Math.round(yearTotal))}</span>
      <button
        type="button"
        aria-label={c.archived ? `Restore ${c.name}` : canRemove ? `Remove ${c.name}` : `Archive ${c.name}`}
        title={c.archived ? "Restore" : canRemove ? "Remove (no rules use it)" : "Archive (hide from pickers; past totals stay)"}
        onClick={() => (c.archived ? onChange({ archived: false }) : canRemove ? onRemove() : onChange({ archived: true }))}
        className="inline-grid size-8 place-items-center justify-self-end rounded-lg text-muted hover:bg-surface-muted hover:text-ink"
      >
        {c.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
      </button>
    </li>
  );
}

function ColorPicker({ value, onChange, label }: { value: number | null; onChange: (v: number | null) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Change color of ${label}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-8 place-items-center rounded-md hover:bg-surface-muted"
      >
        <span className="size-3.5 rounded-full" style={{ background: categoryColor({ color: value }) }} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={`Colors for ${label}`}
          className="absolute top-9 left-0 z-20 flex gap-1 rounded-lg border border-line bg-surface p-1.5 shadow-lg"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          {SLOTS.map((s) => (
            <button
              key={String(s)}
              type="button"
              role="option"
              aria-selected={s === value}
              aria-label={s === null ? "Gray" : `Color ${s + 1}`}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className={`grid size-7 place-items-center rounded-md ${s === value ? "ring-2 ring-primary" : "hover:bg-surface-muted"}`}
            >
              <span className="size-4 rounded-full" style={{ background: categoryColor({ color: s }) }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
