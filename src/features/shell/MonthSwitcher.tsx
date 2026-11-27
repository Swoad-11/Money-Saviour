import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel } from "@/ui/format";

export function MonthSwitcher({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (key: string) => void;
}) {
  const i = options.indexOf(value);
  const prev = options[i - 1];
  const next = options[i + 1];
  const btn =
    "grid size-9 place-items-center rounded-lg border border-line bg-surface text-muted hover:text-ink disabled:opacity-40 disabled:hover:text-muted";
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={btn} disabled={!prev} onClick={() => prev && onChange(prev)} aria-label="Previous month">
        <ChevronLeft size={16} />
      </button>
      <select
        aria-label="Month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-ink"
      >
        {options.map((k) => (
          <option key={k} value={k}>
            {monthLabel(k)}
          </option>
        ))}
      </select>
      <button type="button" className={btn} disabled={!next} onClick={() => next && onChange(next)} aria-label="Next month">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
