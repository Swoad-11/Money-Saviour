import { useMemo } from "react";
import { useNavigate } from "react-router";
import type { ChartConfiguration } from "chart.js";
import { categoryMatrix, summarizeYear, type MonthSummary } from "@/core";
import { categoryById, useAllSummaries, useSelectedMonth } from "@/state/month";
import { DataGate } from "@/features/shell/DataGate";
import { Card } from "@/ui/Card";
import { StatTile } from "@/ui/StatTile";
import { Chart } from "@/ui/chart/Chart";
import { baseOptions, useChartTheme } from "@/ui/chart/theme";
import { categoryColor, monthLabel, taka } from "@/ui/format";

export function HistoryPage() {
  return (
    <DataGate>
      <HistoryBody />
    </DataGate>
  );
}

function HistoryBody() {
  const { today } = useSelectedMonth();
  const current = today.slice(0, 7);
  // Months that have started; future months (e.g. an empty December) are left out.
  const months = useAllSummaries(today).filter((m) => m.key <= current);
  const year = summarizeYear(months, current);

  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile emphasis label="Spent this year" value={taka(year.total)} note={`${months.length} months`} />
        <StatTile
          label="Monthly average"
          value={taka(Math.round(year.monthlyAverage))}
          note={`${year.counted} complete month${year.counted === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Highest month"
          value={year.highest ? taka(year.highest.spent) : "—"}
          note={year.highest ? monthLabel(year.highest.key) : undefined}
        />
        <StatTile
          label="Lowest month"
          value={year.lowest ? taka(year.lowest.spent) : "—"}
          note={year.lowest ? monthLabel(year.lowest.key) : undefined}
        />
      </dl>

      <Card title="Spending by month">
        <MonthlyChart months={months} average={year.monthlyAverage} />
      </Card>

      <Card title="Months">
        <MonthTable months={months} current={current} />
      </Card>

      <Card title="Categories by month">
        <CategoryTrend months={months} />
      </Card>
    </div>
  );
}

function MonthlyChart({ months, average }: { months: MonthSummary[]; average: number }) {
  const t = useChartTheme();
  const navigate = useNavigate();
  const config = useMemo<ChartConfiguration>(() => {
    const base = baseOptions(t, (n) => taka(n));
    return {
      type: "bar",
      data: {
        labels: months.map((m) => monthLabel(m.key, false).split(" ")[0]!),
        datasets: [
          {
            type: "bar",
            label: "spent",
            data: months.map((m) => m.spent),
            backgroundColor: t.primary,
            borderRadius: { topLeft: 4, topRight: 4 },
            borderSkipped: "bottom",
            maxBarThickness: 24,
          },
          {
            type: "line",
            label: "monthly average",
            data: months.map(() => average),
            borderColor: t.muted,
            borderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      },
      options: {
        ...base,
        plugins: {
          ...base.plugins,
          tooltip: {
            ...base.plugins.tooltip,
            callbacks: {
              title: (i) => monthLabel(months[i[0]?.dataIndex ?? 0]?.key ?? ""),
              label: (ctx) => ` ${taka(ctx.parsed.y ?? 0)}  ${ctx.dataset.label ?? ""}`,
            },
          },
        },
        onClick: (_e, els) => {
          const m = months[els[0]?.index ?? -1];
          if (m) navigate(`/overview?m=${m.key}`);
        },
      },
    } as ChartConfiguration;
  }, [months, average, t, navigate]);

  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted">The thin line is the average of complete months. Click a month to open it.</p>
      <Chart config={config} height={240} label="Spending per month this year. The same figures are in the Months table below." />
    </div>
  );
}

function MonthTable({ months, current }: { months: MonthSummary[]; current: string }) {
  const navigate = useNavigate();
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[560px] text-[13px]">
        <thead className="text-left text-xs text-muted">
          <tr className="border-b border-line">
            <th className="py-2 pr-3 font-medium">Month</th>
            <th className="py-2 pr-3 text-right font-medium">Spent</th>
            <th className="py-2 pr-3 text-right font-medium">vs previous</th>
            <th className="py-2 pr-3 text-right font-medium">Fixed</th>
            <th className="py-2 pr-3 text-right font-medium">Variable</th>
            <th className="py-2 pr-3 text-right font-medium">Daily avg</th>
            <th className="py-2 font-medium">Top category</th>
          </tr>
        </thead>
        <tbody>
          {[...months].reverse().map((m) => {
            const i = months.indexOf(m);
            const prev = i > 0 ? months[i - 1] : undefined;
            const change = prev && prev.spent ? (m.spent - prev.spent) / prev.spent : null;
            const top = m.byCategory[0];
            const partial = m.key === current;
            return (
              <tr
                key={m.key}
                tabIndex={0}
                onClick={() => navigate(`/overview?m=${m.key}`)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/overview?m=${m.key}`)}
                className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-muted/60"
              >
                <td className="py-2 pr-3 font-medium">
                  {monthLabel(m.key)}
                  {partial && <span className="ml-1.5 text-xs font-normal text-muted">so far</span>}
                </td>
                <td className="num py-2 pr-3 text-right font-semibold">{taka(m.spent)}</td>
                <td className={`num py-2 pr-3 text-right ${change === null || partial ? "text-muted" : change > 0 ? "text-danger" : "text-primary"}`}>
                  {change === null || partial ? "—" : `${change > 0 ? "+" : "−"}${Math.abs(Math.round(change * 100))}%`}
                </td>
                <td className="num py-2 pr-3 text-right">{taka(m.fixed)}</td>
                <td className="num py-2 pr-3 text-right">{taka(m.variable)}</td>
                <td className="num py-2 pr-3 text-right">{taka(Math.round(m.dailyAverage))}</td>
                <td className="py-2">
                  {top ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden className="size-2 rounded-full" style={{ background: categoryColor(categoryById(top.categoryId)) }} />
                      {categoryById(top.categoryId).name}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Categories × months, each cell shaded by amount in one hue (more is darker). */
function CategoryTrend({ months }: { months: MonthSummary[] }) {
  const m = useMemo(() => categoryMatrix(months), [months]);
  const shade = (v: number) =>
    v > 0 ? `color-mix(in oklab, var(--ms-primary) ${Math.round(8 + (v / (m.max || 1)) * 52)}%, var(--ms-surface))` : undefined;
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full text-[12px]">
        <thead className="text-xs text-muted">
          <tr>
            <th className="sticky left-0 bg-surface py-1.5 pr-3 text-left font-medium">Category</th>
            {months.map((mo) => (
              <th key={mo.key} className="px-1 py-1.5 text-right font-medium">
                {monthLabel(mo.key, false).split(" ")[0]}
              </th>
            ))}
            <th className="py-1.5 pl-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {m.rows.map((r) => {
            const cat = categoryById(r.categoryId);
            return (
              <tr key={r.categoryId} className="border-t border-line">
                <th scope="row" className="sticky left-0 bg-surface py-1 pr-3 text-left font-normal whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="size-2 rounded-full" style={{ background: categoryColor(cat) }} />
                    {cat.name}
                  </span>
                </th>
                {r.cells.map((v, i) => (
                  <td
                    key={i}
                    className="num px-1 py-1 text-right"
                    style={{ background: shade(v) }}
                    title={`${cat.name}, ${monthLabel(months[i]!.key)}: ${taka(v)}`}
                  >
                    {v ? Math.round(v).toLocaleString("en-IN") : <span className="text-muted">·</span>}
                  </td>
                ))}
                <td className="num py-1 pl-3 text-right font-semibold">{Math.round(r.total).toLocaleString("en-IN")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
