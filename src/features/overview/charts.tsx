import { useMemo } from "react";
import { useNavigate } from "react-router";
import type { ChartConfiguration } from "chart.js";
import { cumulative, type MonthSummary } from "@/core";
import { Chart, Legend } from "@/ui/chart/Chart";
import { baseOptions, useChartTheme } from "@/ui/chart/theme";
import { dayParts, monthLabel, taka } from "@/ui/format";

/** Spend per day of the month, one hue. Click a day to open it in Expenses. */
export function DailyChart({ s }: { s: MonthSummary }) {
  const t = useChartTheme();
  const navigate = useNavigate();
  const config = useMemo<ChartConfiguration>(() => {
    const base = baseOptions(t, (n) => taka(n));
    return {
      type: "bar",
      data: {
        labels: s.days.map((d) => String(Number(d.date.slice(8)))),
        datasets: [
          {
            label: "spent",
            data: s.days.map((d) => d.total),
            backgroundColor: t.primary,
            borderRadius: { topLeft: 4, topRight: 4 },
            borderSkipped: "bottom",
            maxBarThickness: 18,
            categoryPercentage: 0.8,
            barPercentage: 0.9,
          },
        ],
      },
      options: {
        ...base,
        interaction: { mode: "nearest", intersect: true },
        plugins: {
          ...base.plugins,
          tooltip: {
            ...base.plugins.tooltip,
            callbacks: {
              title: (items) => {
                const d = s.days[items[0]?.dataIndex ?? 0];
                return d ? `${dayParts(d.date).weekday} ${dayParts(d.date).day}` : "";
              },
              label: (ctx) => ` ${taka(ctx.parsed.y ?? 0)}`,
            },
          },
        },
        onClick: (_e, els) => {
          const i = els[0]?.index;
          if (i !== undefined) navigate(`/expenses?m=${s.key}`);
        },
        onHover: (e, els) => {
          const target = e.native?.target as HTMLElement | undefined;
          if (target) target.style.cursor = els.length ? "pointer" : "default";
        },
      },
    };
  }, [s, t, navigate]);

  return (
    <Chart
      config={config}
      height={220}
      label={`Spending per day in ${monthLabel(s.key)}. The same figures are in the Expenses table.`}
    />
  );
}

/** Running total through the month, this month (emphasis) against last month (gray). */
export function PaceChart({ s, prev, today }: { s: MonthSummary; prev: MonthSummary | null; today: string }) {
  const t = useChartTheme();
  const isCurrent = today.startsWith(s.key);
  const upTo = isCurrent ? Number(today.slice(8, 10)) : undefined;
  const config = useMemo<ChartConfiguration>(() => {
    const base = baseOptions(t, (n) => taka(n));
    const days = Math.max(s.daysInMonth, prev?.daysInMonth ?? 0);
    const labels = Array.from({ length: days }, (_, i) => String(i + 1));
    const datasets: ChartConfiguration<"line">["data"]["datasets"] = [
      {
        label: monthLabel(s.key, false),
        data: cumulative(s, upTo),
        borderColor: t.primary,
        backgroundColor: t.primary,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0,
        borderJoinStyle: "round",
        borderCapStyle: "round",
      },
    ];
    if (prev) {
      datasets.push({
        label: monthLabel(prev.key, false),
        data: cumulative(prev),
        borderColor: t.neutral,
        backgroundColor: t.neutral,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0,
      });
    }
    return {
      type: "line",
      data: { labels, datasets },
      options: {
        ...base,
        plugins: {
          ...base.plugins,
          tooltip: { ...base.plugins.tooltip, callbacks: { ...base.plugins.tooltip.callbacks, title: (i) => `Day ${i[0]?.label ?? ""}` } },
        },
      },
    } as ChartConfiguration;
  }, [s, prev, t, upTo]);

  return (
    <div className="grid gap-2">
      <Legend
        items={[
          { label: monthLabel(s.key, false), color: t.primary, shape: "line" },
          ...(prev ? [{ label: monthLabel(prev.key, false), color: t.neutral, shape: "line" as const }] : []),
        ]}
      />
      <Chart
        config={config}
        height={200}
        label={`Running total of spending in ${monthLabel(s.key)}${prev ? ` compared with ${monthLabel(prev.key)}` : ""}.`}
      />
    </div>
  );
}
