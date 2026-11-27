import { buildIndex } from "./categorize";
import { BUILTIN_CATEGORIES, BUILTIN_RULES } from "./rules/builtin";
import { summarizeMonth } from "./summarize";
import { previewTemplate, templateChanges, templateFromMonth, templateTotal, type Template } from "./templates";
import type { MonthRecord } from "./types";

const feb: MonthRecord = {
  key: "2027-02",
  tab: "February",
  income: null,
  sheetGrandTotal: null,
  days: Array.from({ length: 28 }, (_, i) => ({
    date: `2027-02-${String(i + 1).padStart(2, "0")}`,
    rowIndex: i + 2,
    raw: i === 0 ? "Gas Bill=1080, nasta=50" : i === 6 ? "vara=20," : "",
    sheetTotal: null,
  })),
};

const bills: Template = {
  id: "bills",
  name: "Monthly bills",
  items: [
    { name: "gas bill", amount: "1080", day: 1 },
    { name: "electricity bill", amount: "1800", day: 1 },
    { name: "net bill", amount: "500", day: 7 },
    { name: "rent", amount: "15000+500", day: 31 },
    { name: "", amount: "100", day: 3 },
  ],
};

describe("templates", () => {
  const rows = previewTemplate(bills, feb);

  it("marks items already on their day, and new ones", () => {
    expect(rows.map((r) => [r.item.name, r.date, r.status])).toEqual([
      ["gas bill", "2027-02-01", "present"],
      ["electricity bill", "2027-02-01", "new"],
      ["net bill", "2027-02-07", "new"],
      ["rent", "2027-02-28", "new"],
      ["", null, "invalid"],
    ]);
  });

  it("moves days past the end of a short month to its last day, and says so", () => {
    expect(rows[3]).toMatchObject({ amount: 15500, note: "Day 31 → 28 (last day of the month)" });
  });

  it("appends only the chosen items, after what each day already has", () => {
    const changes = templateChanges(rows, feb, new Set([1, 2, 3, 4]));
    expect(changes).toEqual([
      { date: "2027-02-01", value: "Gas Bill=1080, nasta=50, electricity bill=1800" },
      { date: "2027-02-07", value: "vara=20, net bill=500" },
      { date: "2027-02-28", value: "rent=15000+500" },
    ]);
  });

  it("builds a template from a month's fixed items", () => {
    const index = buildIndex(BUILTIN_RULES, BUILTIN_CATEGORIES);
    const m = { ...feb, key: "2026-02", days: feb.days.map((d, i) => ({ ...d, date: `2026-02-${String(i + 1).padStart(2, "0")}`, raw: i === 0 ? "gas bill=1080, nasta=50" : i === 9 ? "hujur=100, net bill=500" : "" })) };
    const items = templateFromMonth(summarizeMonth(m, index, "2026-12-01"));
    expect(items).toEqual([
      { name: "gas bill", amount: "1080", day: 1 },
      { name: "hujur", amount: "100", day: 10 },
      { name: "net bill", amount: "500", day: 10 },
    ]);
    expect(templateTotal({ items })).toBe(1680);
  });
});
