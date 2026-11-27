import { useMemo } from "react";
import { UNCATEGORIZED, type MonthSummary } from "@/core";

export interface UnknownItem {
  key: string;
  /** The spelling seen most often. */
  name: string;
  count: number;
  total: number;
  lastDate: string;
  examples: string[];
}

/** Uncategorized item names across the given months, biggest total first. */
export function useUncategorized(months: MonthSummary[]): UnknownItem[] {
  return useMemo(() => {
    const map = new Map<string, UnknownItem & { spellings: Map<string, number> }>();
    for (const m of months)
      for (const d of m.days)
        for (const i of d.items) {
          if (i.categoryId !== UNCATEGORIZED || !i.key) continue;
          const e = map.get(i.key) ?? {
            key: i.key,
            name: i.name,
            count: 0,
            total: 0,
            lastDate: "",
            examples: [] as string[],
            spellings: new Map<string, number>(),
          };
          e.count += 1;
          e.total = Math.round((e.total + i.amount) * 100) / 100;
          if (d.date > e.lastDate) e.lastDate = d.date;
          e.spellings.set(i.name, (e.spellings.get(i.name) ?? 0) + 1);
          if (e.examples.length < 2 && !e.examples.includes(i.text)) e.examples.push(i.text);
          map.set(i.key, e);
        }
    return [...map.values()]
      .map(({ spellings, ...e }) => ({ ...e, name: [...spellings].sort((a, b) => b[1] - a[1])[0]?.[0] ?? e.name }))
      .sort((a, b) => b.total - a.total);
  }, [months]);
}

/** How often each rule matched, and each category's total, across the given months. */
export function useUsage(months: MonthSummary[]) {
  return useMemo(() => {
    const byRule = new Map<string, number>();
    const byCategory = new Map<string, number>();
    for (const m of months)
      for (const d of m.days)
        for (const i of d.items) {
          if (i.ruleId) byRule.set(i.ruleId, (byRule.get(i.ruleId) ?? 0) + 1);
          byCategory.set(i.categoryId, (byCategory.get(i.categoryId) ?? 0) + i.amount);
        }
    return { byRule, byCategory };
  }, [months]);
}
