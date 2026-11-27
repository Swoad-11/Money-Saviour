export type Kind = "fixed" | "variable";

/** "2026-11" */
export type MonthKey = string;

export const UNCATEGORIZED = "uncategorized";

export interface Category {
  id: string;
  name: string;
  /** Index into the chart palette. */
  color: number;
  kind: Kind;
  monthlyBudget?: number;
  archived: boolean;
  order: number;
}

export interface Rule {
  id: string;
  /** Normalized item name, unique across rules. */
  key: string;
  /** Other normalized spellings that map to the same rule. */
  aliases: string[];
  categoryId: string;
  /** Overrides the category's default kind. */
  kind?: Kind;
  origin: "builtin" | "user";
}

/** One dated row of a month tab, as stored in the sheet. */
export interface DayRecord {
  /** ISO date "2026-11-08". */
  date: string;
  /** 1-based sheet row index. */
  rowIndex: number;
  /** Column B text, as stored. */
  raw: string;
  /** Column C value computed by the sheet; null when the cell is empty. */
  sheetTotal: number | null;
}

export interface MonthRecord {
  key: MonthKey;
  tab: string;
  income: number | null;
  days: DayRecord[];
  sheetGrandTotal: number | null;
}

export type WarningCode =
  | "TOTAL_MISMATCH"
  | "UNPARSED_TEXT"
  | "BAD_AMOUNT"
  | "EMPTY_NAME";

export interface ParseWarning {
  code: WarningCode;
  message: string;
}

export interface LineItem {
  /** Exactly the text this item came from, e.g. "Masjid=500+100". */
  text: string;
  /** Display name as typed, trimmed: "Masjid". */
  name: string;
  /** Normalized lookup key: "masjid". */
  key: string;
  /** "500+100" */
  amountExpr: string;
  amount: number;
}

export interface CategorizedItem extends LineItem {
  categoryId: string;
  ruleId?: string;
  kind: Kind;
}

export interface ParsedCell {
  items: LineItem[];
  total: number;
  warnings: ParseWarning[];
}
