import { openDB, type DBSchema, type IDBPDatabase } from "idb";
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

interface MsDB extends DBSchema {
  workbook: { key: string; value: CachedWorkbook };
  months: { key: [string, string]; value: CachedMonth; indexes: { bySource: string } };
}

let dbPromise: Promise<IDBPDatabase<MsDB>> | null = null;

export function db() {
  dbPromise ??= openDB<MsDB>("money-saviour", 1, {
    upgrade(d) {
      d.createObjectStore("workbook", { keyPath: "source" });
      const months = d.createObjectStore("months", { keyPath: ["source", "key"] });
      months.createIndex("bySource", "source");
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

export async function clearCache() {
  const d = await db();
  const tx = d.transaction(["workbook", "months"], "readwrite");
  await Promise.all([tx.objectStore("workbook").clear(), tx.objectStore("months").clear()]);
  await tx.done;
}
