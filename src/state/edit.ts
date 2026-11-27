import { useCallback } from "react";
import { useToast } from "@/ui/toast-store";
import { useData, type CellChange } from "./data";

/** Apply edits and offer Undo in a toast. */
export function useApplyEdits() {
  const editCells = useData((s) => s.editCells);
  const undo = useData((s) => s.undo);
  const show = useToast((s) => s.show);
  return useCallback(
    (changes: CellChange[], label: string, message: string) => {
      const before = useData.getState().undoStack.length;
      editCells(changes, label);
      if (useData.getState().undoStack.length > before) {
        show({ message, action: { label: "Undo", run: () => void undo() } });
      }
    },
    [editCells, undo, show],
  );
}

/** Text shown for a day right now: the pending edit if any, else the sheet. */
export function currentRaw(monthKey: string, date: string): string {
  const s = useData.getState();
  const day = s.months[monthKey]?.days.find((d) => d.date === date);
  const op = Object.values(s.ops).find((o) => o.monthKey === monthKey && o.date === date);
  return op ? op.value : (day?.raw ?? "");
}
