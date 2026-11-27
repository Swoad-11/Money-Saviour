import { useEffect, useState } from "react";

/** Current values of the design tokens, so charts follow light/dark. */
export interface ChartTheme {
  primary: string;
  neutral: string;
  fixed: string;
  variable: string;
  surface: string;
  grid: string;
  text: string;
  muted: string;
}

function readTheme(): ChartTheme {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    primary: v("--ms-primary"),
    neutral: v("--cat-neutral"),
    fixed: v("--cat-0"),
    variable: v("--cat-1"),
    surface: v("--ms-surface"),
    grid: v("--ms-border"),
    text: v("--ms-text"),
    muted: v("--ms-text-muted"),
  };
}

/** Re-reads the tokens whenever the theme attribute on <html> changes. */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(readTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

/** Shared options: hairline solid grid, muted ticks, tooltips with values first. */
export function baseOptions(t: ChartTheme, format: (n: number) => string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: t.surface,
        titleColor: t.muted,
        bodyColor: t.text,
        borderColor: t.grid,
        borderWidth: 1,
        padding: 10,
        boxWidth: 10,
        boxHeight: 2,
        bodyFont: { family: "Inter", weight: 600 as const },
        titleFont: { family: "Inter", weight: 400 as const },
        callbacks: {
          label: (ctx: { parsed: { y: number | null }; dataset: { label?: string } }) =>
            ctx.parsed.y === null ? "" : ` ${format(ctx.parsed.y)}  ${ctx.dataset.label ?? ""}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: t.grid },
        ticks: { color: t.muted, font: { family: "Inter", size: 11 }, maxRotation: 0, autoSkipPadding: 8 },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: t.grid, lineWidth: 1 },
        ticks: {
          color: t.muted,
          font: { family: "Inter", size: 11 },
          maxTicksLimit: 5,
          callback: (v: number | string) => compact(Number(v)),
        },
      },
    },
  };
}

/** Axis ticks: full under 10,000, compact above (12K). */
export function compact(n: number): string {
  if (Math.abs(n) < 10_000) return n.toLocaleString("en-IN");
  return `${Math.round(n / 1000).toLocaleString("en-IN")}K`;
}

