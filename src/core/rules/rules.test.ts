import { buildIndex, categorize, findRule } from "../categorize";
import { normalizeName } from "../normalize";
import { parseCell } from "../parse";
import { UNCATEGORIZED, type Rule } from "../types";
import { BUILTIN_CATEGORIES, BUILTIN_RULES } from "./builtin";
import { V1_RULES } from "./v1";

const index = buildIndex(BUILTIN_RULES, BUILTIN_CATEGORIES);
const catOf = (name: string) => findRule(index, normalizeName(name))?.categoryId ?? UNCATEGORIZED;
const slug = (c: string) => c.toLowerCase().replace(/\s+/g, "-");

describe("v1 rule preservation", () => {
  it("has all 200 v1 rules", () => {
    expect(V1_RULES).toHaveLength(200);
  });

  it.each(V1_RULES)("%s keeps its category", (key, categoryId, v1) => {
    expect(catOf(key)).toBe(categoryId);
    const moved = categoryId === "groceries" || categoryId === "miscellaneous";
    if (!moved) expect(categoryId).toBe(slug(v1));
  });

  it("moves exactly the approved rules", () => {
    expect(V1_RULES.filter(([, c]) => c === "groceries")).toHaveLength(44);
    expect(V1_RULES.filter(([, c]) => c === "miscellaneous").map(([k]) => k)).toEqual([
      "fine",
      "extras",
      "misc",
      "miscellaneous",
    ]);
  });

  it("points every rule at a real category", () => {
    const ids = new Set(BUILTIN_CATEGORIES.map((c) => c.id));
    for (const r of BUILTIN_RULES) expect(ids).toContain(r.categoryId);
  });
});

describe("2.0 decisions", () => {
  it.each([
    ["groceries", "groceries"],
    ["swapno", "groceries"],
    ["business", "business"],
    ["tax", "tax"],
    ["bank", "bank"],
    ["lost", "lost"],
    ["outing fee", "miscellaneous"],
    ["treat", "miscellaneous"],
    ["dawat", "miscellaneous"],
    ["Raduan", "miscellaneous"],
    ["bua", "miscellaneous"],
    ["davidoff", "food"],
    ["flexi", "utilities"],
  ])("%s → %s", (name, cat) => {
    expect(catOf(name)).toBe(cat);
  });
});

describe("matching", () => {
  it("normalizes separators and case", () => {
    expect(catOf("Gas-Bill")).toBe("utilities");
    expect(catOf("cat-food")).toBe("pets");
    expect(catOf("net-bill")).toBe("utilities");
    expect(catOf("Electricity Bill")).toBe("utilities");
  });

  it("uses aliases for spelling variants", () => {
    expect(catOf("tormuj")).toBe("groceries");
    expect(catOf("waffer")).toBe("food");
    expect(catOf("eggs")).toBe("groceries");
  });

  it("uses the first known part of a combined name", () => {
    expect(catOf("soap+eggs")).toBe("personal-care");
    expect(catOf("alu,peyaj,roshun")).toBe("groceries");
    expect(catOf("alu-peyaj")).toBe(UNCATEGORIZED); // hyphen means one name, not two
  });

  it("leaves unknown items uncategorized", () => {
    expect(catOf("pizza")).toBe(UNCATEGORIZED);
  });

  it("lets a user rule override a built-in one", () => {
    const user: Rule = { id: "u:1", key: "vara", aliases: [], categoryId: "work", origin: "user" };
    const idx = buildIndex([...BUILTIN_RULES, user], BUILTIN_CATEGORIES);
    expect(findRule(idx, "vara")?.categoryId).toBe("work");
  });
});

describe("kind", () => {
  const kindOf = (cell: string) => categorize(parseCell(cell).items[0]!, index).kind;

  it("follows the category default", () => {
    expect(kindOf("gas bill=900")).toBe("fixed");
    expect(kindOf("nasta=50")).toBe("variable");
  });

  it("lets a rule override its category", () => {
    expect(kindOf("guard bill=150")).toBe("fixed");
    expect(kindOf("hujur=80")).toBe("fixed");
    expect(kindOf("mobile recharge=50")).toBe("variable");
  });

  it("treats uncategorized items as variable", () => {
    expect(kindOf("pizza=150")).toBe("variable");
  });
});
