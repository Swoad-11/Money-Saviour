import { create } from "zustand";
import { ApiError, createHttpApi, type Api } from "@/data/api";
import { sampleApi } from "@/data/sample";
import { loadCache, loadOutbox, putMonth, saveCache, saveOps, type OutboxOp } from "@/data/db";
import type { SheetMonth, Workbook } from "@/data/schema";
import { useConnection, type ConnectionState } from "./connection";

export type SyncStatus = "idle" | "loading" | "syncing" | "ready" | "error";

export interface CellChange {
  monthKey: string;
  date: string;
  value: string;
}

interface UndoEntry {
  label: string;
  cells: { monthKey: string; date: string; before: string; after: string }[];
}

interface DataState {
  status: SyncStatus;
  /** Last read error; cached data stays usable when this is set. */
  error: { code: string; message: string } | null;
  /** Last write error that stopped sending (auth, read-only backend). */
  writeError: string | null;
  workbook: Workbook | null;
  /** Months as the sheet last confirmed them. Pending edits live in `ops`. */
  months: Record<string, SheetMonth>;
  fetchedAt: string | null;
  fromCache: boolean;
  /** Unconfirmed edits, one per cell. */
  ops: Record<string, OutboxOp>;
  sending: boolean;
  undoStack: UndoEntry[];

  start: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Change column B of one or more days. Applied at once, then sent to the sheet. */
  editCells: (changes: CellChange[], label: string, opts?: { recordUndo?: boolean }) => void;
  undo: () => UndoEntry | null;
  flush: () => Promise<void>;
  /** "mine": overwrite the sheet with my text. "sheet": drop my edit. */
  resolveConflict: (opId: string, choice: "mine" | "sheet") => void;
  retryFailed: () => void;
  /** Drop an unconfirmed edit; the day shows the sheet's text again. */
  discardOp: (opId: string) => void;
}

export function apiFor(c: ConnectionState): Api | null {
  if (c.source === "sample") return sampleApi();
  if (c.source === "sheet" && c.scriptUrl && c.token) return createHttpApi(c);
  return null;
}

export const opId = (source: string, monthKey: string, date: string) => `${source}|${monthKey}|${date}`;

let generation = 0;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let onlineHooked = false;

const now = () => new Date().toISOString();
const formulaTotal = (raw: string) => {
  // Same as the sheet's column C formula; used until the sheet confirms.
  let s = 0;
  for (const run of raw.split(/[^0-9.]+/)) if (run && Number.isFinite(Number(run))) s += Number(run);
  return raw ? Math.round(s * 100) / 100 : null;
};

export const useData = create<DataState>((set, get) => {
  function scheduleFlush(delay = 600) {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => void get().flush(), delay);
  }

  function updateDay(monthKey: string, date: string, raw: string, sheetTotal: number | null) {
    const m = get().months[monthKey];
    if (!m) return;
    const months = {
      ...get().months,
      [monthKey]: { ...m, days: m.days.map((d) => (d.date === date ? { ...d, raw, sheetTotal } : d)) },
    };
    set({ months });
    void putMonth(useConnection.getState().source, months[monthKey]!).catch(() => {});
  }

  return {
    status: "idle",
    error: null,
    writeError: null,
    workbook: null,
    months: {},
    fetchedAt: null,
    fromCache: false,
    ops: {},
    sending: false,
    undoStack: [],

    start: async () => {
      const gen = ++generation;
      clearTimeout(flushTimer);
      const { source } = useConnection.getState();
      set({
        status: "loading",
        error: null,
        writeError: null,
        workbook: null,
        months: {},
        fetchedAt: null,
        fromCache: false,
        ops: {},
        undoStack: [],
      });
      if (!onlineHooked && typeof window !== "undefined") {
        onlineHooked = true;
        window.addEventListener("online", () => void get().flush());
      }
      if (source === "none") {
        set({ status: "idle" });
        return;
      }
      try {
        // Don't let a slow or blocked local database hold up the sheet: give it a moment, then go on.
        const [cache, ops] = await Promise.race([
          Promise.all([loadCache(source), loadOutbox(source)]),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("cache timeout")), 2500)),
        ]);
        if (gen !== generation) return;
        set({ ops: Object.fromEntries(ops.map((o) => [o.id, o])) });
        if (cache.workbook) {
          set({
            workbook: cache.workbook.workbook,
            months: Object.fromEntries(cache.months.map((m) => [m.key, m])),
            fetchedAt: cache.workbook.fetchedAt,
            fromCache: true,
            status: "ready",
          });
        }
      } catch {
        // No cache yet (private mode, or the database is slow to open). Keep trying to load
        // unsynced edits in the background so they're never lost, merging under newer ones.
        void loadOutbox(source)
          .then((saved) => {
            if (gen !== generation || !saved.length) return;
            set({ ops: { ...Object.fromEntries(saved.map((o) => [o.id, o])), ...get().ops } });
            void get().flush();
          })
          .catch(() => {});
      }
      await get().refresh();
      if (gen === generation) void get().flush();
    },

    refresh: async () => {
      const gen = generation;
      const conn = useConnection.getState();
      const api = apiFor(conn);
      if (!api) return;
      set({ status: "syncing", error: null });
      try {
        const workbook = await api.getWorkbook();
        const months = await api.getMonths();
        if (gen !== generation) return;
        let fetchedAt = now();
        try {
          fetchedAt = await saveCache(conn.source, workbook, months);
        } catch {
          /* cache write failed; data is still shown */
        }
        set({
          workbook,
          months: Object.fromEntries(months.map((m) => [m.key, m])),
          fetchedAt,
          fromCache: false,
          status: "ready",
        });
      } catch (e) {
        if (gen !== generation) return;
        const err =
          e instanceof ApiError ? { code: e.code, message: e.message } : { code: "SERVER", message: String(e) };
        set({ error: err, status: get().workbook ? "ready" : "error" });
      }
    },

    editCells: (changes, label, opts = {}) => {
      const { source } = useConnection.getState();
      const { months, ops } = get();
      const nextOps = { ...ops };
      const put: OutboxOp[] = [];
      const remove: string[] = [];
      const undoCells: UndoEntry["cells"] = [];

      for (const c of changes) {
        const month = months[c.monthKey];
        const day = month?.days.find((d) => d.date === c.date);
        if (!month || !day) continue;
        const id = opId(source, c.monthKey, c.date);
        const existing = nextOps[id];
        const shown = existing ? existing.value : day.raw;
        if (c.value === shown) continue;
        undoCells.push({ monthKey: c.monthKey, date: c.date, before: shown, after: c.value });

        if (existing?.state !== "conflict" && c.value === day.raw) {
          // Back to what the sheet already has: nothing to send.
          delete nextOps[id];
          remove.push(id);
          continue;
        }
        const op: OutboxOp = {
          id,
          source,
          monthKey: c.monthKey,
          tab: month.tab,
          rowIndex: day.rowIndex,
          date: c.date,
          expected: existing?.expected ?? day.raw,
          value: c.value,
          state: existing?.state === "conflict" ? "conflict" : "pending",
          attempts: 0,
          sheetRaw: existing?.sheetRaw,
          updatedAt: now(),
        };
        nextOps[id] = op;
        put.push(op);
      }

      if (!undoCells.length) return;
      set({
        ops: nextOps,
        writeError: null,
        undoStack:
          opts.recordUndo === false
            ? get().undoStack
            : [...get().undoStack.slice(-49), { label, cells: undoCells }],
      });
      void saveOps(put, remove).catch(() => {});
      scheduleFlush();
    },

    undo: () => {
      const stack = get().undoStack;
      const last = stack[stack.length - 1];
      if (!last) return null;
      set({ undoStack: stack.slice(0, -1) });
      get().editCells(
        last.cells.map((c) => ({ monthKey: c.monthKey, date: c.date, value: c.before })),
        `Undo ${last.label}`,
        { recordUndo: false },
      );
      return last;
    },

    flush: async () => {
      if (get().sending) return;
      const conn = useConnection.getState();
      const api = apiFor(conn);
      const pending = Object.values(get().ops).filter((o) => o.state === "pending" && o.source === conn.source);
      if (!api || !pending.length) return;

      const gen = generation;
      const sent = new Map(pending.map((o) => [o.id, o.value]));
      set({ sending: true });
      try {
        const results = await api.setCells(
          pending.map((o) => ({
            id: o.id,
            tab: o.tab,
            rowIndex: o.rowIndex,
            date: o.date,
            expected: o.expected,
            value: o.value,
          })),
        );
        if (gen !== generation) return;
        const ops = { ...get().ops };
        const put: OutboxOp[] = [];
        const remove: string[] = [];
        for (const r of results) {
          const op = ops[r.id];
          if (!op) continue;
          if (r.status === "ok") {
            updateDay(op.monthKey, op.date, r.raw ?? "", r.sheetTotal);
            if (op.value === sent.get(r.id)) {
              delete ops[r.id];
              remove.push(r.id);
            } else {
              // Edited again while this was in flight: send the newer text next.
              ops[r.id] = { ...op, expected: r.raw ?? "", attempts: 0 };
              put.push(ops[r.id]!);
            }
          } else if (r.status === "conflict") {
            updateDay(op.monthKey, op.date, r.raw ?? "", r.sheetTotal);
            ops[r.id] = { ...op, state: "conflict", sheetRaw: r.raw ?? "", updatedAt: now() };
            put.push(ops[r.id]!);
          } else {
            ops[r.id] = {
              ...op,
              state: "failed",
              error: "This row isn't in the sheet any more (moved or deleted). Sync, then edit again.",
              updatedAt: now(),
            };
            put.push(ops[r.id]!);
          }
        }
        set({ ops, writeError: null });
        void saveOps(put, remove).catch(() => {});
      } catch (e) {
        if (gen !== generation) return;
        const transient = !(e instanceof ApiError) || e.code === "NETWORK" || e.code === "SERVER";
        const ops = { ...get().ops };
        const put: OutboxOp[] = [];
        let maxAttempts = 0;
        for (const id of sent.keys()) {
          const op = ops[id];
          if (!op) continue;
          const attempts = op.attempts + 1;
          maxAttempts = Math.max(maxAttempts, attempts);
          ops[id] = transient
            ? { ...op, attempts, error: e instanceof Error ? e.message : String(e) }
            : { ...op, state: "failed", attempts, error: e instanceof Error ? e.message : String(e) };
          put.push(ops[id]!);
        }
        set({ ops, writeError: transient ? null : e instanceof Error ? e.message : String(e) });
        void saveOps(put).catch(() => {});
        if (transient) scheduleFlush(Math.min(30_000, 1000 * 2 ** maxAttempts));
      } finally {
        set({ sending: false });
      }
      if (Object.values(get().ops).some((o) => o.state === "pending" && o.attempts === 0)) scheduleFlush(50);
    },

    discardOp: (id) => {
      if (!get().ops[id]) return;
      const ops = { ...get().ops };
      delete ops[id];
      set({ ops });
      void saveOps([], [id]).catch(() => {});
    },

    resolveConflict: (id, choice) => {
      const op = get().ops[id];
      if (!op || op.state !== "conflict") return;
      if (choice === "sheet") {
        get().discardOp(id);
        return;
      }
      const ops = { ...get().ops };
      const next: OutboxOp = {
        ...op,
        state: "pending",
        expected: op.sheetRaw ?? "",
        sheetRaw: undefined,
        attempts: 0,
        error: undefined,
        updatedAt: now(),
      };
      ops[id] = next;
      set({ ops });
      void saveOps([next]).catch(() => {});
      scheduleFlush(0);
    },

    retryFailed: () => {
      const ops = { ...get().ops };
      const put: OutboxOp[] = [];
      for (const [id, op] of Object.entries(ops)) {
        if (op.state === "failed" || (op.state === "pending" && op.attempts > 0)) {
          ops[id] = { ...op, state: "pending", attempts: 0, error: undefined };
          put.push(ops[id]!);
        }
      }
      set({ ops, writeError: null });
      void saveOps(put).catch(() => {});
      scheduleFlush(0);
    },
  };
});

/** Months in calendar order. */
export function sortedMonths(months: Record<string, SheetMonth>) {
  return Object.values(months).sort((a, b) => a.key.localeCompare(b.key));
}

/** A month with unconfirmed edits applied, which is what the UI shows. */
export function withPending(month: SheetMonth, ops: Record<string, OutboxOp>, source: string): SheetMonth {
  let changed = false;
  const days = month.days.map((d) => {
    const op = ops[opId(source, month.key, d.date)];
    if (!op || op.value === d.raw) return d;
    changed = true;
    return { ...d, raw: op.value, sheetTotal: formulaTotal(op.value) };
  });
  return changed ? { ...month, days } : month;
}
