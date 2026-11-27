import { useMemo } from "react";
import { categorize, parseCell, reconcile } from "@/core";
import { useConfig } from "@/state/config";

/** Parse text as the user types it and show what will be recorded. */
export function useLivePreview(text: string) {
  const index = useConfig((s) => s.index);
  return useMemo(() => {
    const parsed = reconcile(parseCell(text), text, null);
    return { ...parsed, items: parsed.items.map((i) => categorize(i, index)) };
  }, [text, index]);
}

