import { buildIndex } from "./categorize";
import { BUILTIN_CATEGORIES, BUILTIN_RULES } from "./rules/builtin";
import { summarizeMonth } from "./summarize";
import { categoryMatrix, compareCategories, cumulative, fixedItems, spentToDay, summarizeYear, topDays } from "./analysis";
import { sheetFormulaTotal } from "./parse";
import type { MonthRecord } from "./types";

const index = buildIndex(BUILTIN_RULES, BUILTIN_CATEGORIES);
const month = (key: string, cells: string[]): MonthRecord => ({
  key,
  tab: key,
  income: null,
  sheetGrandTotal: null,
  days: cells.map((raw, i) => ({
    date: `${key}-${String(i + 1).padStart(2, "0")}`,
    rowIndex: i + 2,
    raw,
    sheetTotal: raw ? sheetFormulaTotal(raw) : null,
  })),
});
const sum = (m: MonthRecord, today = "2026-12-31") => summarizeMonth(m, index, today);

const oct = sum(month("2026-10", ["gas bill=1000, nasta=50", "nasta=50", "", "pizza=200"]));
const nov = sum(month("2026-11", ["gas bill=1100", "nasta=80", "nasta=20, net bill=500"]), "2026-11-03");

describe("analysis", () => {
  it("compares categories with the previous month", () => {
    const c = compareCategories(nov, oct);
    expect(c.find((x) => x.categoryId === "utilities")).toMatchObject({ total: 1600, previous: 1000, change: 600 });
    expect(c.find((x) => x.categoryId === "food")).toMatchObject({ total: 100, previous: 100, change: 0 });
    expect(compareCategories(nov, null)[0]!.change).toBeNull();
  });

  it("builds a running total and stops after the given day", () => {
    expect(cumulative(oct)).toEqual([1050, 1100, 1100, 1300]);
    expect(cumulative(oct, 2)).toEqual([1050, 1100, null, null]);
    expect(spentToDay(oct, 2)).toBe(1100);
  });

  it("summarizes a year without counting the current month as lowest", () => {
    const y = summarizeYear([oct, nov], "2026-11");
    expect(y.total).toBe(oct.spent + nov.spent);
    expect(y.counted).toBe(1);
    expect(y.highest?.key).toBe("2026-10");
    expect(y.lowest?.key).toBe("2026-10");
    expect(y.monthlyAverage).toBe(oct.spent);
  });

  it("makes a category by month matrix ordered by total", () => {
    const m = categoryMatrix([oct, nov]);
    expect(m.rows[0]).toMatchObject({ categoryId: "utilities", cells: [1000, 1600] });
    expect(m.max).toBe(1600);
  });

  it("finds top days and fixed items", () => {
    expect(topDays(oct, 2).map((d) => d.date)).toEqual(["2026-10-01", "2026-10-04"]);
    expect(fixedItems(nov)).toEqual([
      { name: "gas bill", total: 1100 },
      { name: "net bill", total: 500 },
    ]);
  });
});
