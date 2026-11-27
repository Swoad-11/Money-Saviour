import { daysInMonth } from "./summarize";

export interface BulkLine {
  /** 1-based line number in the pasted text. */
  line: number;
  /** ISO date the items go to, or null when the line's date is invalid. */
  date: string | null;
  /** The items text, e.g. "nasta=60, vara=20". */
  text: string;
  error?: string;
}

const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})\s*[:\-–.]?\s+(.*)$/;
const SHEET = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s*[:\-–.]?\s+(.*)$/; // MM-DD-YYYY, as the sheet shows dates
const DAY = /^(\d{1,2})\s*[:.)\-–]\s*(.*)$|^(\d{1,2})\s+(?=\D)(.*)$/;

const pad = (n: number) => String(n).padStart(2, "0");

function isoIfValid(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1) return null;
  const key = `${y}-${pad(m)}`;
  if (d > daysInMonth(key)) return null;
  return `${key}-${pad(d)}`;
}

/**
 * Parse pasted bulk input. Each non-empty line is one day:
 *   "08 nasta=60, vara=20"        day of the selected month
 *   "8: nasta=60"                 same
 *   "2026-11-08 nasta=60"         full date
 *   "11-08-2026 nasta=60"         date as the sheet shows it (MM-DD-YYYY)
 *   "nasta=60, vara=20"           no date: goes to `fallbackDate`
 * A line like "7up=40" is an item, not day 7, because the day must be followed by a separator.
 */
export function parseBulk(input: string, monthKey: string, fallbackDate: string): BulkLine[] {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  const out: BulkLine[] = [];
  input.split(/\r?\n/).forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line) return;
    let date: string | null = fallbackDate;
    let text = line;
    let error: string | undefined;

    const iso = ISO.exec(line);
    const sheet = !iso ? SHEET.exec(line) : null;
    const day = !iso && !sheet ? DAY.exec(line) : null;
    if (iso) {
      date = isoIfValid(Number(iso[1]), Number(iso[2]), Number(iso[3]));
      text = iso[4] ?? "";
    } else if (sheet) {
      date = isoIfValid(Number(sheet[3]), Number(sheet[1]), Number(sheet[2]));
      text = sheet[4] ?? "";
    } else if (day && !/^\d+\s*=/.test(line)) {
      date = isoIfValid(y, m, Number(day[1] ?? day[3]));
      text = (day[2] ?? day[4] ?? "").trim();
    }
    if (!date) error = "Not a valid date in this month";
    else if (!date.startsWith(monthKey)) error = `${date} isn't in this month`;
    if (!text.includes("=")) error ??= "No name=amount items on this line";
    out.push({ line: i + 1, date: error ? null : date, text, ...(error ? { error } : {}) });
  });
  return out;
}

/** Group valid lines by date, joining their items in order. */
export function groupBulk(lines: BulkLine[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const l of lines) {
    if (!l.date || l.error) continue;
    const prev = map.get(l.date);
    map.set(l.date, prev ? `${prev}, ${l.text}` : l.text);
  }
  return map;
}
