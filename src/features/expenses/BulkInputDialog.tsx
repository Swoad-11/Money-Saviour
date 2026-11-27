import { useMemo, useState } from "react";
import { appendToCell, groupBulk, parseBulk, parseCell } from "@/core";
import { currentRaw, useApplyEdits } from "@/state/edit";
import { Dialog } from "@/ui/Dialog";
import { Button } from "@/ui/controls";
import { dayParts, monthLabel, taka } from "@/ui/format";

const EXAMPLE = `08 nasta=60, vara=20
09 khabar=240, coke=40
gom=100`;

export function BulkInputDialog({
  open,
  onClose,
  monthKey,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  monthKey: string;
  defaultDate: string;
}) {
  const [text, setText] = useState("");
  const [fallback, setFallback] = useState(defaultDate);
  const apply = useApplyEdits();

  const lines = useMemo(() => parseBulk(text, monthKey, fallback), [text, monthKey, fallback]);
  const grouped = useMemo(() => groupBulk(lines), [lines]);
  const total = [...grouped.values()].reduce((s, t) => s + parseCell(t).total, 0);
  const errors = lines.filter((l) => l.error).length;

  const close = () => {
    setText("");
    onClose();
  };

  const submit = () => {
    const changes = [...grouped].map(([date, add]) => ({
      monthKey,
      date,
      value: appendToCell(currentRaw(monthKey, date), add),
    }));
    apply(changes, "bulk input", `Added to ${changes.length} day${changes.length === 1 ? "" : "s"}`);
    close();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      wide
      title={`Bulk input · ${monthLabel(monthKey)}`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!grouped.size} onClick={submit}>
            Add to {grouped.size} day{grouped.size === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-[13px] text-muted">
          One line per day. Start a line with the day (<code>08</code>) or a full date, or leave it off to use the
          date below. Items are added after what the day already has.
        </p>
        <textarea
          autoFocus
          data-autofocus
          aria-label="Expenses, one line per day"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE}
          rows={6}
          spellCheck={false}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[13px] focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none"
        />
        <label className="flex items-center gap-2 text-[13px]">
          <span className="text-muted">Lines without a date go to</span>
          <input
            type="date"
            value={fallback}
            min={`${monthKey}-01`}
            max={`${monthKey}-31`}
            onChange={(e) => e.target.value && setFallback(e.target.value)}
            className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px]"
          />
        </label>

        {lines.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-muted text-left text-xs text-muted">
                <tr>
                  <th className="px-3 py-1.5 font-medium">Line</th>
                  <th className="px-3 py-1.5 font-medium">Day</th>
                  <th className="px-3 py-1.5 font-medium">Items</th>
                  <th className="px-3 py-1.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const p = parseCell(l.text);
                  const d = l.date ? dayParts(l.date) : null;
                  return (
                    <tr key={l.line} className="border-t border-line align-top">
                      <td className="num px-3 py-1.5 text-muted">{l.line}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">{d ? `${d.day} ${d.weekday}` : "—"}</td>
                      <td className="px-3 py-1.5">
                        {l.error ? (
                          <span className="text-danger">{l.error}</span>
                        ) : (
                          <span className="font-mono text-xs">{l.text}</span>
                        )}
                        {!l.error && p.warnings.map((w, i) => (
                          <span key={i} className="block text-xs text-warning">{w.message}</span>
                        ))}
                      </td>
                      <td className="num px-3 py-1.5 text-right">{l.error ? "" : taka(p.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {lines.length > 0 && (
          <p className="text-[13px]">
            <strong className="num">{taka(total)}</strong> across {grouped.size} day{grouped.size === 1 ? "" : "s"}
            {errors > 0 && <span className="text-danger"> · {errors} line{errors === 1 ? "" : "s"} skipped</span>}
          </p>
        )}
      </div>
    </Dialog>
  );
}
