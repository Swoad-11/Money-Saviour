import { normalizeName } from "./normalize";
import { evalAmount, parseCell } from "./parse";
import { appendToCell } from "./serialize";
import { daysInMonth, type MonthSummary } from "./summarize";
import type { MonthRecord } from "./types";

export interface TemplateItem {
  name: string;
  /** As typed: "1080" or "500+100". */
  amount: string;
  /** Day of month, 1-31. Longer than the month means its last day. */
  day: number;
}

export interface Template {
  id: string;
  name: string;
  items: TemplateItem[];
  updatedAt?: string;
}

export type PreviewStatus = "new" | "present" | "invalid";

export interface PreviewRow {
  index: number;
  item: TemplateItem;
  date: string | null;
  amount: number;
  status: PreviewStatus;
  note?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * What applying a template to a month would do. An item already on its day
 * (same name after normalizing) is "present" and skipped by default.
 */
export function previewTemplate(t: Template, month: MonthRecord): PreviewRow[] {
  const last = daysInMonth(month.key);
  return t.items.map((item, index) => {
    const amount = evalAmount(item.amount) ?? 0;
    const key = normalizeName(item.name);
    if (!key || amount <= 0) return { index, item, date: null, amount, status: "invalid", note: "Needs a name and an amount" };
    const day = Math.min(Math.max(1, Math.round(item.day) || 1), last);
    const date = `${month.key}-${pad(day)}`;
    const row = month.days.find((d) => d.date === date);
    if (!row) return { index, item, date: null, amount, status: "invalid", note: "This day isn't in the sheet" };
    const note = item.day > last ? `Day ${item.day} → ${day} (last day of the month)` : undefined;
    const present = parseCell(row.raw).items.some((i) => i.key === key);
    return { index, item, date, amount, status: present ? "present" : "new", ...(note ? { note } : {}) };
  });
}

/** The cell changes for the chosen rows: each day's new items appended after what it has. */
export function templateChanges(rows: PreviewRow[], month: MonthRecord, chosen: Set<number>) {
  const add = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.date || r.status === "invalid" || !chosen.has(r.index)) continue;
    add.set(r.date, [...(add.get(r.date) ?? []), `${r.item.name.trim()}=${r.item.amount.trim()}`]);
  }
  return [...add].map(([date, parts]) => ({
    date,
    value: appendToCell(month.days.find((d) => d.date === date)?.raw ?? "", parts.join(", ")),
  }));
}

/** A template from a month's fixed items: each item once, on the day and amount it last had. */
export function templateFromMonth(s: MonthSummary): TemplateItem[] {
  const byKey = new Map<string, TemplateItem>();
  for (const d of s.days)
    for (const i of d.items)
      if (i.kind === "fixed") byKey.set(i.key, { name: i.name, amount: i.amountExpr, day: Number(d.date.slice(8, 10)) });
  return [...byKey.values()].sort((a, b) => a.day - b.day || a.name.localeCompare(b.name));
}

export function templateTotal(t: Pick<Template, "items">): number {
  return t.items.reduce((s, i) => s + (evalAmount(i.amount) ?? 0), 0);
}
