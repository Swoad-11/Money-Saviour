import { categorize, type RuleIndex } from "./categorize";
import { parseCell, reconcile, round2 } from "./parse";
import {
  UNCATEGORIZED,
  type CategorizedItem,
  type DayRecord,
  type MonthRecord,
  type ParseWarning,
} from "./types";

export interface DaySummary {
  date: string;
  raw: string;
  items: CategorizedItem[];
  /** Column C when present, otherwise the parsed total. */
  total: number;
  parsedTotal: number;
  fixed: number;
  variable: number;
  warnings: ParseWarning[];
}

export interface CategoryTotal {
  categoryId: string;
  total: number;
  share: number;
  count: number;
}

export interface MonthSummary {
  key: string;
  income: number | null;
  spent: number;
  parsedTotal: number;
  remaining: number | null;
  fixed: number;
  variable: number;
  /** Days counted for averages: elapsed days in the current month, else all days. */
  daysCounted: number;
  daysInMonth: number;
  dailyAverage: number;
  projected: number;
  byCategory: CategoryTotal[];
  days: DaySummary[];
  uncategorized: { key: string; name: string; count: number; total: number }[];
  warningDays: number;
}

export function summarizeDay(day: DayRecord, index: RuleIndex): DaySummary {
  const parsed = reconcile(parseCell(day.raw), day.raw, day.sheetTotal);
  const items = parsed.items.map((i) => categorize(i, index));
  const fixed = round2(items.filter((i) => i.kind === "fixed").reduce((s, i) => s + i.amount, 0));
  const total = day.sheetTotal ?? parsed.total;
  return {
    date: day.date,
    raw: day.raw,
    items,
    total,
    parsedTotal: parsed.total,
    fixed,
    // Anything the items don't explain (a sheet/parse mismatch) counts as variable,
    // so fixed + variable always equals the sheet total.
    variable: round2(total - fixed),
    warnings: parsed.warnings,
  };
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m!, 0)).getUTCDate();
}

/** `today` is an ISO date in the sheet's time zone. */
export function summarizeMonth(month: MonthRecord, index: RuleIndex, today: string): MonthSummary {
  const days = month.days.map((d) => summarizeDay(d, index));
  const spent = round2(days.reduce((s, d) => s + d.total, 0));
  const parsedTotal = round2(days.reduce((s, d) => s + d.parsedTotal, 0));
  const fixed = round2(days.reduce((s, d) => s + d.fixed, 0));

  const dim = daysInMonth(month.key);
  const isCurrent = today.startsWith(month.key);
  const isFuture = today < `${month.key}-01`;
  const daysCounted = isFuture ? 0 : isCurrent ? Number(today.slice(8, 10)) : dim;
  const dailyAverage = daysCounted ? round2(spent / daysCounted) : 0;

  const cats = new Map<string, CategoryTotal>();
  const unknown = new Map<string, { key: string; name: string; count: number; total: number }>();
  for (const d of days) {
    for (const i of d.items) {
      const c = cats.get(i.categoryId) ?? { categoryId: i.categoryId, total: 0, share: 0, count: 0 };
      c.total = round2(c.total + i.amount);
      c.count += 1;
      cats.set(i.categoryId, c);
      if (i.categoryId === UNCATEGORIZED) {
        const u = unknown.get(i.key) ?? { key: i.key, name: i.name, count: 0, total: 0 };
        u.count += 1;
        u.total = round2(u.total + i.amount);
        unknown.set(i.key, u);
      }
    }
  }
  const itemsTotal = [...cats.values()].reduce((s, c) => s + c.total, 0);
  const byCategory = [...cats.values()]
    .map((c) => ({ ...c, share: itemsTotal ? c.total / itemsTotal : 0 }))
    .sort((a, b) => b.total - a.total);

  return {
    key: month.key,
    income: month.income,
    spent,
    parsedTotal,
    remaining: month.income === null ? null : round2(month.income - spent),
    fixed,
    variable: round2(spent - fixed),
    daysCounted,
    daysInMonth: dim,
    dailyAverage,
    projected: isCurrent ? round2(dailyAverage * dim) : spent,
    byCategory,
    days,
    uncategorized: [...unknown.values()].sort((a, b) => b.total - a.total),
    warningDays: days.filter((d) => d.warnings.length).length,
  };
}
