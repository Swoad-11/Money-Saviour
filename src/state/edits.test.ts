import { clearCache, loadOutbox } from "@/data/db";
import { sampleApi } from "@/data/sample";
import { useConnection } from "./connection";
import { opId, useData, withPending } from "./data";

const S = () => useData.getState();

async function setup() {
  await clearCache(true);
  localStorage.clear();
  useConnection.getState().set({ source: "sample", scriptUrl: "", token: "" });
  await S().start();
  const key = Object.keys(S().months).sort()[0]!;
  const day = S().months[key]!.days[1]!;
  return { key, date: day.date, original: day.raw, id: opId("sample", key, day.date) };
}

async function sheetRaw(key: string, date: string) {
  const tab = S().months[key]!.tab;
  const [m] = await sampleApi().getMonths([tab]);
  return m!.days.find((d) => d.date === date)!.raw;
}

describe("editing", () => {
  afterEach(() => vi.useRealTimers());

  it("shows an edit at once, then writes it to the sheet and clears the outbox", async () => {
    const { key, date, id } = await setup();
    S().editCells([{ monthKey: key, date, value: "nasta=60, vara=20" }], "edit");
    expect(S().ops[id]).toMatchObject({ state: "pending", value: "nasta=60, vara=20" });
    const shown = withPending(S().months[key]!, S().ops, "sample").days.find((d) => d.date === date)!;
    expect(shown).toMatchObject({ raw: "nasta=60, vara=20", sheetTotal: 80 });

    await S().flush();
    expect(S().ops[id]).toBeUndefined();
    expect(await sheetRaw(key, date)).toBe("nasta=60, vara=20");
    expect(S().months[key]!.days.find((d) => d.date === date)).toMatchObject({ raw: "nasta=60, vara=20", sheetTotal: 80 });
    expect(await loadOutbox("sample")).toEqual([]);
  });

  it("keeps one op per cell with the first expected value", async () => {
    const { key, date, original, id } = await setup();
    S().editCells([{ monthKey: key, date, value: "a=1" }], "edit");
    S().editCells([{ monthKey: key, date, value: "a=2" }], "edit");
    expect(S().ops[id]).toMatchObject({ expected: original, value: "a=2" });
    expect(Object.keys(S().ops)).toHaveLength(1);
  });

  it("drops the op when the text goes back to what the sheet has", async () => {
    const { key, date, original, id } = await setup();
    S().editCells([{ monthKey: key, date, value: "a=1" }], "edit");
    S().editCells([{ monthKey: key, date, value: original }], "edit");
    expect(S().ops[id]).toBeUndefined();
  });

  it("undoes a batch edit in one step", async () => {
    const { key } = await setup();
    const days = S().months[key]!.days.slice(2, 5);
    S().editCells(days.map((d) => ({ monthKey: key, date: d.date, value: "x=1" })), "bulk input");
    expect(Object.keys(S().ops)).toHaveLength(3);
    const undone = S().undo();
    expect(undone?.label).toBe("bulk input");
    expect(Object.keys(S().ops)).toHaveLength(0);
  });

  it("undo after syncing writes the old text back", async () => {
    const { key, date, original } = await setup();
    S().editCells([{ monthKey: key, date, value: "a=1" }], "edit");
    await S().flush();
    S().undo();
    await S().flush();
    expect(await sheetRaw(key, date)).toBe(original);
  });

  it("detects a conflict when the sheet changed, and never overwrites silently", async () => {
    const { key, date, original, id } = await setup();
    const tab = S().months[key]!.tab;
    const rowIndex = S().months[key]!.days[1]!.rowIndex;
    // Someone edits the sheet directly after the app read it.
    await sampleApi().setCells([{ id: "x", tab, rowIndex, date, expected: original, value: "from sheet=5" }]);

    S().editCells([{ monthKey: key, date, value: "mine=9" }], "edit");
    await S().flush();
    expect(S().ops[id]).toMatchObject({ state: "conflict", sheetRaw: "from sheet=5", value: "mine=9" });
    expect(await sheetRaw(key, date)).toBe("from sheet=5");

    S().resolveConflict(id, "mine");
    await S().flush();
    expect(await sheetRaw(key, date)).toBe("mine=9");
    expect(S().ops[id]).toBeUndefined();
  });

  it("can keep the sheet's version of a conflict", async () => {
    const { key, date, original, id } = await setup();
    const m = S().months[key]!;
    await sampleApi().setCells([{ id: "x", tab: m.tab, rowIndex: m.days[1]!.rowIndex, date, expected: original, value: "sheet=1" }]);
    S().editCells([{ monthKey: key, date, value: "mine=2" }], "edit");
    await S().flush();
    S().resolveConflict(id, "sheet");
    expect(S().ops[id]).toBeUndefined();
    expect(S().months[key]!.days[1]!.raw).toBe("sheet=1");
  });

  it("keeps edits through a network failure and survives a reload", async () => {
    const { key, date, id } = await setup();
    const api = sampleApi();
    const real = api.setCells;
    api.setCells = vi.fn(async () => {
      const { ApiError } = await import("@/data/api");
      throw new ApiError("NETWORK", "offline");
    });
    S().editCells([{ monthKey: key, date, value: "offline=7" }], "edit");
    await S().flush();
    expect(S().ops[id]).toMatchObject({ state: "pending", attempts: 1 });

    // Reload: the outbox comes back from IndexedDB, and the edit is sent once online.
    api.setCells = real;
    await new Promise((r) => setTimeout(r, 20));
    await S().start();
    expect(S().ops[id]?.value ?? (await sheetRaw(key, date))).toBe("offline=7");
    await S().flush();
    expect(await sheetRaw(key, date)).toBe("offline=7");
  });

  it("stops and explains when the backend can't write", async () => {
    const { key, date, id } = await setup();
    const api = sampleApi();
    const real = api.setCells;
    const { ApiError } = await import("@/data/api");
    api.setCells = vi.fn(async () => {
      throw new ApiError("BAD_REQUEST", "Your Apps Script deployment is read-only.");
    });
    S().editCells([{ monthKey: key, date, value: "a=1" }], "edit");
    await S().flush();
    expect(S().ops[id]).toMatchObject({ state: "failed" });
    expect(S().writeError).toMatch(/read-only/);
    api.setCells = real;
    S().retryFailed();
    await S().flush();
    expect(S().ops[id]).toBeUndefined();
  });
});
