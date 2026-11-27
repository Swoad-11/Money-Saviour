import { useMemo } from "react";
import { categorize, parseCell, reconcile } from "@/core";
import { RULE_INDEX } from "@/state/month";

/** Parse text as the user types it and show what will be recorded. */
export function useLivePreview(text: string) {
  return useMemo(() => {
    const parsed = reconcile(parseCell(text), text, null);
    return { ...parsed, items: parsed.items.map((i) => categorize(i, RULE_INDEX)) };
  }, [text]);
}

