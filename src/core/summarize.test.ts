import { buildIndex } from "./categorize";
import { BUILTIN_CATEGORIES, BUILTIN_RULES } from "./rules/builtin";
import { daysInMonth, summarizeMonth } from "./summarize";
import { appendToCell, serializeCell, toEditable } from "./serialize";
import { parseCell, sheetFormulaTotal } from "./parse";
import type { MonthRecord } from "./types";

const index = buildIndex(BUILTIN_RULES, BUILTIN_CATEGORIES);

const day = (date: string, raw: string, row: number) => ({
  date,
  rowIndex: row,
  raw,
  sheetTotal: raw ? sheetFormulaTotal(raw) : null,
});

const month: MonthRecord = {
  key: "2026-03",
  tab: "March",
  income: 40000,
  sheetGrandTotal: null,
  days: [
    day("2026-03-01", "gas bill=900, nasta=50, vara=20", 4),
    day("2026-03-02", "pizza=300, guard bill=150", 5),
    day("2026-03-03", "", 6),
    day("2026-03-04", "7up=40", 7),
  ],
};

describe("summarizeMonth", () => {
  const s = summarizeMonth(month, index, "2026-11-27");

  it("uses column C for spent", () => {
    expect(s.spent).toBe(900 + 50 + 20 + 300 + 150 + 47);
    expect(s.parsedTotal).toBe(s.spent - 7);
  });

  it("splits fixed and variable so they add up to spent", () => {
    expect(s.fixed).toBe(1050);
    expect(s.fixed + s.variable).toBe(s.spent);
  });

  it("computes remaining and averages for a past month", () => {
    expect(s.remaining).toBe(40000 - s.spent);
    expect(s.daysCounted).toBe(31);
    expect(s.projected).toBe(s.spent);
  });

  it("projects the current month from days elapsed", () => {
    const cur = summarizeMonth({ ...month, key: "2026-11" }, index, "2026-11-10");
    expect(cur.daysCounted).toBe(10);
    expect(cur.projected).toBeCloseTo((cur.spent / 10) * 30, 1);
  });

  it("ranks categories and lists uncategorized items", () => {
    expect(s.byCategory[0]?.categoryId).toBe("utilities");
    expect(s.uncategorized.map((u) => u.key)).toEqual(["pizza", "7up"]);
  });

  it("counts days with warnings", () => {
    expect(s.warningDays).toBe(1);
  });
});

describe("serialize", () => {
  it("keeps untouched items exactly as typed", () => {
    const items = toEditable(parseCell("Masjid=400+50, vara=10").items);
    expect(serializeCell(items)).toBe("Masjid=400+50, vara=10");
  });

  it("rewrites only edited items", () => {
    const items = toEditable(parseCell("Masjid=400+50, vara=10").items);
    items[1]!.amountExpr = "15";
    expect(serializeCell(items)).toBe("Masjid=400+50, vara=15");
  });

  it("drops empty items", () => {
    expect(serializeCell([{ name: "nasta", amountExpr: "50" }, { name: " ", amountExpr: "" }])).toBe("nasta=50");
  });

  it("appends to a cell without touching it", () => {
    expect(appendToCell("nasta=50, vara=20,", "coke=40")).toBe("nasta=50, vara=20, coke=40");
    expect(appendToCell("", "coke=40")).toBe("coke=40");
  });
});

it("knows month lengths", () => {
  expect(daysInMonth("2026-02")).toBe(28);
  expect(daysInMonth("2028-02")).toBe(29);
  expect(daysInMonth("2026-12")).toBe(31);
});
