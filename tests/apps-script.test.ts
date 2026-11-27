/**
 * Runs apps-script/Code.gs in a Node VM against a fake spreadsheet laid out
 * like the real one, so the backend is tested without deploying it.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const TOKEN = "t".repeat(32);
const code = readFileSync(resolve(__dirname, "../apps-script/Code.gs"), "utf8");

/** Dhaka is UTC+6 with no DST; a sheet date is local midnight. */
const dhaka = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d) - 6 * 3600_000);

type Cell = string | number | Date;
const sheet = (name: string, rows: Cell[][]) => ({
  getName: () => name,
  getDataRange: () => ({ getValues: () => rows }),
});

function monthRows(): Cell[][] {
  // Current layout: no Income row, header in row 1.
  return [
    ["Date", "Expenses", "Total"],
    [dhaka(2026, 11, 1), "nasta=50, vara=20", 70],
    [dhaka(2026, 11, 2), "", ""],
    [dhaka(2026, 11, 3), "Masjid=400+50", 450],
    ["", "stray note=10", 10],
    ["11-04-2026", "coke=40", 40],
    ["", "Grand Total=", 570],
    ["", "notes below the total", ""],
  ];
}

function load(props: Record<string, string | null> = { MS_TOKEN: TOKEN }) {
  const sheets = [
    sheet("November", monthRows()),
    sheet("January", [["Income", 40000], [], ["Date", "Expenses", "Total"], [dhaka(2026, 1, 1), "vara=10", 10], ["", "Grand Total=", 10]]),
    sheet("_Rules", [["id"]]),
    sheet("Notes", [["hello"]]),
    sheet("History", [["label"]]),
  ];
  const ctx: Record<string, unknown> = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getName: () => "Monthly Expense - 2026",
        getSpreadsheetTimeZone: () => "Asia/Dhaka",
        getSheets: () => sheets,
        getSheetByName: (n: string) => sheets.find((s) => s.getName() === n) ?? null,
      }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => props[k] ?? null }) },
    Utilities: {
      formatDate: (d: Date, tz: string) =>
        new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d),
    },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (text: string) => ({ text, setMimeType() { return this; } }),
    },
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  const post = (body: unknown) => {
    const out = (ctx.doPost as (e: unknown) => { text: string })({
      postData: { contents: typeof body === "string" ? body : JSON.stringify(body) },
    });
    return JSON.parse(out.text);
  };
  return { post, ctx };
}

describe("Apps Script v2", () => {
  it("rejects requests without the right token", () => {
    const { post } = load();
    expect(post({ action: "ping" }).error.code).toBe("AUTH");
    expect(post({ action: "ping", token: "x".repeat(32) }).error.code).toBe("AUTH");
    expect(post({ action: "ping", token: TOKEN }).ok).toBe(true);
  });

  it("refuses everything when no token is configured", () => {
    const { post } = load({ MS_TOKEN: null });
    expect(post({ action: "ping", token: "" }).error.code).toBe("AUTH");
    const short = load({ MS_TOKEN: "short" });
    expect(short.post({ action: "ping", token: "short" }).error.code).toBe("AUTH");
  });

  it("rejects bad bodies and GET", () => {
    const { post, ctx } = load();
    expect(post("not json").error.code).toBe("BAD_REQUEST");
    expect(post({ token: TOKEN, action: "nope" }).error.code).toBe("BAD_REQUEST");
    const get = JSON.parse((ctx.doGet as () => { text: string })().text);
    expect(get.ok).toBe(false);
  });

  it("lists month tabs in calendar order and skips other tabs", () => {
    const { post } = load();
    const wb = post({ token: TOKEN, action: "getWorkbook" }).data;
    expect(wb).toMatchObject({ title: "Monthly Expense - 2026", timeZone: "Asia/Dhaka", year: 2026 });
    expect(wb.months).toEqual([
      { tab: "January", key: "2026-01" },
      { tab: "November", key: "2026-11" },
    ]);
  });

  it("reads a month without an Income row: dated rows, totals and the Grand total", () => {
    const { post } = load();
    const [m] = post({ token: TOKEN, action: "getMonths", params: { tabs: ["November"] } }).data;
    expect(m.income).toBeNull();
    expect(m.sheetGrandTotal).toBe(570);
    expect(m.days).toEqual([
      { date: "2026-11-01", rowIndex: 2, raw: "nasta=50, vara=20", sheetTotal: 70 },
      { date: "2026-11-02", rowIndex: 3, raw: "", sheetTotal: null },
      { date: "2026-11-03", rowIndex: 4, raw: "Masjid=400+50", sheetTotal: 450 },
      { date: "2026-11-04", rowIndex: 6, raw: "coke=40", sheetTotal: 40 },
    ]);
    expect(m.warnings).toEqual(["Row 5 has expenses but no date"]);
  });

  it("still reads income from a labelled Income row (older layout)", () => {
    const { post } = load();
    const [m] = post({ token: TOKEN, action: "getMonths", params: { tabs: ["January"] } }).data;
    expect(m.income).toBe(40000);
    expect(m.days[0]).toMatchObject({ rowIndex: 4, raw: "vara=10" });
  });

  it("reads all months when no tabs are given", () => {
    const { post } = load();
    const months = post({ token: TOKEN, action: "getMonths" }).data;
    expect(months.map((m: { key: string }) => m.key)).toEqual(["2026-01", "2026-11"]);
  });

  it("formats dates in the spreadsheet's time zone, not UTC", () => {
    const { post } = load();
    const [m] = post({ token: TOKEN, action: "getMonths", params: { tabs: ["January"] } }).data;
    // Local midnight on 1 Jan in Dhaka is 31 Dec 18:00 UTC.
    expect(m.days[0].date).toBe("2026-01-01");
  });
});
