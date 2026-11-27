import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { appendToCell } from "@/core";
import { useData } from "@/state/data";
import { currentRaw, useApplyEdits } from "@/state/edit";
import { todayIn, dayParts, monthLabel } from "@/ui/format";
import { Dialog } from "@/ui/Dialog";
import { Button, TextInput } from "@/ui/controls";
import { LivePreview } from "@/features/expenses/ItemChips";
import { useLivePreview } from "@/features/expenses/preview";

/** "Add expenses" from anywhere: type items, pick a day, Enter. Ctrl/Cmd+K opens it. */
export function QuickEntry() {
  const [open, setOpen] = useState(false);
  const months = useData((s) => s.months);
  const tz = useData((s) => s.workbook?.timeZone);
  const hasData = Object.keys(months).length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && hasData) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasData]);

  if (!hasData) return null;
  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Add expenses"
        title="Add expenses (Ctrl+K)"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Plus size={15} /> <span className="hidden sm:inline">Add expenses</span>
      </Button>
      {open && <QuickEntryDialog onClose={() => setOpen(false)} today={todayIn(tz)} />}
    </>
  );
}

function QuickEntryDialog({ onClose, today }: { onClose: () => void; today: string }) {
  const months = useData((s) => s.months);
  const apply = useApplyEdits();
  const dates = useMemo(
    () => new Set(Object.values(months).flatMap((m) => m.days.map((d) => d.date))),
    [months],
  );
  const firstDate = [...dates].sort()[0] ?? today;
  const [date, setDate] = useState(dates.has(today) ? today : firstDate);
  const [text, setText] = useState("");
  const preview = useLivePreview(text);
  const valid = dates.has(date) && preview.items.length > 0;
  const monthKey = date.slice(0, 7);

  const submit = () => {
    if (!valid) return;
    const d = dayParts(date);
    apply(
      [{ monthKey, date, value: appendToCell(currentRaw(monthKey, date), text) }],
      "add expenses",
      `Added ${preview.items.length} item${preview.items.length === 1 ? "" : "s"} to ${d.day} ${monthLabel(monthKey, false)}`,
    );
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Add expenses"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!valid} onClick={submit}>
            Add
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <TextInput
          autoFocus
          data-autofocus
          aria-label="Items"
          className="font-mono"
          placeholder="nasta=60, vara=20+15"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <LivePreview text={text} />
        <label className="flex items-center gap-2 text-[13px]">
          <span className="text-muted">Day</span>
          <input
            type="date"
            value={date}
            min={firstDate}
            max={[...dates].sort().at(-1)}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px]"
          />
          {!dates.has(date) && <span className="text-xs text-danger">Not in the spreadsheet</span>}
        </label>
        <p className="text-xs text-muted">Added after what the day already has. Undo is available right after.</p>
      </div>
    </Dialog>
  );
}
