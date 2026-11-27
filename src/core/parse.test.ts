import { evalAmount, parseCell, reconcile, sheetFormulaTotal } from "./parse";

const names = (cell: string) => parseCell(cell).items.map((i) => [i.key, i.amount]);

describe("parseCell", () => {
  it("reads a plain comma-separated cell", () => {
    const p = parseCell("Nasta=50, vara=25, torkari=140");
    expect(names("Nasta=50, vara=25, torkari=140")).toEqual([
      ["nasta", 50],
      ["vara", 25],
      ["torkari", 140],
    ]);
    expect(p.total).toBe(215);
    expect(p.warnings).toEqual([]);
  });

  it("adds up + inside an amount and keeps the original text", () => {
    const p = parseCell("shoe bag=300, Masjid=400+50, vara=10");
    expect(p.items[1]).toMatchObject({ name: "Masjid", amountExpr: "400+50", amount: 450, text: "Masjid=400+50" });
    expect(p.total).toBe(760);
  });

  it("splits items with a missing comma", () => {
    expect(names("nasta=50, barbar=70 masjid=10, uber=900")).toEqual([
      ["nasta", 50],
      ["barbar", 70],
      ["masjid", 10],
      ["uber", 900],
    ]);
  });

  it("splits items separated by a period", () => {
    expect(names("gom=90, medicine=1500. tel=200, pitha=30")).toEqual([
      ["gom", 90],
      ["medicine", 1500],
      ["tel", 200],
      ["pitha", 30],
    ]);
  });

  it("treats + in a name as one combined item", () => {
    expect(names("vara=100, soap+eggs=250")).toEqual([
      ["vara", 100],
      ["soap+eggs", 250],
    ]);
  });

  it("keeps several names that share one amount as one item", () => {
    expect(names("alu,peyaj,roshun=200")).toEqual([["alu,peyaj,roshun", 200]]);
  });

  it("tolerates stray spaces, hyphens and trailing commas", () => {
    expect(names(" vara=90, gas-bill=1000, shutki-=60, medicine= 900 ,")).toEqual([
      ["vara", 90],
      ["gas bill", 1000],
      ["shutki", 60],
      ["medicine", 900],
    ]);
    expect(parseCell("groceries=200, ").warnings).toEqual([]);
  });

  it("warns about text that isn't name=amount", () => {
    expect(parseCell("vara=20, nasta").warnings.map((w) => w.code)).toEqual(["UNPARSED_TEXT"]);
    expect(parseCell("just a note").warnings.map((w) => w.code)).toEqual(["UNPARSED_TEXT"]);
    expect(parseCell("").warnings).toEqual([]);
  });

  it("warns when an amount has no name", () => {
    expect(parseCell("=40").warnings.map((w) => w.code)).toEqual(["EMPTY_NAME"]);
  });

  it("handles decimals", () => {
    expect(parseCell("coffee=45.5, tea=10").total).toBe(55.5);
  });
});

describe("sheetFormulaTotal", () => {
  it("matches the column C formula on the tricky patterns", () => {
    expect(sheetFormulaTotal("Masjid=400+50")).toBe(450);
    expect(sheetFormulaTotal("barbar=70 masjid=10")).toBe(80);
    expect(sheetFormulaTotal("medicine=1500. tel=200")).toBe(1700);
    expect(sheetFormulaTotal("alu,peyaj,roshun=200")).toBe(200);
    expect(sheetFormulaTotal("")).toBe(0);
  });

  it("counts digits in names, as the sheet does", () => {
    expect(sheetFormulaTotal("7up=40")).toBe(47);
  });
});

describe("reconcile", () => {
  it("passes when the parsed total equals column C", () => {
    const raw = "barbar=70 masjid=10";
    expect(reconcile(parseCell(raw), raw, 80).warnings).toEqual([]);
  });

  it("flags a difference from column C", () => {
    const raw = "7up=40";
    const r = reconcile(parseCell(raw), raw, 47);
    expect(r.warnings.map((w) => w.code)).toEqual(["TOTAL_MISMATCH"]);
  });

  it("emulates the formula when column C is empty", () => {
    const raw = "7up=40";
    expect(reconcile(parseCell(raw), raw, null).warnings.map((w) => w.code)).toEqual(["TOTAL_MISMATCH"]);
  });
});

describe("evalAmount", () => {
  it("evaluates sums and rejects junk", () => {
    expect(evalAmount("10+20 + 5")).toBe(35);
    expect(evalAmount("2000.")).toBe(2000);
    expect(evalAmount("1.2.3")).toBeNull();
  });
});
