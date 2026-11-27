import { findRule } from "@/core";
import { parseBackup } from "@/data/backup";
import { clearCache, db } from "@/data/db";
import { applyBackup, createBackup } from "./backup";
import { useConfig } from "./config";
import { useConnection } from "./connection";
import { useData } from "./data";

async function fresh(token = "") {
  await clearCache(true);
  await (await db()).clear("config");
  localStorage.clear();
  useConnection.getState().set({ source: "sample", scriptUrl: "https://script.google.com/macros/s/SECRET/exec", token });
  await Promise.all([useData.getState().start(), useConfig.getState().start()]);
}

describe("backup", () => {
  it("round-trips months, rules, templates and edits, without the token or script URL", async () => {
    await fresh("very-secret-token-value-1234567890");
    useConfig.getState().setRule("aam", "groceries");
    useConfig.getState().saveTemplate({ id: "t1", name: "Bills", items: [{ name: "gas bill", amount: "1080", day: 1 }] });
    const key = Object.keys(useData.getState().months).sort()[0]!;
    const date = useData.getState().months[key]!.days[3]!.date;
    useData.getState().editCells([{ monthKey: key, date, value: "held=1" }], "edit");

    const text = JSON.stringify(createBackup());
    expect(text).not.toContain("very-secret-token");
    expect(text).not.toContain("SECRET");

    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.config.userRules.map((r) => r.key)).toContain("aam");
    expect(parsed.backup.outbox).toHaveLength(1);

    // Restore into a clean device.
    await fresh();
    expect(findRule(useConfig.getState().index, "aam")).toBeUndefined();
    const r = await applyBackup(parsed.backup, { config: true, edits: true });
    expect(r).toMatchObject({ rules: 1, templates: 1, edits: 1 });
    expect(findRule(useConfig.getState().index, "aam")?.categoryId).toBe("groceries");
    expect(useConfig.getState().dirtyRules).toContain("aam");
    // Edits come back held, not sent.
    const op = Object.values(useData.getState().ops)[0]!;
    expect(op).toMatchObject({ state: "failed", value: "held=1" });
    expect(op.error).toMatch(/Restored from a backup/);
  });

  it("rejects files that aren't backups, are damaged, or come from a newer app", () => {
    expect(parseBackup("not json")).toEqual({ ok: false, error: "This file isn't valid JSON." });
    expect(parseBackup('{"hello":1}')).toMatchObject({ ok: false, error: "This isn't a Money Saviour backup." });
    expect(parseBackup('{"app":"money-saviour","schemaVersion":99}')).toMatchObject({ ok: false, error: expect.stringMatching(/newer version/) });
    expect(parseBackup('{"app":"money-saviour","schemaVersion":1}')).toMatchObject({ ok: false, error: expect.stringMatching(/damaged/) });
  });

  it("only restores rules and templates from a different spreadsheet", async () => {
    await fresh();
    const b = createBackup();
    b.workbook = { ...b.workbook!, title: "Someone else's sheet" };
    b.outbox = [
      { id: "x", source: "sample", monthKey: "2026-01", tab: "January", rowIndex: 2, date: "2026-01-01", expected: "", value: "x=1", state: "pending", attempts: 0, updatedAt: "" },
    ];
    const r = await applyBackup(b, { config: true, edits: true });
    expect(r.edits).toBe(0);
    expect(r.skippedReason).toMatch(/different spreadsheet/);
    expect(Object.keys(useData.getState().ops)).toHaveLength(0);
  });

  it("never replaces an edit already made on this device", async () => {
    await fresh();
    const key = Object.keys(useData.getState().months).sort()[0]!;
    const day = useData.getState().months[key]!.days[5]!;
    useData.getState().editCells([{ monthKey: key, date: day.date, value: "mine=5" }], "edit");
    const b = createBackup();
    b.outbox = b.outbox.map((o) => ({ ...o, value: "from backup=9" }));
    const r = await applyBackup(b, { config: false, edits: true });
    expect(r.edits).toBe(0);
    expect(Object.values(useData.getState().ops)[0]!.value).toBe("mine=5");
  });
});
