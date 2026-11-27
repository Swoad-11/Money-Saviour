import { round2 } from "./parse";
import type { MonthSummary } from "./summarize";

export interface CategoryChange {
  categoryId: string;
  total: number;
  share: number;
  previous: number | null;
  /** total - previous; null when there is no previous month. */
  change: number | null;
}

/** Category totals for a month, with the change against the previous month. */
export function compareCategories(cur: MonthSummary, prev: MonthSummary | null): CategoryChange[] {
  const prevMap = new Map(prev?.byCategory.map((c) => [c.categoryId, c.total]) ?? []);
  return cur.byCategory.map((c) => {
    const p = prev ? (prevMap.get(c.categoryId) ?? 0) : null;
    return { categoryId: c.categoryId, total: c.total, share: c.share, previous: p, change: p === null ? null : round2(c.total - p) };
  });
}

/** Running total per day of month: [day1, day1+day2, …]. Days after `upToDay` are null. */
export function cumulative(s: MonthSummary, upToDay?: number): (number | null)[] {
  let run = 0;
  return s.days.map((d, i) => {
    run = round2(run + d.total);
    return upToDay !== undefined && i + 1 > upToDay ? null : run;
  });
}

/**
 * Spent in the previous month up to the same day of month, so a part-way current
 * month is compared like for like.
 */
export function spentToDay(s: MonthSummary, day: number): number {
  return round2(s.days.slice(0, day).reduce((sum, d) => sum + d.total, 0));
}

export interface YearSummary {
  total: number;
  /** Average over months that are complete or in progress with spending. */
  monthlyAverage: number;
  highest: MonthSummary | null;
  lowest: MonthSummary | null;
  /** Months counted in the average (have spending and are not in the future). */
  counted: number;
}

/**
 * `complete` months only feed highest/lowest/average, so a part-way current month
 * doesn't show up as the "lowest".
 */
export function summarizeYear(months: MonthSummary[], currentKey: string): YearSummary {
  const total = round2(months.reduce((s, m) => s + m.spent, 0));
  const complete = months.filter((m) => m.key < currentKey && m.spent > 0);
  const sorted = [...complete].sort((a, b) => a.spent - b.spent);
  return {
    total,
    monthlyAverage: complete.length ? round2(complete.reduce((s, m) => s + m.spent, 0) / complete.length) : 0,
    highest: sorted.at(-1) ?? null,
    lowest: sorted[0] ?? null,
    counted: complete.length,
  };
}

/** Category × month totals for the trend table. */
export function categoryMatrix(months: MonthSummary[]) {
  const ids = new Map<string, number>();
  for (const m of months) for (const c of m.byCategory) ids.set(c.categoryId, (ids.get(c.categoryId) ?? 0) + c.total);
  const order = [...ids.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const max = Math.max(0, ...months.flatMap((m) => m.byCategory.map((c) => c.total)));
  return {
    max,
    rows: order.map((id) => ({
      categoryId: id,
      total: round2(ids.get(id) ?? 0),
      cells: months.map((m) => m.byCategory.find((c) => c.categoryId === id)?.total ?? 0),
    })),
  };
}

/** Biggest single days of a month. */
export function topDays(s: MonthSummary, n = 3) {
  return [...s.days].filter((d) => d.total > 0).sort((a, b) => b.total - a.total).slice(0, n);
}

/** Fixed items in a month, grouped by item name. */
export function fixedItems(s: MonthSummary) {
  const map = new Map<string, { name: string; total: number }>();
  for (const d of s.days)
    for (const i of d.items)
      if (i.kind === "fixed") {
        const e = map.get(i.key) ?? { name: i.name, total: 0 };
        e.total = round2(e.total + i.amount);
        map.set(i.key, e);
      }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
