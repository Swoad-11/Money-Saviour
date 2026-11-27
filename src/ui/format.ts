import type { Category } from "@/core";

const money = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** ৳1,25,000 (lakh grouping). Negative amounts get a leading minus. */
export function taka(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${n < 0 ? "−" : ""}৳${money.format(Math.abs(n))}`;
}

export function categoryColor(c: Pick<Category, "color"> | undefined): string {
  return c && c.color !== null ? `var(--cat-${c.color})` : "var(--cat-neutral)";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-11" → "November 2026" */
export function monthLabel(key: string, long = true): string {
  const [y, m] = key.split("-").map(Number);
  return `${(long ? LONG : MONTHS)[m! - 1]} ${y}`;
}

/** "2026-11-08" → { day: "08", weekday: "Sun" } */
export function dayParts(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return {
    day: iso.slice(8, 10),
    weekday: d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }),
  };
}

/** Today's ISO date in a given time zone. */
export function todayIn(timeZone: string | undefined): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** "8 Nov, 3:05 pm" */
export function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" });
}
