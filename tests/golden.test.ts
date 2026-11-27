/**
 * Golden test against a private snapshot of the real spreadsheet.
 * The snapshot lives in local-fixtures/ (git-ignored) and is skipped when absent,
 * so CI and other machines run without real data.
 * Format: MonthRecord[] as JSON.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildIndex, parseCell, reconcile, summarizeMonth, BUILTIN_CATEGORIES, BUILTIN_RULES } from "@/core";
import type { MonthRecord } from "@/core";

const file = resolve(__dirname, "../local-fixtures/sheet-2026.json");
const months: MonthRecord[] = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];

/** Cells known to differ from column C, with the reason. Add entries deliberately. */
const ALLOWED_MISMATCH = new Set<string>([]);

describe.skipIf(months.length === 0)("golden: real 2026 sheet", () => {
  const index = buildIndex(BUILTIN_RULES, BUILTIN_CATEGORIES);

  it.each(months.map((m) => [m.tab, m] as const))("%s: every row matches column C", (_tab, m) => {
    const bad = m.days
      .filter((d) => d.raw.trim())
      .filter((d) => !ALLOWED_MISMATCH.has(`${d.date}`))
      .map((d) => ({ d, r: reconcile(parseCell(d.raw), d.raw, d.sheetTotal) }))
      .filter(({ r }) => r.warnings.length)
      .map(({ d, r }) => `${d.date}: ${r.warnings.map((w) => w.message).join("; ")}`);
    expect(bad).toEqual([]);
  });

  it.each(months.map((m) => [m.tab, m] as const))("%s: spent equals the Grand total", (_tab, m) => {
    if (m.sheetGrandTotal === null) return;
    expect(summarizeMonth(m, index, "2026-12-31").spent).toBe(m.sheetGrandTotal);
  });
});
