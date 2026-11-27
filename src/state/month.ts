import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { summarizeMonth, UNCATEGORIZED, type Category } from "@/core";
import { todayIn } from "@/ui/format";
import { opId, sortedMonths, useData, withPending } from "./data";
import { useConnection } from "./connection";
import type { OutboxOp } from "@/data/db";
import { useConfig } from "./config";

export const UNCATEGORIZED_CATEGORY: Category = {
  id: UNCATEGORIZED,
  name: "Uncategorized",
  color: null,
  kind: "variable",
  archived: false,
  order: 999,
};

/** Current category record (live: follows edits on the Categories page). */
export function categoryById(id: string): Category {
  return useConfig.getState().categories.find((c) => c.id === id) ?? UNCATEGORIZED_CATEGORY;
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

/** Summary of a month as shown: the sheet plus any unconfirmed edits. */
export function useMonthSummary(key: string | null, today: string) {
  const index = useConfig((s) => s.index);
  const month = useData((s) => (key ? s.months[key] : undefined));
  const ops = useData((s) => s.ops);
  const source = useConnection((s) => s.source);
  return useMemo(
    () => (month ? summarizeMonth(withPending(month, ops, source), index, today) : null),
    [month, ops, source, today, index],
  );
}

/** Sync state of each day of a month that has an unconfirmed edit. */
export function useDayOps(key: string | null): Map<string, OutboxOp> {
  const ops = useData((s) => s.ops);
  const source = useConnection((s) => s.source);
  return useMemo(() => {
    const out = new Map<string, OutboxOp>();
    if (!key) return out;
    const prefix = opId(source, key, "");
    for (const op of Object.values(ops)) if (op.id.startsWith(prefix)) out.set(op.date, op);
    return out;
  }, [ops, source, key]);
}

/** Summaries of every month (with unconfirmed edits applied), in calendar order. */
export function useAllSummaries(today: string) {
  const index = useConfig((s) => s.index);
  const months = useData((s) => s.months);
  const ops = useData((s) => s.ops);
  const source = useConnection((s) => s.source);
  return useMemo(
    () => sortedMonths(months).map((m) => summarizeMonth(withPending(m, ops, source), index, today)),
    [months, ops, source, today, index],
  );
}


