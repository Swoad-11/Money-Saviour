import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Category, Rule } from "@/core/types";
import type { Template } from "@/core/templates";
import type { SheetMonth, Workbook } from "./schema";

/** Cache of the last good read, per data source ("sheet" or "sample"). */
export interface CachedWorkbook {
  source: string;
  workbook: Workbook;
  fetchedAt: string;
}
export interface CachedMonth extends SheetMonth {
  source: string;
  fetchedAt: string;
}

/** An edit to one column B cell that the sheet hasn't confirmed yet. */
export interface OutboxOp {
  /** "source|monthKey|date": one op per cell; later edits replace the value. */
  id: string;
  source: string;
  monthKey: string;
  tab: string;
  rowIndex: number;
  date: string;
  /** Column B as last read from the sheet. */
  expected: string;
  value: string;
  state: "pending" | "failed" | "conflict";
  attempts: number;
  error?: string;
  /** For conflicts: what the sheet holds now. */
  sheetRaw?: string;
  updatedAt: string;
}

/** Categories and the user's rules for one data source, with changes not yet saved to the sheet. */
export interface StoredConfig {
  source: string;
  categories: Category[];
  userRules: Rule[];
  dirtyCategories: string[];
  dirtyRules: string[];
  deletedRules: string[];
  /** Added in M6; older saved copies don't have these. */
  templates?: Template[];
  dirtyTemplates?: string[];
  deletedTemplates?: string[];
}

interface MsDB extends DBSchema {
  workbook: { key: string; value: CachedWorkbook };
  months: { key: [string, string]; value: CachedMonth; indexes: { bySource: string } };
  outbox: { key: string; value: OutboxOp; indexes: { bySource: string } };
  config: { key: string; value: StoredConfig };
}

let dbPromise: Promise<IDBPDatabase<MsDB>> | null = null;

export function db() {
  dbPromise ??= openDB<MsDB>("money-saviour", 3, {
    // Another tab (or a newer app version) wants to upgrade: let go so it isn't blocked.
    blocking() {
      void dbPromise?.then((d) => d.close());
      dbPromise = null;
    },
    terminated() {
      dbPromise = null;
    },
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore("workbook", { keyPath: "source" });
        const months = d.createObjectStore("months", { keyPath: ["source", "key"] });
        months.createIndex("bySource", "source");
      }
      if (oldVersion < 2) {
        const outbox = d.createObjectStore("outbox", { keyPath: "id" });
        outbox.createIndex("bySource", "source");
      }
      if (oldVersion < 3) d.createObjectStore("config", { keyPath: "source" });
    },
  });
  return dbPromise;
}

export async function loadCache(source: string) {
  const d = await db();
  const [wb, months] = await Promise.all([
    d.get("workbook", source),
    d.getAllFromIndex("months", "bySource", source),
  ]);
  return { workbook: wb ?? null, months };
}

export async function saveCache(source: string, workbook: Workbook, months: SheetMonth[]) {
  const d = await db();
  const fetchedAt = new Date().toISOString();
  const tx = d.transaction(["workbook", "months"], "readwrite");
  await tx.objectStore("workbook").put({ source, workbook, fetchedAt });
  const store = tx.objectStore("months");
  // Replace this source's months so deleted tabs don't linger.
  for (const key of await store.index("bySource").getAllKeys(source)) await store.delete(key);
  for (const m of months) await store.put({ ...m, source, fetchedAt });
  await tx.done;
  return fetchedAt;
}

export async function putMonth(source: string, month: SheetMonth) {
  const d = await db();
  await d.put("months", { ...month, source, fetchedAt: new Date().toISOString() });
}

export async function loadOutbox(source: string): Promise<OutboxOp[]> {
  const d = await db();
  return d.getAllFromIndex("outbox", "bySource", source);
}

export async function saveOps(put: OutboxOp[], remove: string[] = []) {
  const d = await db();
  const tx = d.transaction("outbox", "readwrite");
  for (const id of remove) await tx.store.delete(id);
  for (const op of put) await tx.store.put(op);
  await tx.done;
}

export async function loadConfig(source: string): Promise<StoredConfig | null> {
  const d = await db();
  return (await d.get("config", source)) ?? null;
}

export async function saveConfig(cfg: StoredConfig) {
  const d = await db();
  await d.put("config", cfg);
}

/** Clears cached sheet data. Unsynced edits (the outbox) are kept unless includeOutbox is set. */
export async function clearCache(includeOutbox = false) {
  const d = await db();
  const stores = includeOutbox
    ? (["workbook", "months", "outbox"] as const)
    : (["workbook", "months"] as const);
  const tx = d.transaction([...stores], "readwrite");
  await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
  await tx.done;
}
