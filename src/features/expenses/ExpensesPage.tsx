import { useEffect, useState } from "react";
import { ListPlus, Undo2 } from "lucide-react";
import type { MonthSummary } from "@/core";
import { useDayOps, useMonthSummary, useSelectedMonth } from "@/state/month";
import { useData } from "@/state/data";
import { useApplyEdits } from "@/state/edit";
import { DataGate } from "@/features/shell/DataGate";
import { MonthSwitcher } from "@/features/shell/MonthSwitcher";
import { Button, Notice } from "@/ui/controls";
import { taka } from "@/ui/format";
import { useToast } from "@/ui/toast-store";
import { BulkInputDialog } from "./BulkInputDialog";
import { DayRow } from "./DayRow";

export function ExpensesPage() {
  return (
    <DataGate>
      <ExpensesBody />
    </DataGate>
  );
}

function ExpensesBody() {
  const { key, keys, setKey, today } = useSelectedMonth();
  const summary = useMonthSummary(key, today);
  const dayOps = useDayOps(key);
  const apply = useApplyEdits();
  const undoStack = useData((s) => s.undoStack);
  const undo = useData((s) => s.undo);
  const writeError = useData((s) => s.writeError);
  const retry = useData((s) => s.retryFailed);
  const showToast = useToast((s) => s.show);
  const [editing, setEditing] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Ctrl/Cmd+Z undoes the last change when you're not typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        const done = undo();
        if (done) {
          e.preventDefault();
          showToast({ message: `Undid ${done.label}` });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, showToast]);

  if (!key || !summary) return null;
  const lastUndo = undoStack[undoStack.length - 1];
  const defaultDate = today.startsWith(key) ? today : `${key}-01`;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <MonthSwitcher
          value={key}
          options={keys}
          onChange={(k) => {
            setEditing(null);
            setKey(k);
          }}
        />
        <div className="ml-auto flex gap-2">
          {lastUndo && (
            <Button
              variant="ghost"
              onClick={() => {
                const done = undo();
                if (done) showToast({ message: `Undid ${done.label}` });
              }}
              title={`Undo ${lastUndo.label} (Ctrl+Z)`}
            >
              <Undo2 size={15} /> <span className="hidden sm:inline">Undo</span>
            </Button>
          )}
          <Button onClick={() => setBulkOpen(true)}>
            <ListPlus size={15} /> Bulk input
          </Button>
        </div>
      </div>

      {writeError && (
        <Notice tone="danger">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex-1">{writeError} Your edits are kept on this device.</span>
            <Button size="sm" onClick={retry}>
              Retry
            </Button>
          </div>
        </Notice>
      )}

      <SummaryStrip s={summary} pending={dayOps.size} />

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="hidden grid-cols-[72px_1fr_112px_40px] gap-x-3 bg-surface-muted px-3 py-2 text-xs font-medium text-muted md:grid">
          <span>Date</span>
          <span>Items</span>
          <span className="text-right">Total</span>
          <span className="sr-only">Status</span>
        </div>
        <ul aria-label="Days">
          {summary.days.map((d) => (
            <DayRow
              key={d.date}
              day={d}
              op={dayOps.get(d.date)}
              isToday={d.date === today}
              editing={editing === d.date}
              onEdit={() => setEditing(editing === d.date ? null : d.date)}
              onCancel={() => setEditing(null)}
              onSave={(value) => {
                setEditing(null);
                apply([{ monthKey: key, date: d.date, value }], "edit", "Saved");
              }}
            />
          ))}
        </ul>
      </div>

      <BulkInputDialog open={bulkOpen} onClose={() => setBulkOpen(false)} monthKey={key} defaultDate={defaultDate} />
    </div>
  );
}

function SummaryStrip({ s, pending }: { s: MonthSummary; pending: number }) {
  const activeDays = s.days.filter((d) => d.raw.trim()).length;
  const figures: { label: string; value: string; tone?: string }[] = [
    { label: "Spent", value: taka(s.spent) },
    { label: "Daily average", value: taka(Math.round(s.dailyAverage)) },
    { label: "Days with spending", value: `${activeDays} of ${s.daysCounted || s.daysInMonth}` },
    pending
      ? { label: "Waiting to sync", value: String(pending), tone: "text-warning" }
      : { label: "Rows to check", value: String(s.warningDays), tone: s.warningDays ? "text-warning" : "" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {figures.map((f) => (
        <div key={f.label} className="rounded-xl border border-line bg-surface px-4 py-3">
          <dt className="text-xs text-muted">{f.label}</dt>
          <dd className={`num mt-0.5 text-lg font-semibold ${f.tone ?? ""}`}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
