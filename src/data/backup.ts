import { z } from "zod";
import { SheetMonthSchema, WorkbookSchema } from "./schema";

/**
 * Backup file format. Holds everything this device knows for one data source.
 * Deliberately excludes the access token and script URL: a backup file must be
 * safe to keep in a downloads folder or cloud drive.
 */
export const BACKUP_VERSION = 1;

const KindSchema = z.enum(["fixed", "variable"]);

const CategorySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  color: z.number().int().min(0).max(6).nullable(),
  kind: KindSchema,
  monthlyBudget: z.number().optional(),
  archived: z.boolean(),
  order: z.number(),
  updatedAt: z.string().optional(),
});

const RuleSchema = z.object({
  id: z.string(),
  key: z.string().min(1),
  aliases: z.array(z.string()),
  categoryId: z.string().min(1),
  kind: KindSchema.optional(),
  origin: z.enum(["builtin", "user"]),
  updatedAt: z.string().optional(),
});

const TemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  items: z.array(z.object({ name: z.string(), amount: z.string(), day: z.number().int().min(1).max(31) })),
  updatedAt: z.string().optional(),
});

const OutboxOpSchema = z.object({
  id: z.string(),
  source: z.string(),
  monthKey: z.string(),
  tab: z.string(),
  rowIndex: z.number().int().positive(),
  date: z.string(),
  expected: z.string(),
  value: z.string(),
  state: z.enum(["pending", "failed", "conflict"]),
  attempts: z.number(),
  error: z.string().optional(),
  sheetRaw: z.string().optional(),
  updatedAt: z.string(),
});

export const BackupSchema = z.object({
  app: z.literal("money-saviour"),
  schemaVersion: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  source: z.enum(["sheet", "sample"]),
  workbook: WorkbookSchema.nullable(),
  months: z.array(SheetMonthSchema),
  config: z.object({
    categories: z.array(CategorySchema),
    userRules: z.array(RuleSchema),
    templates: z.array(TemplateSchema),
  }),
  outbox: z.array(OutboxOpSchema),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

export type Backup = z.infer<typeof BackupSchema>;

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

/** Validate a backup file's text. Never throws. */
export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON." };
  }
  if (!json || typeof json !== "object" || (json as { app?: unknown }).app !== "money-saviour") {
    return { ok: false, error: "This isn't a Money Saviour backup." };
  }
  const v = (json as { schemaVersion?: unknown }).schemaVersion;
  if (typeof v === "number" && v > BACKUP_VERSION) {
    return { ok: false, error: "This backup was made by a newer version of the app. Update the app first." };
  }
  const r = BackupSchema.safeParse(json);
  if (!r.success) {
    const issue = r.error.issues[0];
    return { ok: false, error: `The backup is damaged or incomplete (${issue?.path.join(".") || "file"}).` };
  }
  return { ok: true, backup: r.data };
}
