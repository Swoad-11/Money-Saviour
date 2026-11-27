import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { templateFromMonth, templateTotal, type MonthSummary, type Template, type TemplateItem } from "@/core";
import { Dialog } from "@/ui/Dialog";
import { Button, TextInput } from "@/ui/controls";
import { monthLabel, taka } from "@/ui/format";

export function TemplateEditor({
  initial,
  isNew,
  months,
  onSave,
  onDelete,
  onClose,
}: {
  initial: Template;
  isNew: boolean;
  months: MonthSummary[];
  onSave: (t: Template) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [items, setItems] = useState<TemplateItem[]>(initial.items.length ? initial.items : [{ name: "", amount: "", day: 1 }]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const withSpending = months.filter((m) => m.spent > 0);

  const update = (i: number, patch: Partial<TemplateItem>) =>
    setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const clean = items.filter((i) => i.name.trim() && i.amount.trim());
  const valid = name.trim() && clean.length > 0;

  const fill = (key: string) => {
    const m = withSpending.find((x) => x.key === key);
    if (!m) return;
    const fixed = templateFromMonth(m);
    // Keep what's already there; add items the template doesn't have yet.
    const have = new Set(clean.map((i) => i.name.trim().toLowerCase()));
    setItems([...clean, ...fixed.filter((f) => !have.has(f.name.toLowerCase()))]);
  };

  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title={isNew ? "New template" : "Edit template"}
      footer={
        <>
          {onDelete &&
            (confirmDelete ? (
              <Button variant="danger" className="mr-auto" onClick={onDelete}>
                Delete template
              </Button>
            ) : (
              <Button variant="ghost" className="mr-auto" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} /> Delete
              </Button>
            ))}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() =>
              onSave({
                ...initial,
                name: name.trim(),
                items: clean.map((i) => ({ ...i, name: i.name.trim(), amount: i.amount.trim() })),
              })
            }
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="text-[13px] font-medium">Name</span>
          <TextInput data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Monthly bills" />
        </label>

        {withSpending.length > 0 && (
          <label className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-muted">Fill with the fixed items from</span>
            <select
              aria-label="Month to take fixed items from"
              value=""
              onChange={(e) => fill(e.target.value)}
              className="h-8 rounded-md border border-line bg-surface px-2 text-[13px]"
            >
              <option value="" disabled>
                choose a month
              </option>
              {[...withSpending].reverse().map((m) => (
                <option key={m.key} value={m.key}>
                  {monthLabel(m.key)}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid gap-1.5">
          <div className="grid grid-cols-[1fr_96px_64px_32px] gap-2 px-1 text-xs text-muted">
            <span>Item</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Day</span>
            <span />
          </div>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_96px_64px_32px] items-center gap-2">
              <TextInput aria-label={`Item ${i + 1} name`} value={it.name} placeholder="gas bill" onChange={(e) => update(i, { name: e.target.value })} />
              <TextInput
                aria-label={`Item ${i + 1} amount`}
                inputMode="decimal"
                className="num text-right"
                value={it.amount}
                placeholder="0"
                onChange={(e) => update(i, { amount: e.target.value.replace(/[^\d.+]/g, "") })}
              />
              <TextInput
                aria-label={`Item ${i + 1} day of month`}
                type="number"
                min={1}
                max={31}
                className="num text-right"
                value={it.day}
                onChange={(e) => update(i, { day: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
              />
              <button
                type="button"
                aria-label={`Remove ${it.name || "item"}`}
                onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}
                className="grid size-8 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <Button size="sm" variant="ghost" onClick={() => setItems((xs) => [...xs, { name: "", amount: "", day: 1 }])}>
              <Plus size={14} /> Add item
            </Button>
            <span className="num text-[13px] font-semibold">Total {taka(templateTotal({ items: clean }))}</span>
          </div>
        </div>
        <p className="text-xs text-muted">
          Day 31 on a shorter month goes to its last day. Amounts can use + (500+100).
        </p>
      </div>
    </Dialog>
  );
}
