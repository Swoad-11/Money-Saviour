import type { MonthSummary } from "./summarize";
import type { Category } from "./types";

/**
 * Quote a CSV field. Text starting with = + - @ (or a tab/CR) is prefixed with an
 * apostrophe so spreadsheet apps show it instead of running it as a formula.
 */
export function csvField(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  let s = v;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n";
}

/** One row per item, for the given months, oldest first. */
export function itemsCsv(months: MonthSummary[], categoryName: (id: string) => string): string {
  const rows: (string | number | null)[][] = [["Date", "Month", "Item", "Amount", "Category", "Kind", "Day total", "Day text"]];
  for (const m of months)
    for (const d of m.days)
      for (const i of d.items)
        rows.push([d.date, m.key, i.name, i.amount, categoryName(i.categoryId), i.kind, d.total, d.raw]);
  return toCsv(rows);
}

/** One row per month with totals by category: handy for charts in a spreadsheet. */
export function monthsCsv(months: MonthSummary[], categories: Pick<Category, "id" | "name">[]): string {
  const used = categories.filter((c) => months.some((m) => m.byCategory.some((b) => b.categoryId === c.id)));
  const rows: (string | number | null)[][] = [["Month", "Spent", "Fixed", "Variable", ...used.map((c) => c.name)]];
  for (const m of months) {
    const by = new Map(m.byCategory.map((b) => [b.categoryId, b.total]));
    rows.push([m.key, m.spent, m.fixed, m.variable, ...used.map((c) => by.get(c.id) ?? 0)]);
  }
  return toCsv(rows);
}
