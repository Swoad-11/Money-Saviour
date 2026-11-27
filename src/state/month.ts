import { useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  BUILTIN_CATEGORIES,
  BUILTIN_RULES,
  buildIndex,
  summarizeMonth,
  UNCATEGORIZED,
  type Category,
} from "@/core";
import { todayIn } from "@/ui/format";
import { sortedMonths, useData } from "./data";

// Categories and rules are built-in until M5 makes them editable.
const CATEGORIES = BUILTIN_CATEGORIES;
const INDEX = buildIndex(BUILTIN_RULES, CATEGORIES);
const UNCAT: Category = {
  id: UNCATEGORIZED,
  name: "Uncategorized",
  color: null,
  kind: "variable",
  archived: false,
  order: 999,
};
const BY_ID = new Map([...CATEGORIES, UNCAT].map((c) => [c.id, c]));

export function categoryById(id: string): Category {
  return BY_ID.get(id) ?? UNCAT;
}

/**
 * The month shown on month-based pages, kept in the URL (?m=2026-11) so it
 * survives reloads and can be linked. Defaults to the current month if the
 * sheet has it, else the latest month.
 */
export function useSelectedMonth() {
  const [params, setParams] = useSearchParams();
  const months = useData((s) => s.months);
  const workbook = useData((s) => s.workbook);
  const keys = useMemo(() => sortedMonths(months).map((m) => m.key), [months]);
  const today = todayIn(workbook?.timeZone);

  const requested = params.get("m");
  const current = today.slice(0, 7);
  const key =
    requested && keys.includes(requested)
      ? requested
      : keys.includes(current)
        ? current
        : (keys[keys.length - 1] ?? null);

  const setKey = (k: string) =>
    setParams(
      (p) => {
        p.set("m", k);
        return p;
      },
      { replace: true },
    );

  return { key, keys, setKey, today };
}

export function useMonthSummary(key: string | null, today: string) {
  const month = useData((s) => (key ? s.months[key] : undefined));
  return useMemo(() => (month ? summarizeMonth(month, INDEX, today) : null), [month, today]);
}
