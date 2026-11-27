import { AlertTriangle } from "lucide-react";
import type { DaySummary, MonthSummary } from "@/core";
import { categoryById, useMonthSummary, useSelectedMonth } from "@/state/month";
import { DataGate } from "@/features/shell/DataGate";
import { MonthSwitcher } from "@/features/shell/MonthSwitcher";
import { categoryColor, dayParts, taka } from "@/ui/format";

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
  if (!key || !summary) return null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSwitcher value={key} options={keys} onChange={setKey} />
        <p className="text-xs text-muted">Read-only for now. Editing arrives in the next update.</p>
      </div>
      <SummaryStrip s={summary} />
      <DayTable days={summary.days} today={today} />
    </div>
  );
}

function SummaryStrip({ s }: { s: MonthSummary }) {
  const activeDays = s.days.filter((d) => d.raw.trim()).length;
  const figures: { label: string; value: string; tone?: string }[] = [
    { label: "Spent", value: taka(s.spent) },
    { label: "Daily average", value: taka(Math.round(s.dailyAverage)) },
    { label: "Days with spending", value: `${activeDays} of ${s.daysCounted || s.daysInMonth}` },
    {
      label: "Rows to check",
      value: String(s.warningDays),
      tone: s.warningDays ? "text-warning" : "",
    },
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

function ItemChips({ day }: { day: DaySummary }) {
  return (
    <div className="flex flex-wrap gap-1">
      {day.items.map((item, i) => {
        const cat = categoryById(item.categoryId);
        return (
          <span
            key={i}
            title={`${cat.name} · ${item.kind}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-muted py-0.5 pr-1.5 pl-1 text-xs"
          >
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: categoryColor(cat) }} />
            <span className="text-ink">{item.name}</span>
            <span className="num text-muted">{item.amount.toLocaleString("en-IN")}</span>
            <span className="sr-only">, {cat.name}</span>
          </span>
        );
      })}
    </div>
  );
}

function Warnings({ day }: { day: DaySummary }) {
  if (!day.warnings.length) return null;
  return (
    <span title={day.warnings.map((w) => w.message).join("\n")} className="inline-flex text-warning">
      <AlertTriangle size={15} aria-hidden />
      <span className="sr-only">{day.warnings.map((w) => w.message).join(". ")}</span>
    </span>
  );
}

function DayTable({ days, today }: { days: DaySummary[]; today: string }) {
  return (
    <>
      {/* Desktop and tablet: compact table */}
      <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
        <table className="w-full border-collapse text-[13px]">
          <thead className="bg-surface-muted text-left text-xs text-muted">
            <tr>
              <th scope="col" className="w-20 px-3 py-2 font-medium">Date</th>
              <th scope="col" className="px-3 py-2 font-medium">Items</th>
              <th scope="col" className="w-28 px-3 py-2 text-right font-medium">Total</th>
              <th scope="col" className="w-10 px-2 py-2"><span className="sr-only">Status</span></th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const { day, weekday } = dayParts(d.date);
              const isToday = d.date === today;
              return (
                <tr key={d.date} className={`border-t border-line align-top ${isToday ? "bg-primary-soft/60" : ""}`}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="num font-medium">{day}</span>{" "}
                    <span className="text-xs text-muted">{weekday}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    {d.items.length ? <ItemChips day={d} /> : <span className="text-xs text-muted">No expenses</span>}
                  </td>
                  <td className="num px-3 py-2 text-right font-medium">{d.raw ? taka(d.total) : ""}</td>
                  <td className="px-2 py-2 text-center"><Warnings day={d} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phone: day cards, empty days collapsed */}
      <ul className="grid gap-2 md:hidden">
        {days
          .filter((d) => d.raw || d.date === today)
          .map((d) => {
            const { day, weekday } = dayParts(d.date);
            return (
              <li key={d.date} className="rounded-xl border border-line bg-surface p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="num font-semibold">{day}</span>
                  <span className="text-xs text-muted">{weekday}</span>
                  <Warnings day={d} />
                  <span className="num ml-auto font-semibold">{d.raw ? taka(d.total) : ""}</span>
                </div>
                {d.items.length ? <ItemChips day={d} /> : <span className="text-xs text-muted">No expenses yet</span>}
              </li>
            );
          })}
      </ul>
    </>
  );
}
