import { useEffect, useRef, useState } from "react";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
  BarController,
  BarElement,
  LinearScale,
  CategoryScale,
} from "chart.js";
import { formatMoney, CURRENCIES } from "../utils/currencies";
import { getMonthData } from "../services/sheets";
import {
  extractUniqueItems,
  translateUnknownItems,
  parseRawExpenses,
} from "../services/translator";

Chart.register(
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
  BarController,
  BarElement,
  LinearScale,
  CategoryScale,
);

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

export default function OverviewTab({
  income,
  expenses,
  savingPct,
  currency,
  months,
}) {
  const [view, setView] = useState("month");
  const [yearlyData, setYearlyData] = useState(null);
  const [loadingYearly, setLoadingYearly] = useState(false);
  const [yearlyError, setYearlyError] = useState(null);

  const pieRef = useRef(null);
  const pieInstance = useRef(null);
  const barRef = useRef(null);
  const barInstance = useRef(null);

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
    if (view !== "yearly" || yearlyData || loadingYearly) return;
    let cancelled = false;

    async function run() {
      if (!months || months.length === 0) {
        if (!cancelled) setYearlyError("No months found in Google Sheets.");
        return;
      }
      if (!cancelled) setLoadingYearly(true);
      if (!cancelled) setYearlyError(null);
      try {
        const results = await Promise.all(
          months.map(async (m) => {
            const raw = await getMonthData(m);
            const allRaw = raw.expenses?.map((e) => e.raw) || [];
            const allItems = extractUniqueItems(allRaw);
            await translateUnknownItems(allItems);

            const categoryTotals = {};
            allRaw.forEach((rawStr) => {
              parseRawExpenses(rawStr).forEach(({ name, amount }) => {
                categoryTotals[name] =
                  (categoryTotals[name] || 0) + parseFloat(amount);
              });
            });

            return {
              month: m,
              income: raw.income,
              grandTotal: raw.grandTotal,
              categories: categoryTotals,
            };
          }),
        );
        if (!cancelled) setYearlyData(results);
      } catch (e) {
        if (!cancelled) setYearlyError("Could not load yearly data.");
      }
      if (!cancelled) setLoadingYearly(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [view, months]);

  // Monthly doughnut chart
  useEffect(() => {
    if (view !== "month" || !pieRef.current) return;
    const labels = [
      ...filled.map((e) => e.name),
      ...(remaining > 0 ? ["Remaining"] : []),
    ];
    const data = [
      ...filled.map((e) => parseFloat(e.amount)),
      ...(remaining > 0 ? [remaining] : []),
    ];
    const colors = [...COLORS.slice(0, filled.length), "#3f3f46"];

    if (pieInstance.current) {
      pieInstance.current.data.labels = labels;
      pieInstance.current.data.datasets[0].data = data;
      pieInstance.current.data.datasets[0].backgroundColor = colors;
      pieInstance.current.update();
      return;
    }
    pieInstance.current = new Chart(pieRef.current, {
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
      pieInstance.current?.destroy();
      pieInstance.current = null;
    };
  }, [filled, remaining, sym, view]);

  // Yearly bar chart
  useEffect(() => {
    if (view !== "yearly" || !yearlyData || !barRef.current) return;

    const labels = yearlyData.map((d) => d.month);
    const incomes = yearlyData.map((d) => d.income);
    const totals = yearlyData.map((d) => d.grandTotal);
    const savings = yearlyData.map((d) => Math.max(0, d.income - d.grandTotal));

    if (barInstance.current) {
      barInstance.current.destroy();
      barInstance.current = null;
    }

    barInstance.current = new Chart(barRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Income",
            data: incomes,
            backgroundColor: "rgba(29,158,117,0.7)",
            borderRadius: 6,
          },
          {
            label: "Expenses",
            data: totals,
            backgroundColor: "rgba(226,75,74,0.7)",
            borderRadius: 6,
          },
          {
            label: "Savings",
            data: savings,
            backgroundColor: "rgba(186,117,23,0.7)",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "top",
            labels: {
              font: { size: 12, family: "DM Sans" },
              color: "#888",
              boxWidth: 12,
              padding: 16,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                ` ${ctx.dataset.label}: ${formatMoney(ctx.parsed.y, currency)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#888", font: { size: 11 } },
            grid: { color: "rgba(128,128,128,0.08)" },
          },
          y: {
            ticks: {
              color: "#888",
              font: { size: 11 },
              callback: (val) => formatMoney(val, currency),
            },
            grid: { color: "rgba(128,128,128,0.08)" },
          },
        },
      },
    });
    return () => {
      barInstance.current?.destroy();
      barInstance.current = null;
    };
  }, [yearlyData, view, currency]);

  // Yearly summary calculations
  const yearlySummary = yearlyData
    ? {
        totalIncome: yearlyData.reduce((s, d) => s + d.income, 0),
        totalExpenses: yearlyData.reduce((s, d) => s + d.grandTotal, 0),
        totalSavings: yearlyData.reduce(
          (s, d) => s + Math.max(0, d.income - d.grandTotal),
          0,
        ),
        allCategories: yearlyData.reduce((acc, d) => {
          Object.entries(d.categories).forEach(([cat, amt]) => {
            acc[cat] = (acc[cat] || 0) + amt;
          });
          return acc;
        }, {}),
      }
    : null;

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex gap-2">
        {[
          { id: "month", label: "This Month" },
          { id: "yearly", label: "Yearly Summary" },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150 cursor-pointer active:scale-95 ${
              view === v.id
                ? "bg-brand-400 text-white border-brand-400"
                : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-brand-400 hover:text-brand-400"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── MONTHLY VIEW ── */}
      {view === "month" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
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
            ].map((m) => (
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
                <canvas ref={pieRef} />
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
              Budget health
            </p>
            <div className="space-y-3 mb-5">
              {[
                {
                  label: "Expense ratio",
                  value: expRatio,
                  color:
                    expRatio > 80
                      ? "#E24B4A"
                      : expRatio > 60
                        ? "#BA7517"
                        : "#1D9E75",
                  textColor:
                    expRatio > 80
                      ? "text-red-400"
                      : expRatio > 60
                        ? "text-brand-400"
                        : "text-teal-400",
                },
                {
                  label: "Savings rate",
                  value: saveRatio,
                  color: "#BA7517",
                  textColor: "text-brand-400",
                },
              ].map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                    <span>{b.label}</span>
                    <span className={b.textColor}>{b.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(b.value, 100)}%`,
                        backgroundColor: b.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

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
        </>
      )}

      {/* ── YEARLY VIEW ── */}
      {view === "yearly" && (
        <>
          {loadingYearly && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
              <div className="flex justify-center gap-1.5 mb-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="text-sm text-zinc-400">
                Loading all months from Google Sheets...
              </p>
            </div>
          )}

          {yearlyError && (
            <div className="bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-800/40 rounded-2xl p-6 text-center">
              <p className="text-sm text-red-400">{yearlyError}</p>
              <button
                onClick={() => {
                  setYearlyData(null);
                  setYearlyError(null);
                }}
                className="mt-3 text-xs px-4 py-2 rounded-xl bg-brand-400 text-white cursor-pointer hover:bg-brand-600 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loadingYearly && yearlySummary && (
            <>
              {/* Yearly metrics */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Total income",
                    value: formatMoney(yearlySummary.totalIncome, currency),
                    color: "text-teal-400",
                  },
                  {
                    label: "Total expenses",
                    value: formatMoney(yearlySummary.totalExpenses, currency),
                    color: "text-red-500",
                  },
                  {
                    label: "Total savings",
                    value: formatMoney(yearlySummary.totalSavings, currency),
                    color: "text-brand-400",
                  },
                ].map((m) => (
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

              {/* Bar chart */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
                  Month by month
                </p>
                <div style={{ height: 260 }}>
                  <canvas ref={barRef} />
                </div>
              </div>

              {/* Category breakdown across all months */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
                  Yearly spending by category
                </p>
                <div className="space-y-3">
                  {Object.entries(yearlySummary.allCategories)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, amt], i) => {
                      const pct =
                        yearlySummary.totalExpenses > 0
                          ? Math.round(
                              (amt / yearlySummary.totalExpenses) * 100,
                            )
                          : 0;
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{
                                  background: COLORS[i % COLORS.length],
                                }}
                              />
                              {cat}
                            </span>
                            <span>
                              {formatMoney(amt, currency)} · {pct}%
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
            </>
          )}
        </>
      )}
    </div>
  );
}
