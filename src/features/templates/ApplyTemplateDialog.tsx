import { useMemo, useState } from "react";
import { previewTemplate, templateChanges, type Template } from "@/core";
import { useConnection } from "@/state/connection";
import { useData, withPending, sortedMonths } from "@/state/data";
import { useApplyEdits } from "@/state/edit";
import { Dialog } from "@/ui/Dialog";
import { Button } from "@/ui/controls";
import { dayParts, monthLabel, taka } from "@/ui/format";

export function ApplyTemplateDialog({
  template,
  defaultMonth,
  onClose,
}: {
  template: Template;
  defaultMonth: string;
  onClose: () => void;
}) {
  const months = useData((s) => s.months);
  const ops = useData((s) => s.ops);
  const source = useConnection((s) => s.source);
  const apply = useApplyEdits();
  const keys = sortedMonths(months).map((m) => m.key);
  const [monthKey, setMonthKey] = useState(keys.includes(defaultMonth) ? defaultMonth : (keys.at(-1) ?? ""));

  const month = useMemo(() => (months[monthKey] ? withPending(months[monthKey], ops, source) : null), [months, monthKey, ops, source]);
  const rows = useMemo(() => (month ? previewTemplate(template, month) : []), [template, month]);
  const [chosen, setChosen] = useState<Set<number> | null>(null);
  // Default: everything new is ticked; items already there are not.
  const selected = chosen ?? new Set(rows.filter((r) => r.status === "new").map((r) => r.index));
  const total = rows.filter((r) => selected.has(r.index) && r.status !== "invalid").reduce((s, r) => s + r.amount, 0);

  const toggle = (i: number) => {
    const n = new Set(selected);
    if (n.has(i)) n.delete(i);
    else n.add(i);
    setChosen(n);
  };

  const submit = () => {
    if (!month) return;
    const changes = templateChanges(rows, month, selected).map((c) => ({ monthKey, ...c }));
    const count = rows.filter((r) => selected.has(r.index) && r.status !== "invalid").length;
    apply(changes, `template "${template.name}"`, `Added ${count} item${count === 1 ? "" : "s"} from "${template.name}" to ${monthLabel(monthKey)}`);
    onClose();
  };

  const count = rows.filter((r) => selected.has(r.index) && r.status !== "invalid").length;
  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title={`Apply "${template.name}"`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!count} onClick={submit}>
            Add {count} item{count === 1 ? "" : "s"} · {taka(total)}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className="flex items-center gap-2 text-[13px]">
          <span className="text-muted">Month</span>
          <select
            aria-label="Month to apply the template to"
            value={monthKey}
            onChange={(e) => {
              setMonthKey(e.target.value);
              setChosen(null);
            }}
            className="h-8 rounded-md border border-line bg-surface px-2 text-[13px] font-medium"
          >
            {keys.map((k) => (
              <option key={k} value={k}>
                {monthLabel(k)}
              </option>
            ))}
          </select>
        </label>

        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-[13px]">
            <thead className="bg-surface-muted text-left text-xs text-muted">
              <tr>
                <th className="w-10 px-3 py-1.5">
                  <span className="sr-only">Include</span>
                </th>
                <th className="px-3 py-1.5 font-medium">Item</th>
                <th className="px-3 py-1.5 font-medium">Day</th>
                <th className="px-3 py-1.5 text-right font-medium">Amount</th>
                <th className="px-3 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = r.date ? dayParts(r.date) : null;
                return (
                  <tr key={r.index} className="border-t border-line">
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox"
                        aria-label={`Include ${r.item.name || "item"}`}
                        disabled={r.status === "invalid"}
                        checked={selected.has(r.index) && r.status !== "invalid"}
                        onChange={() => toggle(r.index)}
                        className="size-4 accent-[var(--ms-primary)]"
                      />
                    </td>
                    <td className="px-3 py-1.5 font-medium">{r.item.name || "—"}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{d ? `${d.day} ${d.weekday}` : "—"}</td>
                    <td className="num px-3 py-1.5 text-right">{taka(r.amount)}</td>
                    <td className="px-3 py-1.5 text-xs">
                      {r.status === "present" ? (
                        <span className="text-muted">Already on this day</span>
                      ) : r.status === "invalid" ? (
                        <span className="text-danger">{r.note}</span>
                      ) : (
                        <span className="text-primary">New{r.note ? ` · ${r.note}` : ""}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          Items are added after what each day already has, and the whole template can be undone in one step.
        </p>
      </div>
    </Dialog>
  );
}
