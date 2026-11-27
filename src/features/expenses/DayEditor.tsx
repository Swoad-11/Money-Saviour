import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { findRule, normalizeName, parseCell, serializeCell, toEditable, UNCATEGORIZED, type EditableItem } from "@/core";
import { categoryById } from "@/state/month";
import { useConfig } from "@/state/config";
import { useToast } from "@/ui/toast-store";
import { Button, TextInput } from "@/ui/controls";
import { categoryColor } from "@/ui/format";
import { LivePreview } from "./ItemChips";

type Mode = "text" | "items";

/**
 * Edit one day's Expenses cell, either as raw text (exactly what goes in column B)
 * or item by item. Both produce the same cell text.
 */
export function DayEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState(initial);
  const [items, setItems] = useState<EditableItem[]>(() => toEditable(parseCell(initial).items));

  const switchTo = (m: Mode) => {
    if (m === mode) return;
    if (m === "items") setItems(toEditable(parseCell(text).items));
    else setText(serializeCell(items));
    setMode(m);
  };
  const value = mode === "text" ? text.trim() : serializeCell(items);
  const save = () => onSave(value);

  return (
    <div
      className="grid gap-3 rounded-lg border border-primary/40 bg-surface p-3"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <div role="tablist" aria-label="Edit as" className="flex w-fit rounded-lg bg-surface-muted p-0.5 text-xs">
        {(["text", "items"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchTo(m)}
            className={`rounded-md px-2.5 py-1 font-medium ${mode === m ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
          >
            {m === "text" ? "Text" : "Items"}
          </button>
        ))}
      </div>

      {mode === "text" ? (
        <>
          <textarea
            autoFocus
            aria-label="Expenses for this day"
            value={text}
            rows={Math.min(4, Math.max(1, Math.ceil(text.length / 70)))}
            placeholder="nasta=60, vara=20"
            spellCheck={false}
            onChange={(e) => setText(e.target.value.replace(/\n/g, " "))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                save();
              }
            }}
            className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[13px] focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none"
          />
          <LivePreview text={text} />
        </>
      ) : (
        <ItemList items={items} onChange={setItems} onSubmit={save} />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" onClick={save} disabled={value === initial.trim()}>
          Save
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <span className="ml-auto hidden text-xs text-muted sm:inline">Enter to save · Esc to cancel</span>
      </div>
    </div>
  );
}

function ItemList({
  items,
  onChange,
  onSubmit,
}: {
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
  onSubmit: () => void;
}) {
  const ruleIndex = useConfig((s) => s.index);
  const categories = useConfig((s) => s.categories);
  const setRule = useConfig((s) => s.setRule);
  const showToast = useToast((s) => s.show);
  const update = (i: number, patch: Partial<EditableItem>) =>
    onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const total = parseCell(serializeCell(items)).total;

  return (
    <div className="grid gap-1.5">
      <div className="hidden grid-cols-[1fr_120px_140px_32px] gap-2 px-1 text-xs text-muted sm:grid">
        <span>Item</span>
        <span className="text-right">Amount</span>
        <span>Category</span>
        <span />
      </div>
      {items.map((it, i) => {
        const rule = findRule(ruleIndex, normalizeName(it.name));
        const cat = categoryById(rule?.categoryId ?? UNCATEGORIZED);
        return (
          <div key={i} className="grid grid-cols-[1fr_96px_32px] items-center gap-2 sm:grid-cols-[1fr_120px_140px_32px]">
            <TextInput
              aria-label={`Item ${i + 1} name`}
              value={it.name}
              autoFocus={i === items.length - 1 && !it.name}
              onChange={(e) => update(i, { name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
            <TextInput
              aria-label={`Item ${i + 1} amount`}
              inputMode="decimal"
              className="num text-right"
              value={it.amountExpr}
              placeholder="0"
              onChange={(e) => update(i, { amountExpr: e.target.value.replace(/[^\d.+]/g, "") })}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
            <label className="hidden items-center gap-1.5 sm:flex">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: categoryColor(cat) }} />
              <select
                aria-label={`Category for ${it.name || "item"}`}
                disabled={!normalizeName(it.name)}
                value={cat.id}
                onChange={(e) => {
                  const next = categoryById(e.target.value);
                  setRule(it.name, next.id);
                  showToast({ message: `Rule saved: "${normalizeName(it.name)}" is now ${next.name}, in every month` });
                }}
                className="h-8 w-full min-w-0 rounded-md border border-line bg-surface px-1.5 text-xs text-ink"
              >
                <option value={UNCATEGORIZED}>Uncategorized</option>
                {categories
                  .filter((c) => !c.archived || c.id === cat.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              aria-label={`Remove ${it.name || "item"}`}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="grid size-8 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}
      <div className="flex items-center justify-between pt-1">
        <Button size="sm" variant="ghost" onClick={() => onChange([...items, { name: "", amountExpr: "" }])}>
          <Plus size={14} /> Add item
        </Button>
        <span className="num text-[13px] font-semibold">Total {total.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}
