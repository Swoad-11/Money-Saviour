import { normalizeName } from "../normalize";
import type { Category, Kind, Rule } from "../types";
import { V1_RULES } from "./v1";

const cat = (id: string, name: string, color: number, kind: Kind = "variable"): Category => ({
  id,
  name,
  color,
  kind,
  archived: false,
  order: color,
});

export const BUILTIN_CATEGORIES: Category[] = [
  cat("food", "Food", 0),
  cat("groceries", "Groceries", 1),
  cat("transport", "Transport", 2),
  cat("utilities", "Utilities", 3, "fixed"),
  cat("healthcare", "Healthcare", 4),
  cat("personal-care", "Personal Care", 5),
  cat("household", "Household", 6),
  cat("shopping", "Shopping", 7),
  cat("charity", "Charity", 8),
  cat("family", "Family", 9),
  cat("entertainment", "Entertainment", 10),
  cat("education", "Education", 11),
  cat("work", "Work", 12),
  cat("childcare", "Childcare", 13),
  cat("debt", "Debt", 14, "fixed"),
  cat("electronics", "Electronics", 15),
  cat("pets", "Pets", 16),
  cat("business", "Business", 17),
  cat("tax", "Tax", 18),
  cat("bank", "Bank", 19),
  cat("lost", "Lost", 20),
  cat("miscellaneous", "Miscellaneous", 21),
];

/** Rules added for 2.0, from the user's decisions on 2026-11-27. */
const EXTRA_RULES: ReadonlyArray<readonly [key: string, categoryId: string]> = [
  ["groceries", "groceries"],
  ["swapno", "groceries"],
  ["business", "business"],
  ["tax", "tax"],
  ["bank", "bank"],
  ["lost", "lost"],
  ["outing fee", "miscellaneous"],
  ["treat", "miscellaneous"],
  ["dawat", "miscellaneous"],
  ["nafisa", "miscellaneous"],
  ["dipu", "miscellaneous"],
  ["onu", "miscellaneous"],
  ["saba", "miscellaneous"],
  ["raduan", "miscellaneous"],
  ["bua", "miscellaneous"],
  ["davidoff", "food"],
  ["flexi", "utilities"],
];

/** Spelling variants seen in the 2026 sheet, mapped onto an existing rule. */
const ALIASES: Record<string, string[]> = {
  tormuz: ["tormuj"],
  wafer: ["waffer"],
  snacks: ["snaks"],
  "ice cream": ["icecream"],
  egg: ["eggs"],
  guri: ["gur"],
};

/** Kind overrides: recurring bills are fixed whatever their category; top-ups are not. */
const KIND_OVERRIDES: Record<string, Kind> = {
  guard: "fixed",
  "guard bill": "fixed",
  "guard fee": "fixed",
  hujur: "fixed",
  recharge: "variable",
  "mobile recharge": "variable",
  flexi: "variable",
};

function buildRules(): Rule[] {
  const byKey = new Map<string, Rule>();
  const add = (rawKey: string, categoryId: string) => {
    const key = normalizeName(rawKey);
    const existing = byKey.get(key);
    if (existing) {
      // v1 had a few keys that normalize to the same thing ("ice cream" / "ice-cream").
      if (existing.categoryId !== categoryId) {
        throw new Error(`Built-in rule conflict for "${key}"`);
      }
      return;
    }
    byKey.set(key, {
      id: `b:${key}`,
      key,
      aliases: (ALIASES[key] ?? []).map(normalizeName),
      categoryId,
      kind: KIND_OVERRIDES[key],
      origin: "builtin",
    });
  };
  for (const [key, categoryId] of V1_RULES) add(key, categoryId);
  for (const [key, categoryId] of EXTRA_RULES) add(key, categoryId);
  return [...byKey.values()];
}

export const BUILTIN_RULES: Rule[] = buildRules();
