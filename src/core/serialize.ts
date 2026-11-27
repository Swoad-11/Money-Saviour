import type { LineItem } from "./types";

export interface EditableItem {
  name: string;
  amountExpr: string;
  /** The original text when the item came from the sheet and wasn't changed. */
  original?: LineItem;
}

/** Text for one item: the original when untouched, otherwise "name=amount". */
export function itemText(item: EditableItem): string {
  const o = item.original;
  if (o && o.name === item.name.trim() && o.amountExpr === item.amountExpr.trim()) return o.text;
  return `${item.name.trim()}=${item.amountExpr.trim()}`;
}

/** Rebuild a column B cell from items. Items with no name and no amount are dropped. */
export function serializeCell(items: EditableItem[]): string {
  return items
    .filter((i) => i.name.trim() || i.amountExpr.trim())
    .map(itemText)
    .join(", ");
}

/** Append new items to an existing cell without touching what is already there. */
export function appendToCell(cell: string, addition: string): string {
  const base = cell.trim().replace(/[\s,]+$/, "");
  const add = addition.trim().replace(/^[\s,]+/, "");
  if (!add) return cell;
  return base ? `${base}, ${add}` : add;
}

export function toEditable(items: LineItem[]): EditableItem[] {
  return items.map((i) => ({ name: i.name, amountExpr: i.amountExpr, original: i }));
}
