import { BACKUP_VERSION, type Backup } from "@/data/backup";
import { useConnection } from "./connection";
import { useConfig } from "./config";
import { useData, sortedMonths } from "./data";
import { useTheme } from "./theme";

/** Everything this device holds for the current data source. No token, no script URL. */
export function createBackup(): Backup {
  const source = useConnection.getState().source;
  if (source === "none") throw new Error("Connect a data source first.");
  const d = useData.getState();
  const c = useConfig.getState();
  return {
    app: "money-saviour",
    schemaVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    source,
    workbook: d.workbook,
    months: sortedMonths(d.months),
    config: { categories: c.categories, userRules: c.userRules, templates: c.templates },
    outbox: Object.values(d.ops),
    theme: useTheme.getState().pref,
  };
}

export interface RestoreOptions {
  config: boolean;
  edits: boolean;
}

export interface RestoreResult {
  rules: number;
  categories: number;
  templates: number;
  edits: number;
  monthsUsed: boolean;
  skippedReason?: string;
}

/**
 * Apply a backup to the current data source.
 * - Categories, rules and templates are merged in and then saved to the sheet.
 * - Unsynced edits come back held: they are only sent after the user presses Retry.
 * - Backed-up months are used only when this device has no data yet.
 * Edits and months from a different spreadsheet are never applied.
 */
export async function applyBackup(b: Backup, opts: RestoreOptions): Promise<RestoreResult> {
  const source = useConnection.getState().source;
  const d = useData.getState();
  const sameSheet =
    b.source === source && (!b.workbook || !d.workbook || b.workbook.title === d.workbook.title);
  const result: RestoreResult = { rules: 0, categories: 0, templates: 0, edits: 0, monthsUsed: false };

  if (opts.config) {
    useConfig.getState().restore(b.config);
    result.rules = b.config.userRules.length;
    result.categories = b.config.categories.length;
    result.templates = b.config.templates.length;
  }
  if (!sameSheet) {
    result.skippedReason = "Edits and months were left out because the backup is from a different spreadsheet.";
    return result;
  }
  if (opts.edits) result.edits = useData.getState().restoreOps(b.outbox);
  if (b.workbook && b.months.length) result.monthsUsed = await useData.getState().restoreMonths(b.workbook, b.months);
  return result;
}
