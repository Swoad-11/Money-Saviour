import { sheetFormulaTotal } from "@/core/parse";
import type { Api } from "./api";
import type { SheetMonth, Workbook } from "./schema";

/**
 * Made-up data in the same shape and style as a real sheet, so the app can be
 * tried without connecting. Deterministic: the same month always looks the same.
 */
const DAILY = [
  ["nasta", 40, 80],
  ["vara", 20, 180],
  ["khabar", 150, 400],
  ["snacks", 30, 150],
  ["coffee", 20, 120],
];
const OCCASIONAL = [
  ["murgi", 450, 900],
  ["dim", 200, 380],
  ["shobji", 60, 220],
  ["groceries", 300, 2400],
  ["medicine", 100, 2500],
  ["uber", 200, 1500],
  ["biscuits", 50, 300],
  ["mach", 300, 1800],
  ["daraz", 200, 900],
  ["pizza", 200, 600],
  ["napit", 70, 90],
  ["masjid", 20, 100],
] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function pick(r: () => number, min: number, max: number) {
  return Math.round((min + r() * (max - min)) / 5) * 5;
}

export function sampleMonth(year: number, month: number, upToDay?: number): SheetMonth {
  const r = rng(year * 100 + month);
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = [];
  for (let d = 1; d <= dim; d++) {
    const items: string[] = [];
    if (!upToDay || d <= upToDay) {
      if (d === 1) items.push(`gas bill=${1080}`, `electric bill=${pick(r, 800, 2000)}`);
      if (d === 7) items.push("net bill=500", "guard=200", "hujur=100");
      for (const [name, min, max] of DAILY) if (r() < 0.55) items.push(`${name}=${pick(r, min as number, max as number)}`);
      for (const [name, min, max] of OCCASIONAL) if (r() < 0.08) items.push(`${name}=${pick(r, min, max)}`);
      if (r() < 0.04) items.push(`masjid=${pick(r, 50, 200)}+${pick(r, 20, 100)}`);
    }
    const raw = items.join(", ");
    days.push({
      date: `${key}-${String(d).padStart(2, "0")}`,
      rowIndex: 1 + d, // header in row 1, like the real sheet
      raw,
      sheetTotal: raw ? sheetFormulaTotal(raw) : null,
    });
  }
  const total = days.reduce((s, d) => s + (d.sheetTotal ?? 0), 0);
  return {
    key,
    tab: MONTH_NAMES[month - 1]!,
    income: null,
    days,
    sheetGrandTotal: total,
    warnings: [],
  };
}

export function createSampleApi(today = new Date()): Api {
  const year = today.getFullYear();
  const lastMonth = today.getMonth() + 1;
  const months = Array.from({ length: lastMonth }, (_, i) =>
    sampleMonth(year, i + 1, i + 1 === lastMonth ? today.getDate() : undefined),
  );
  const workbook: Workbook = {
    title: `Sample expenses - ${year}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year,
    months: months.map((m) => ({ tab: m.tab, key: m.key })),
  };
  return {
    ping: async () => ({ version: "sample", title: workbook.title }),
    getWorkbook: async () => workbook,
    getMonths: async (tabs) => (tabs ? months.filter((m) => tabs.includes(m.tab)) : months),
  };
}
