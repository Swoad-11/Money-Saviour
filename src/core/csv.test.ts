import { buildIndex } from "./categorize";
import { BUILTIN_CATEGORIES, BUILTIN_RULES } from "./rules/builtin";
import { summarizeMonth } from "./summarize";
import { csvField, itemsCsv, monthsCsv, toCsv } from "./csv";
import { UNCATEGORIZED } from "./types";

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField("a, b")).toBe('"a, b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField(1080)).toBe("1080");
    expect(csvField(null)).toBe("");
  });

  it("neutralizes text that a spreadsheet would run as a formula", () => {
    expect(csvField("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvField("+40")).toBe("'+40");
    expect(csvField("-5")).toBe("'-5");
    expect(csvField("@sum")).toBe("'@sum");
  });

  it("uses CRLF line endings", () => {
    expect(toCsv([["a", 1], ["b", 2]])).toBe("a,1\r\nb,2\r\n");
  });

  it("exports one row per item and a month summary", () => {
    const index = buildIndex(BUILTIN_RULES, BUILTIN_CATEGORIES);
    const m = summarizeMonth(
      {
        key: "2026-11",
        tab: "November",
        income: null,
        sheetGrandTotal: null,
        days: [{ date: "2026-11-01", rowIndex: 2, raw: "gas bill=1080, pizza=200", sheetTotal: 1280 }],
      },
      index,
      "2026-12-01",
    );
    const name = (id: string) => (id === UNCATEGORIZED ? "Uncategorized" : (BUILTIN_CATEGORIES.find((c) => c.id === id)?.name ?? id));
    expect(itemsCsv([m], name).split("\r\n").slice(0, 3)).toEqual([
      "Date,Month,Item,Amount,Category,Kind,Day total,Day text",
      '2026-11-01,2026-11,gas bill,1080,Utilities,fixed,1280,"gas bill=1080, pizza=200"',
      '2026-11-01,2026-11,pizza,200,Uncategorized,variable,1280,"gas bill=1080, pizza=200"',
    ]);
    expect(monthsCsv([m], BUILTIN_CATEGORIES).split("\r\n")[1]).toBe("2026-11,1280,1080,200,1080");
  });
});
