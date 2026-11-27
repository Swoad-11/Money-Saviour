import { create } from "zustand";
import { ApiError, createHttpApi, type Api } from "@/data/api";
import { createSampleApi } from "@/data/sample";
import { loadCache, saveCache } from "@/data/db";
import type { SheetMonth, Workbook } from "@/data/schema";
import { useConnection, type ConnectionState } from "./connection";

export type SyncStatus = "idle" | "loading" | "syncing" | "ready" | "error";

interface DataState {
  status: SyncStatus;
  /** Last refresh error; cached data stays usable when this is set. */
  error: { code: string; message: string } | null;
  workbook: Workbook | null;
  months: Record<string, SheetMonth>;
  fetchedAt: string | null;
  fromCache: boolean;
  /** Load cache for the current source, then refresh from it. */
  start: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function apiFor(c: ConnectionState): Api | null {
  if (c.source === "sample") return createSampleApi();
  if (c.source === "sheet" && c.scriptUrl && c.token) return createHttpApi(c);
  return null;
}

let generation = 0;

export const useData = create<DataState>((set, get) => ({
  status: "idle",
  error: null,
  workbook: null,
  months: {},
  fetchedAt: null,
  fromCache: false,

  start: async () => {
    const gen = ++generation;
    const { source } = useConnection.getState();
    set({ status: "loading", error: null, workbook: null, months: {}, fetchedAt: null, fromCache: false });
    if (source === "none") {
      set({ status: "idle" });
      return;
    }
    try {
      const cache = await loadCache(source);
      if (gen !== generation) return;
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
      /* no cache available (private mode); carry on with the network */
    }
    await get().refresh();
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
      let fetchedAt = new Date().toISOString();
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
}));

/** Months in calendar order. */
export function sortedMonths(months: Record<string, SheetMonth>) {
  return Object.values(months).sort((a, b) => a.key.localeCompare(b.key));
}
