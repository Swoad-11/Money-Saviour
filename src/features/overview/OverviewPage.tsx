import { lazy, Suspense, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CloudUpload, Tags } from "lucide-react";
import {
  appendToCell,
  compareCategories,
  fixedItems,
  spentToDay,
  topDays,
  UNCATEGORIZED,
  type MonthSummary,
} from "@/core";
import { categoryById, useAllSummaries, useDayOps, useSelectedMonth } from "@/state/month";
import { currentRaw, useApplyEdits } from "@/state/edit";
import { DataGate } from "@/features/shell/DataGate";
import { MonthSwitcher } from "@/features/shell/MonthSwitcher";
import { LivePreview } from "@/features/expenses/ItemChips";
import { useLivePreview } from "@/features/expenses/preview";
import { Card } from "@/ui/Card";
import { StatTile } from "@/ui/StatTile";
import { Button, TextInput } from "@/ui/controls";
import { categoryColor, dayParts, monthLabel, taka } from "@/ui/format";
// Charts (and Chart.js) load after the figures, so the numbers show first.
const DailyChart = lazy(() => import("./charts").then((m) => ({ default: m.DailyChart })));
const PaceChart = lazy(() => import("./charts").then((m) => ({ default: m.PaceChart })));
const ChartSpace = ({ h }: { h: number }) => <div style={{ height: h }} className="animate-pulse rounded-lg bg-surface-muted" />;

export function OverviewPage() {
  return (
    <DataGate>
      <OverviewBody />
    </DataGate>
  );
}

function OverviewBody() {
  const { key, keys, setKey, today } = useSelectedMonth();
  const all = useAllSummaries(today);
  const i = all.findIndex((m) => m.key === key);
  const s = all[i];
  const prev = i > 0 ? (all[i - 1] ?? null) : null;
  if (!key || !s) return null;
  const isCurrent = today.startsWith(key);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <MonthSwitcher value={key} options={keys} onChange={setKey} />
        <span className="text-xs text-muted">
          {isCurrent ? `Day ${s.daysCounted} of ${s.daysInMonth}` : s.spent ? "Complete month" : "No spending yet"}
        </span>
      </div>

      <Calculator s={s} prev={prev} isCurrent={isCurrent} />
      {isCurrent && <QuickAdd monthKey={key} date={today} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Daily spending" className="lg:col-span-2">
          <Suspense fallback={<ChartSpace h={220} />}>
            <DailyChart s={s} />
          </Suspense>
        </Card>
        <Card title="By category" className="lg:row-span-2">
          <CategoryBreakdown s={s} prev={prev} />
        </Card>
        <Card title={prev ? "Running total vs last month" : "Running total"} className="lg:col-span-2">
          <Suspense fallback={<ChartSpace h={224} />}>
            <PaceChart s={s} prev={prev} today={today} />
          </Suspense>
        </Card>
        <Card title="Fixed and variable">
          <FixedVariable s={s} />
        </Card>
        <Card title="Biggest days">
          <BiggestDays s={s} />
        </Card>
        <Card title="Needs attention">
          <Attention s={s} monthKey={key} />
        </Card>
      </div>
    </div>
  );
}

/** The month's headline numbers. */
function Calculator({ s, prev, isCurrent }: { s: MonthSummary; prev: MonthSummary | null; isCurrent: boolean }) {
  // Compare like for like: the previous month up to the same day.
  const prevSameDay = prev ? spentToDay(prev, isCurrent ? s.daysCounted : prev.daysInMonth) : null;
  const diff = prevSameDay === null ? null : s.spent - prevSameDay;
  const fixedShare = s.spent ? Math.round((s.fixed / s.spent) * 100) : 0;
  const biggest = topDays(s, 1)[0];

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        emphasis
        label={isCurrent ? "Spent so far" : "Spent"}
        value={taka(s.spent)}
        tone={diff === null ? "muted" : diff > 0 ? "bad" : "good"}
        note={
          diff === null ? undefined : (
            <span className="inline-flex items-center gap-1">
              {diff > 0 ? <ArrowUpRight size={13} aria-hidden /> : <ArrowDownRight size={13} aria-hidden />}
              {taka(Math.abs(diff))} {diff > 0 ? "more" : "less"} than {monthLabel(prev!.key, false).split(" ")[0]}
              {isCurrent ? " by this day" : ""}
            </span>
          )
        }
      />
      <StatTile label="Daily average" value={taka(Math.round(s.dailyAverage))} note={`over ${s.daysCounted || s.daysInMonth} days`} />
      {isCurrent ? (
        <StatTile label="Projected month-end" value={taka(Math.round(s.projected))} note="at the current daily average" />
      ) : (
        <StatTile
          label="Biggest day"
          value={biggest ? taka(biggest.total) : "—"}
          note={biggest ? `${dayParts(biggest.date).weekday} ${dayParts(biggest.date).day}` : undefined}
        />
      )}
      <StatTile label="Fixed costs" value={taka(s.fixed)} note={`${fixedShare}% of spending`} />
    </dl>
  );
}

/** Calculator-style entry for today, right on the overview. */
function QuickAdd({ monthKey, date }: { monthKey: string; date: string }) {
  const [text, setText] = useState("");
  const apply = useApplyEdits();
  const preview = useLivePreview(text);
  const add = () => {
    if (!preview.items.length) return;
    apply(
      [{ monthKey, date, value: appendToCell(currentRaw(monthKey, date), text) }],
      "add expenses",
      `Added ${taka(preview.total)} to today`,
    );
    setText("");
  };
  return (
    <div className="grid gap-2 rounded-xl border border-line bg-surface p-3">
      <div className="flex gap-2">
        <TextInput
          aria-label="Add expenses for today"
          className="font-mono"
          placeholder="Add today's expenses: nasta=60, vara=20+15"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button variant="primary" onClick={add} disabled={!preview.items.length}>
          Add
        </Button>
      </div>
      <LivePreview text={text} prefix="+" />
    </div>
  );
}

/** Ranked bars, one hue; the dot beside each name carries the category's identity. */
function CategoryBreakdown({ s, prev }: { s: MonthSummary; prev: MonthSummary | null }) {
  const rows = useMemo(() => compareCategories(s, prev), [s, prev]);
  const max = Math.max(1, ...rows.map((r) => r.total));
  if (!rows.length) return <p className="text-[13px] text-muted">No spending this month yet.</p>;
  return (
    <ul className="grid gap-2.5">
      {rows.map((r) => {
        const cat = categoryById(r.categoryId);
        return (
          <li key={r.categoryId} className="grid gap-1">
            <div className="flex items-baseline gap-2 text-[13px]">
              <span aria-hidden className="size-2 shrink-0 translate-y-[-1px] rounded-full" style={{ background: categoryColor(cat) }} />
              <span className="min-w-0 flex-1 truncate">
                {r.categoryId === UNCATEGORIZED ? <Link to="/categories" className="underline-offset-2 hover:underline">{cat.name}</Link> : cat.name}
              </span>
              <span className="num font-medium">{taka(r.total)}</span>
              <span className="num w-9 text-right text-xs text-muted">{Math.round(r.share * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-surface-muted">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(r.total / max) * 100}%` }} />
              </div>
              {r.change !== null && r.change !== 0 && (
                <span className={`num w-20 text-right text-[11px] ${r.change > 0 ? "text-danger" : "text-primary"}`}>
                  {r.change > 0 ? "+" : "−"}
                  {Math.abs(Math.round(r.change)).toLocaleString("en-IN")}
                </span>
              )}
              {(r.change === null || r.change === 0) && <span className="w-20" />}
            </div>
          </li>
        );
      })}
      {prev && <li className="pt-1 text-[11px] text-muted">Change is against {monthLabel(prev.key)}.</li>}
    </ul>
  );
}

function FixedVariable({ s }: { s: MonthSummary }) {
  const items = fixedItems(s).slice(0, 5);
  const fixedPct = s.spent ? (s.fixed / s.spent) * 100 : 0;
  return (
    <div className="grid gap-3">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`Fixed ${taka(s.fixed)}, variable ${taka(s.variable)}`}>
        {s.fixed > 0 && <div className="h-2 rounded-full" style={{ width: `${fixedPct}%`, background: "var(--cat-0)" }} />}
        {s.variable > 0 && <div className="h-2 flex-1 rounded-full" style={{ background: "var(--cat-1)" }} />}
      </div>
      <dl className="grid grid-cols-2 gap-2 text-[13px]">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-muted">
            <span aria-hidden className="size-2 rounded-sm" style={{ background: "var(--cat-0)" }} /> Fixed
          </dt>
          <dd className="num font-semibold">{taka(s.fixed)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-muted">
            <span aria-hidden className="size-2 rounded-sm" style={{ background: "var(--cat-1)" }} /> Variable
          </dt>
          <dd className="num font-semibold">{taka(s.variable)}</dd>
        </div>
      </dl>
      {items.length > 0 && (
        <ul className="grid gap-1 border-t border-line pt-2 text-[13px]">
          {items.map((i) => (
            <li key={i.name} className="flex justify-between gap-2">
              <span className="truncate text-muted">{i.name}</span>
              <span className="num">{taka(i.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BiggestDays({ s }: { s: MonthSummary }) {
  const days = topDays(s, 3);
  if (!days.length) return <p className="text-[13px] text-muted">No spending yet.</p>;
  return (
    <ul className="grid gap-2">
      {days.map((d) => {
        const p = dayParts(d.date);
        const top = [...d.items].sort((a, b) => b.amount - a.amount)[0];
        return (
          <li key={d.date} className="flex items-baseline gap-3 text-[13px]">
            <span className="num w-14 shrink-0">
              {p.day} <span className="text-xs text-muted">{p.weekday}</span>
            </span>
            <span className="min-w-0 flex-1 truncate text-muted">{top ? `${top.name} ${taka(top.amount)}` : ""}</span>
            <span className="num font-semibold">{taka(d.total)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Attention({ s, monthKey }: { s: MonthSummary; monthKey: string }) {
  const ops = useDayOps(monthKey);
  const unsynced = [...ops.values()];
  const failed = unsynced.filter((o) => o.state !== "pending").length;
  const uncTotal = s.uncategorized.reduce((sum, u) => sum + u.total, 0);
  const items = [
    s.uncategorized.length > 0 && {
      icon: <Tags size={15} aria-hidden />,
      text: `${s.uncategorized.length} item name${s.uncategorized.length === 1 ? "" : "s"} uncategorized (${taka(uncTotal)})`,
      to: "/categories",
    },
    s.warningDays > 0 && {
      icon: <AlertTriangle size={15} aria-hidden className="text-warning" />,
      text: `${s.warningDays} day${s.warningDays === 1 ? "" : "s"} where items don't add up to the sheet total`,
      to: `/expenses?m=${monthKey}`,
    },
    unsynced.length > 0 && {
      icon: <CloudUpload size={15} aria-hidden className={failed ? "text-danger" : ""} />,
      text: failed ? `${failed} edit${failed === 1 ? "" : "s"} need your attention` : `${unsynced.length} edit${unsynced.length === 1 ? "" : "s"} waiting to sync`,
      to: `/expenses?m=${monthKey}`,
    },
  ].filter(Boolean) as { icon: ReactNode; text: string; to: string }[];

  if (!items.length) return <p className="text-[13px] text-muted">All clear: everything is categorized and synced.</p>;
  return (
    <ul className="grid gap-2">
      {items.map((i) => (
        <li key={i.text}>
          <Link to={i.to} className="flex items-start gap-2 text-[13px] hover:underline">
            <span className="pt-0.5 text-muted">{i.icon}</span>
            {i.text}
          </Link>
        </li>
      ))}
    </ul>
  );
}
