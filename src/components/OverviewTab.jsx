import { useEffect, useRef } from "react";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from "chart.js";
import { formatMoney, CURRENCIES } from "../utils/currencies";

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

const COLORS = [
  "#1D9E75",
  "#378ADD",
  "#BA7517",
  "#D85A30",
  "#7F77DD",
  "#D4537E",
  "#639922",
  "#E24B4A",
];

export default function OverviewTab({ income, expenses, savingPct, currency }) {
  const chartRef = useRef(null);
  const instanceRef = useRef(null);
  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol || "$";

  const inc = parseFloat(income) || 0;
  const filled = expenses.filter((e) => parseFloat(e.amount) > 0);
  const totalExp = filled.reduce((s, e) => s + parseFloat(e.amount), 0);
  const balance = inc - totalExp;
  const saving = Math.max(0, (balance * savingPct) / 100);
  const remaining = balance - saving;
  const expRatio = inc > 0 ? Math.round((totalExp / inc) * 100) : 0;
  const saveRatio = inc > 0 ? Math.round((saving / inc) * 100) : 0;

  useEffect(() => {
    if (!chartRef.current) return;
    const labels = [
      ...filled.map((e) => e.name),
      ...(remaining > 0 ? ["Remaining"] : []),
    ];
    const data = [
      ...filled.map((e) => parseFloat(e.amount)),
      ...(remaining > 0 ? [remaining] : []),
    ];
    const colors = [...COLORS.slice(0, filled.length), "#3f3f46"];

    if (instanceRef.current) {
      instanceRef.current.data.labels = labels;
      instanceRef.current.data.datasets[0].data = data;
      instanceRef.current.data.datasets[0].backgroundColor = colors;
      instanceRef.current.update();
      return;
    }
    instanceRef.current = new Chart(chartRef.current, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            position: "right",
            labels: {
              font: { size: 12, family: "DM Sans" },
              color: "#888",
              padding: 12,
              boxWidth: 12,
              borderRadius: 4,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                ` ${sym}${ctx.parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            },
          },
        },
      },
    });
    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [filled, remaining, sym]);

  const metrics = [
    {
      label: "Income",
      value: formatMoney(inc, currency),
      color: "text-zinc-800 dark:text-zinc-100",
    },
    {
      label: "Expenses",
      value: formatMoney(totalExp, currency),
      color: "text-red-500",
    },
    {
      label: "Savings",
      value: formatMoney(saving, currency),
      color: "text-brand-400",
    },
    {
      label: "Remaining",
      value: formatMoney(remaining, currency),
      color: remaining >= 0 ? "text-teal-400" : "text-red-500",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-1"
          >
            <span className="text-xs text-zinc-400">{m.label}</span>
            <span className={`text-base font-semibold ${m.color}`}>
              {m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
          Spending breakdown
        </p>
        {filled.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">
            Enter expenses on the Budget tab to see a chart.
          </p>
        ) : (
          <div style={{ height: 220 }}>
            <canvas ref={chartRef} />
          </div>
        )}
      </div>

      {/* Budget health */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
          Budget health
        </p>

        <div className="space-y-3 mb-5">
          {/* Expense ratio */}
          <div>
            <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
              <span>Expense ratio</span>
              <span
                className={
                  expRatio > 80
                    ? "text-red-400"
                    : expRatio > 60
                      ? "text-brand-400"
                      : "text-teal-400"
                }
              >
                {expRatio}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(expRatio, 100)}%`,
                  backgroundColor:
                    expRatio > 80
                      ? "#E24B4A"
                      : expRatio > 60
                        ? "#BA7517"
                        : "#1D9E75",
                }}
              />
            </div>
          </div>

          {/* Savings rate */}
          <div>
            <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
              <span>Savings rate</span>
              <span className="text-brand-400">{saveRatio}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-2 rounded-full bg-brand-400 transition-all duration-500"
                style={{ width: `${Math.min(saveRatio, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Per category */}
        <div className="space-y-3">
          {filled.map((e, i) => {
            const pct =
              inc > 0 ? Math.round((parseFloat(e.amount) / inc) * 100) : 0;
            return (
              <div key={e.id}>
                <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    {e.name}
                    {e.recurring && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-brand-400/10 text-brand-400 border border-brand-400/20">
                        recurring
                      </span>
                    )}
                  </span>
                  <span>
                    {formatMoney(e.amount, currency)} · {pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
