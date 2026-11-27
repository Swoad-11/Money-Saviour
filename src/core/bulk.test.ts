import { groupBulk, parseBulk } from "./bulk";

const p = (s: string) => parseBulk(s, "2026-11", "2026-11-27");

describe("parseBulk", () => {
  it("reads day-of-month lines in several styles", () => {
    expect(p("08 nasta=60, vara=20\n9: coke=40\n10. tea=10\n11) dim=30\n12 - pitha=20")).toEqual([
      { line: 1, date: "2026-11-08", text: "nasta=60, vara=20" },
      { line: 2, date: "2026-11-09", text: "coke=40" },
      { line: 3, date: "2026-11-10", text: "tea=10" },
      { line: 4, date: "2026-11-11", text: "dim=30" },
      { line: 5, date: "2026-11-12", text: "pitha=20" },
    ]);
  });

  it("reads full dates in ISO and sheet (MM-DD-YYYY) form", () => {
    expect(p("2026-11-03: vara=10\n11-04-2026 vara=20").map((l) => l.date)).toEqual([
      "2026-11-03",
      "2026-11-04",
    ]);
  });

  it("sends undated lines to the fallback date", () => {
    expect(p("nasta=60, vara=20")[0]).toMatchObject({ date: "2026-11-27", text: "nasta=60, vara=20" });
  });

  it("does not mistake an item starting with a digit for a day", () => {
    expect(p("7up=40")[0]).toMatchObject({ date: "2026-11-27", text: "7up=40" });
    expect(p("5=40")[0]).toMatchObject({ date: "2026-11-27", text: "5=40" });
  });

  it("flags invalid dates, other months and lines without items", () => {
    const r = p("31 vara=10\n2026-12-01 vara=10\n05 just a note\n");
    expect(r.map((l) => l.error)).toEqual([
      "Not a valid date in this month",
      "2026-12-01 isn't in this month",
      "No name=amount items on this line",
    ]);
    expect(r.every((l) => l.date === null)).toBe(true);
  });

  it("skips blank lines and keeps line numbers", () => {
    expect(p("\n\n03 vara=10\n")[0]!.line).toBe(3);
  });
});

describe("groupBulk", () => {
  it("joins items for the same date in order and drops errors", () => {
    const g = groupBulk(p("03 vara=10\n31 bad=1\n3 coke=40"));
    expect([...g]).toEqual([["2026-11-03", "vara=10, coke=40"]]);
  });
});
