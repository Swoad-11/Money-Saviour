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
/** Records every write so tests can prove only column B changes. */
const writes: { sheet: string; row: number; col: number; value: unknown }[] = [];
const sheet = (name: string, rows: Cell[][]) => ({
  rows,
  getName: () => name,
  getDataRange: () => ({ getValues: () => rows.map((r) => [...r]) }),
  getLastRow: () => rows.length,
  getRange: (r: number, c: number, nr = 1, nc = 1) => ({
    getValues: () =>
      Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => rows[r - 1 + i]?.[c - 1 + j] ?? "")),
    setValue: (v: string) => {
      writes.push({ sheet: name, row: r, col: c, value: v });
      // Sheets stores a leading apostrophe as a text marker, not as content.
      (rows[r - 1] ??= [])[c - 1] = typeof v === "string" && v.startsWith("'") ? v.slice(1) : v;
    },
    setValues: (vals: Cell[][]) => {
      vals.forEach((rowVals, i) =>
        rowVals.forEach((v, j) => {
          writes.push({ sheet: name, row: r + i, col: c + j, value: v });
          (rows[r - 1 + i] ??= [])[c - 1 + j] = typeof v === "string" && v.startsWith("'") ? v.slice(1) : v;
        }),
      );
    },
  }),
  appendRow: (vals: Cell[]) => {
    rows.push(vals.map((v) => (typeof v === "string" && v.startsWith("'") ? v.slice(1) : v)));
    writes.push({ sheet: name, row: rows.length, col: 1, value: vals });
  },
  deleteRow: (r: number) => {
    rows.splice(r - 1, 1);
    writes.push({ sheet: name, row: r, col: 0, value: "deleted" });
  },
});
/** What column C does in the real sheet: add up every number in column B. */
const recalc = (rows: Cell[][]) => {
  for (const r of rows) {
    if (!(r[0] instanceof Date) && !/^d/.test(String(r[0] ?? ""))) continue;
    const b = String(r[1] ?? "");
    r[2] = b ? b.split(/[^0-9.]+/).filter(Boolean).map(Number).filter(Number.isFinite).reduce((a, n) => a + n, 0) : "";
  }
};

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
    sheet("_Scratch", [["x"]]),
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
        insertSheet: (n: string) => {
          const sh = sheet(n, []);
          sheets.push(sh);
          return sh;
        },
      }),
      flush: () => sheets.forEach((sh) => recalc(sh.rows)),
    },
    LockService: { getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
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
  return { post, ctx, sheets };
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

  describe("setCells", () => {
    const edit = (over: Record<string, unknown> = {}) => ({
      id: "e1",
      tab: "November",
      rowIndex: 3,
      date: "2026-11-02",
      expected: "",
      value: "nasta=60, vara=20",
      ...over,
    });

    beforeEach(() => {
      writes.length = 0;
    });

    it("writes column B when the cell still holds the expected text, and returns the new total", () => {
      const { post, sheets } = load();
      const [r] = post({ token: TOKEN, action: "setCells", params: { edits: [edit()] } }).data;
      expect(r).toEqual({ id: "e1", status: "ok", raw: "nasta=60, vara=20", sheetTotal: 80 });
      expect(sheets[0]!.rows[2]![1]).toBe("nasta=60, vara=20");
      expect(writes).toEqual([{ sheet: "November", row: 3, col: 2, value: "'nasta=60, vara=20" }]);
    });

    it("reports a conflict and writes nothing when the cell changed in the sheet", () => {
      const { post } = load();
      const [r] = post({
        token: TOKEN,
        action: "setCells",
        params: { edits: [edit({ rowIndex: 2, date: "2026-11-01", expected: "nasta=50", value: "x=1" })] },
      }).data;
      expect(r).toMatchObject({ status: "conflict", raw: "nasta=50, vara=20", sheetTotal: 70 });
      expect(writes).toEqual([]);
    });

    it("refuses rows whose date doesn't match, the Grand total row, and non-month tabs", () => {
      const { post } = load();
      const res = post({
        token: TOKEN,
        action: "setCells",
        params: {
          edits: [
            edit({ id: "a", date: "2026-11-05" }),
            edit({ id: "b", rowIndex: 7, date: "" }),
            edit({ id: "c", tab: "Notes" }),
            edit({ id: "d", rowIndex: 99 }),
          ],
        },
      }).data;
      expect(res.map((r: { status: string }) => r.status)).toEqual(["not_found", "not_found", "not_found", "not_found"]);
      expect(writes).toEqual([]);
    });

    it("keeps text that looks like a formula or number as text", () => {
      const { post, sheets } = load();
      post({ token: TOKEN, action: "setCells", params: { edits: [edit({ value: "=40" })] } });
      expect(writes[0]!.value).toBe("'=40");
      expect(sheets[0]!.rows[2]![1]).toBe("=40");
    });

    it("can clear a cell", () => {
      const { post, sheets } = load();
      const [r] = post({
        token: TOKEN,
        action: "setCells",
        params: { edits: [edit({ rowIndex: 4, date: "2026-11-03", expected: "Masjid=400+50", value: "" })] },
      }).data;
      expect(r.status).toBe("ok");
      expect(sheets[0]!.rows[3]![1]).toBe("");
    });

    it("never writes outside column B", () => {
      const { post } = load();
      post({ token: TOKEN, action: "setCells", params: { edits: [edit(), edit({ id: "2", rowIndex: 6, date: "2026-11-04", expected: "coke=40", value: "coke=45" })] } });
      expect(writes.every((w) => w.col === 2)).toBe(true);
    });

    it("needs the token like every other action", () => {
      const { post } = load();
      expect(post({ action: "setCells", params: { edits: [edit()] } }).error.code).toBe("AUTH");
      expect(writes).toEqual([]);
    });
  });

  describe("settings tabs", () => {
    const cat = { id: "snacks", name: "Snacks", color: "", kind: "variable", archived: "false", order: "30", updatedAt: "2026-11-27T10:00:00Z" };
    const rule = (key: string, categoryId: string, updatedAt = "2026-11-27T10:00:00Z") => ({ key, aliases: "", categoryId, kind: "", updatedAt });

    it("reads nothing (and creates nothing) before the first save", () => {
      const { post, sheets } = load();
      expect(post({ token: TOKEN, action: "getConfig" }).data).toEqual({ categories: [], rules: [], templates: [] });
      expect(sheets.some((s) => s.getName() === "_Rules")).toBe(false);
    });

    it("creates the tabs on first save, then upserts and deletes rows by key", () => {
      const { post, sheets } = load();
      post({ token: TOKEN, action: "saveConfig", params: { categories: [cat], rules: [rule("aam", "groceries"), rule("pizza", "food")] } });
      const rulesTab = sheets.find((s) => s.getName() === "_Rules")!;
      expect(rulesTab.rows[0]).toEqual(["key", "aliases", "categoryId", "kind", "updatedAt"]);
      expect(rulesTab.rows).toHaveLength(3);

      const r = post({
        token: TOKEN,
        action: "saveConfig",
        params: { rules: [rule("aam", "food", "2026-11-27T11:00:00Z")], deleteRules: ["pizza"] },
      }).data;
      expect(r.rules).toEqual({ written: 1, skipped: 0, deleted: 1 });
      const cfg = post({ token: TOKEN, action: "getConfig" }).data;
      expect(cfg.rules).toEqual([rule("aam", "food", "2026-11-27T11:00:00Z")]);
      expect(cfg.categories).toEqual([cat]);
    });

    it("ignores an older change to a row that was updated since", () => {
      const { post } = load();
      post({ token: TOKEN, action: "saveConfig", params: { rules: [rule("aam", "food", "2026-11-27T12:00:00Z")] } });
      const r = post({ token: TOKEN, action: "saveConfig", params: { rules: [rule("aam", "groceries", "2026-11-27T09:00:00Z")] } }).data;
      expect(r.rules.skipped).toBe(1);
      expect(post({ token: TOKEN, action: "getConfig" }).data.rules[0].categoryId).toBe("food");
    });

    it("stores templates as JSON and deletes them by id", () => {
      const { post } = load();
      const t = { id: "bills", name: "Monthly bills", itemsJson: JSON.stringify([{ name: "gas bill", amount: "1080", day: 1 }]), updatedAt: "2026-11-27T10:00:00Z" };
      post({ token: TOKEN, action: "saveConfig", params: { templates: [t] } });
      expect(post({ token: TOKEN, action: "getConfig" }).data.templates).toEqual([t]);
      post({ token: TOKEN, action: "saveConfig", params: { deleteTemplates: ["bills"] } });
      expect(post({ token: TOKEN, action: "getConfig" }).data.templates).toEqual([]);
    });

    it("never touches month tabs and keeps settings tabs out of the month list", () => {
      const { post } = load();
      writes.length = 0;
      post({ token: TOKEN, action: "saveConfig", params: { rules: [rule("aam", "food")] } });
      expect(writes.every((w) => w.sheet.startsWith("_"))).toBe(true);
      const wb = post({ token: TOKEN, action: "getWorkbook" }).data;
      expect(wb.months.map((m: { tab: string }) => m.tab)).toEqual(["January", "November"]);
    });
  });
});