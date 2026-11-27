import { nameParts } from "./normalize";
import {
  UNCATEGORIZED,
  type Category,
  type CategorizedItem,
  type Kind,
  type LineItem,
  type Rule,
} from "./types";

export interface RuleIndex {
  lookup(key: string): Rule | undefined;
  categories: Map<string, Category>;
}

/** User rules win over built-in rules with the same key or alias. */
export function buildIndex(rules: Rule[], categories: Category[]): RuleIndex {
  const map = new Map<string, Rule>();
  const ordered = [...rules].sort((a, b) =>
    a.origin === b.origin ? 0 : a.origin === "builtin" ? -1 : 1,
  );
  for (const r of ordered) {
    map.set(r.key, r);
    for (const a of r.aliases) map.set(a, r);
  }
  return {
    lookup: (key) => map.get(key),
    categories: new Map(categories.map((c) => [c.id, c])),
  };
}

/**
 * Find the rule for a normalized key. Exact key or alias first; for a combined
 * name ("soap+eggs", "alu,peyaj,roshun") the first part with a rule decides.
 */
export function findRule(index: RuleIndex, key: string): Rule | undefined {
  const direct = index.lookup(key);
  if (direct) return direct;
  for (const part of nameParts(key)) {
    const r = index.lookup(part);
    if (r) return r;
  }
  return undefined;
}

export function resolveKind(rule: Rule | undefined, category: Category | undefined): Kind {
  return rule?.kind ?? category?.kind ?? "variable";
}

export function categorize(item: LineItem, index: RuleIndex): CategorizedItem {
  const rule = findRule(index, item.key);
  const category = rule ? index.categories.get(rule.categoryId) : undefined;
  return {
    ...item,
    // Archived categories keep their items, so past totals don't change.
    categoryId: rule?.categoryId ?? UNCATEGORIZED,
    ruleId: rule?.id,
    kind: resolveKind(rule, category),
  };
}
