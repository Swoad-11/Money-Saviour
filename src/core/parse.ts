import { normalizeName } from "./normalize";
import type { LineItem, ParsedCell, ParseWarning } from "./types";

/**
 * One item is "name=amount". The name is everything since the previous item
 * (minus separators) that isn't "=". The amount is a number, optionally
 * "+"-joined: "500+100". Because the amount stops at the first non-number,
 * items are found even without a comma between them:
 *   "barbar=80 masjid=20"      → barbar 80, masjid 20
 *   "medicine=2000. tel=210"   → medicine 2000, tel 210
 */
const ITEM = /([^=]*?)=\s*(\d[\d.]*(?:\s*\+\s*\d[\d.]*)*)/g;
const LEADING_SEPARATORS = /^[\s,.;]+/;

export function evalAmount(expr: string): number | null {
  let sum = 0;
  for (const part of expr.split("+")) {
    const p = part.trim();
    if (!p) continue;
    const n = Number(p.endsWith(".") ? p.slice(0, -1) : p);
    if (!Number.isFinite(n)) return null;
    sum += n;
  }
  return round2(sum);
}

/**
 * What the sheet's column C formula computes:
 * =SUM(SPLIT(REGEXREPLACE(B, "[^0-9.]+", "|"), "|"))
 * Every run of digits and dots counts as a number; runs that aren't numbers are ignored.
 */
export function sheetFormulaTotal(cell: string): number {
  let sum = 0;
  for (const run of cell.split(/[^0-9.]+/)) {
    if (!run) continue;
    const n = Number(run);
    if (Number.isFinite(n)) sum += n;
  }
  return round2(sum);
}

export function parseCell(cell: string): ParsedCell {
  const items: LineItem[] = [];
  const warnings: ParseWarning[] = [];
  const leftovers: string[] = [];
  let last = 0;

  for (const m of cell.matchAll(ITEM)) {
    const start = m.index;
    const rawName = m[1] ?? "";
    const amountExpr = (m[2] ?? "").trim();
    const name = rawName.replace(LEADING_SEPARATORS, "").trim();
    const textStart = start + (rawName.length - rawName.replace(LEADING_SEPARATORS, "").length);
    const text = cell.slice(textStart, start + m[0].length).trim();
    last = start + m[0].length;

    const amount = evalAmount(amountExpr);
    if (amount === null) {
      warnings.push({ code: "BAD_AMOUNT", message: `Can't read the amount in "${text}"` });
      continue;
    }
    if (!normalizeName(name)) {
      warnings.push({ code: "EMPTY_NAME", message: `"${text}" has an amount but no name` });
    }
    items.push({ text, name, key: normalizeName(name), amountExpr, amount });
  }

  const tail = cell.slice(last);
  if (/[\p{L}\p{N}]/u.test(tail)) leftovers.push(tail.trim());
  // Text between items that never became part of a name (only possible before the first "=").
  if (items.length === 0 && cell.trim() && !leftovers.length) leftovers.push(cell.trim());

  for (const t of leftovers) {
    warnings.push({ code: "UNPARSED_TEXT", message: `"${t}" isn't in name=amount form` });
  }

  const total = round2(items.reduce((s, i) => s + i.amount, 0));
  return { items, total, warnings };
}

/**
 * Compare the parsed total with column C. When C is empty (null) the formula is
 * emulated, so a typo still surfaces before the sheet has recalculated.
 */
export function reconcile(parsed: ParsedCell, raw: string, sheetTotal: number | null): ParsedCell {
  const expected = sheetTotal ?? sheetFormulaTotal(raw);
  if (Math.abs(expected - parsed.total) < 0.005) return parsed;
  return {
    ...parsed,
    warnings: [
      ...parsed.warnings,
      {
        code: "TOTAL_MISMATCH",
        message: `Items add up to ${parsed.total}, but the sheet total is ${expected}`,
      },
    ],
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
