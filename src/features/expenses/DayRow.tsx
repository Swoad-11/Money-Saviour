import { AlertTriangle, CloudUpload, Pencil, TriangleAlert, XCircle } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { DaySummary } from "@/core";
import type { OutboxOp } from "@/data/db";
import { useData } from "@/state/data";
import { Button } from "@/ui/controls";
import { dayParts, taka } from "@/ui/format";
import { DayEditor } from "./DayEditor";
import { ItemChips } from "./ItemChips";

export function DayRow({
  day,
  op,
  isToday,
  editing,
  onEdit,
  onSave,
  onCancel,
}: {
  day: DaySummary;
  op?: OutboxOp;
  isToday: boolean;
  editing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const { day: dd, weekday } = dayParts(day.date);
  const label = `${dd} ${weekday}`;

  const moveFocus = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const rows = [...document.querySelectorAll<HTMLButtonElement>("[data-day-row]")];
    const i = rows.indexOf(e.currentTarget);
    rows[e.key === "ArrowDown" ? i + 1 : i - 1]?.focus();
  };

  return (
    <li className={`border-t border-line first:border-t-0 ${isToday ? "bg-primary-soft/50" : ""}`}>
      <button
        type="button"
        data-day-row
        onClick={onEdit}
        onKeyDown={moveFocus}
        aria-expanded={editing}
        aria-label={`${label}: ${day.raw ? `${day.items.length} items, ${taka(day.total)}` : "no expenses"}. Edit`}
        className="group grid w-full grid-cols-[56px_1fr_auto] items-start gap-x-3 px-3 py-2 text-left hover:bg-surface-muted/60 focus-visible:bg-surface-muted/60 md:grid-cols-[72px_1fr_112px_40px]"
      >
        <span className="pt-0.5 whitespace-nowrap">
          <span className="num font-medium">{dd}</span> <span className="text-xs text-muted">{weekday}</span>
        </span>
        <span className="min-w-0">
          {day.items.length ? (
            <ItemChips items={day.items} />
          ) : (
            <span className="inline-flex items-center gap-1.5 pt-0.5 text-xs text-muted">
              {day.raw ? day.raw : "No expenses"}
              <Pencil size={12} className="opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </span>
          )}
        </span>
        <span className="num pt-0.5 text-right font-medium">{day.raw ? taka(day.total) : ""}</span>
        <span className="col-start-3 row-start-1 hidden justify-center pt-0.5 md:col-start-4 md:flex">
          <RowStatus day={day} op={op} />
        </span>
      </button>

      {/* Phone: status sits under the row */}
      {(op || day.warnings.length > 0) && (
        <div className="px-3 pb-1 md:hidden">
          <RowStatus day={day} op={op} withText />
        </div>
      )}

      {op?.state === "conflict" && <ConflictPanel op={op} />}
      {op?.state === "failed" && <FailedPanel op={op} />}

      {editing && (
        <div className="px-3 pb-3">
          <DayEditor initial={day.raw} onSave={onSave} onCancel={onCancel} />
        </div>
      )}
    </li>
  );
}

function RowStatus({ day, op, withText = false }: { day: DaySummary; op?: OutboxOp; withText?: boolean }) {
  let icon = null;
  let text = "";
  let tone = "text-muted";
  if (op?.state === "conflict") {
    icon = <TriangleAlert size={15} aria-hidden />;
    text = "Changed in the sheet too";
    tone = "text-danger";
  } else if (op?.state === "failed") {
    icon = <XCircle size={15} aria-hidden />;
    text = "Not saved to the sheet";
    tone = "text-danger";
  } else if (op) {
    icon = <CloudUpload size={15} aria-hidden />;
    text = op.attempts > 0 ? "Waiting to sync (offline?)" : "Saving to the sheet…";
  } else if (day.warnings.length) {
    icon = <AlertTriangle size={15} aria-hidden />;
    text = day.warnings.map((w) => w.message).join(" · ");
    tone = "text-warning";
  }
  if (!icon) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${tone}`} title={text}>
      {icon}
      {withText ? text : <span className="sr-only">{text}</span>}
    </span>
  );
}

function ConflictPanel({ op }: { op: OutboxOp }) {
  const resolve = useData((s) => s.resolveConflict);
  return (
    <div role="alert" className="mx-3 mb-3 grid gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3 text-[13px]">
      <p className="font-medium">This day was changed in the spreadsheet after the app loaded it.</p>
      <dl className="grid gap-1 sm:grid-cols-[110px_1fr]">
        <dt className="text-muted">In the sheet</dt>
        <dd className="font-mono break-words">{op.sheetRaw || "(empty)"}</dd>
        <dt className="text-muted">Your edit</dt>
        <dd className="font-mono break-words">{op.value || "(empty)"}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="primary" onClick={() => resolve(op.id, "mine")}>
          Keep mine
        </Button>
        <Button size="sm" onClick={() => resolve(op.id, "sheet")}>
          Keep the sheet's
        </Button>
      </div>
    </div>
  );
}

function FailedPanel({ op }: { op: OutboxOp }) {
  const retry = useData((s) => s.retryFailed);
  const discard = useData((s) => s.discardOp);
  return (
    <div role="alert" className="mx-3 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3 text-[13px]">
      <span className="flex-1">{op.error ?? "This edit couldn't be saved."}</span>
      <Button size="sm" onClick={retry}>
        Retry
      </Button>
      <Button size="sm" variant="ghost" onClick={() => discard(op.id)}>
        Discard
      </Button>
    </div>
  );
}
