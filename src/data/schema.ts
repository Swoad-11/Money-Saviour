import { z } from "zod";

export const MonthRefSchema = z.object({ tab: z.string(), key: z.string().regex(/^\d{4}-\d{2}$/) });

export const WorkbookSchema = z.object({
  title: z.string(),
  timeZone: z.string(),
  year: z.number().int().nullable(),
  months: z.array(MonthRefSchema),
});

export const DaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rowIndex: z.number().int().positive(),
  raw: z.string(),
  sheetTotal: z.number().nullable(),
});

export const SheetMonthSchema = z.object({
  key: z.string().regex(/^\d{4}-\d{2}$/),
  tab: z.string(),
  income: z.number().nullable(),
  days: z.array(DaySchema),
  sheetGrandTotal: z.number().nullable(),
  warnings: z.array(z.string()).default([]),
});

export const SetCellResultSchema = z.object({
  id: z.string(),
  status: z.enum(["ok", "conflict", "not_found"]),
  raw: z.string().nullable(),
  sheetTotal: z.number().nullable(),
});

export interface CellEdit {
  id: string;
  tab: string;
  rowIndex: number;
  date: string;
  /** Column B as the app last read it; the write only happens if the sheet still has this. */
  expected: string;
  value: string;
}

export type SetCellResult = z.infer<typeof SetCellResultSchema>;

/** Settings rows travel as text, exactly as stored in the _Categories and _Rules tabs. */
const Str = z.string().default("");
export const CategoryRowSchema = z.object({
  id: z.string(),
  name: Str,
  color: Str,
  kind: Str,
  archived: Str,
  order: Str,
  updatedAt: Str,
});
export const RuleRowSchema = z.object({
  key: z.string(),
  aliases: Str,
  categoryId: Str,
  kind: Str,
  updatedAt: Str,
});
export const TemplateRowSchema = z.object({
  id: z.string(),
  name: Str,
  itemsJson: Str,
  updatedAt: Str,
});
export const ConfigSchema = z.object({
  categories: z.array(CategoryRowSchema).default([]),
  rules: z.array(RuleRowSchema).default([]),
  templates: z.array(TemplateRowSchema).default([]),
});
export type CategoryRow = z.infer<typeof CategoryRowSchema>;
export type RuleRow = z.infer<typeof RuleRowSchema>;
export type TemplateRow = z.infer<typeof TemplateRowSchema>;
export type ConfigRows = z.infer<typeof ConfigSchema>;
export interface ConfigChanges {
  categories?: CategoryRow[];
  rules?: RuleRow[];
  templates?: TemplateRow[];
  deleteRules?: string[];
  deleteTemplates?: string[];
}

export const PingSchema = z.object({ version: z.string(), title: z.string() });

export const EnvelopeSchema = z.union([
  z.object({ ok: z.literal(true), data: z.unknown() }),
  z.object({
    ok: z.literal(false),
    error: z.object({ code: z.string(), message: z.string() }),
  }),
]);

export type Workbook = z.infer<typeof WorkbookSchema>;
export type SheetMonth = z.infer<typeof SheetMonthSchema>;
export type Ping = z.infer<typeof PingSchema>;
