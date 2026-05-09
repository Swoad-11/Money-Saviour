import { useEffect, useRef } from "react";
import { Trash2, TrendingUp, TrendingDown, History } from "lucide-react";
import { formatMoney } from "../utils/currencies";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
);

export default function HistoryTab({ history, setHistory, currency }) {
  const chartRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || history.length < 2) return;

    const labels = [...history].reverse().map((h) => h.label);
    const incomes = [...history].reverse().map((h) => h.income);
    const expenses = [...history].reverse().map((h) => h.totalExp);
    const savings = [...history].reverse().map((h) => h.saving);

    if (instanceRef.current) {
      instanceRef.current.data.labels = labels;
      instanceRef.current.data.datasets[0].data = incomes;
      instanceRef.current.data.datasets[1].data = expenses;
      instanceRef.current.data.datasets[2].data = savings;
      instanceRef.current.update();
      return;
    }

    instanceRef.current = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Income",
            data: incomes,
            borderColor: "#1D9E75",
            backgroundColor: "rgba(29,158,117,0.08)",
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: "#1D9E75",
            tension: 0.4,
            fill: false,
          },
          {
            label: "Expenses",
            data: expenses,
            borderColor: "#E24B4A",
            backgroundColor: "rgba(226,75,74,0.08)",
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: "#E24B4A",
            tension: 0.4,
            fill: false,
          },
          {
            label: "Savings",
            data: savings,
            borderColor: "#BA7517",
            backgroundColor: "rgba(186,117,23,0.08)",
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: "#BA7517",
            tension: 0.4,
            fill: false,
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
            grid: { color: "rgba(128,128,128,0.1)" },
          },
          y: {
            ticks: {
              color: "#888",
              font: { size: 11 },
              callback: (val) => formatMoney(val, currency),
            },
            grid: { color: "rgba(128,128,128,0.1)" },
          },
        },
      },
    });

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [history, currency]);

  if (history.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
        <History
          size={32}
          className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2"
        />
        <p className="text-sm text-zinc-400">No months saved yet.</p>
        <p className="text-xs text-zinc-400 mt-1">
          Go to the Budget tab and click "Save month".
        </p>
      </div>
    );
  }

  const totalSaved = history.reduce((s, h) => s + h.saving, 0);
  const avgSaving = totalSaved / history.length;

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Months tracked",
            value: history.length,
            color: "text-zinc-800 dark:text-zinc-100",
          },
          {
            label: "Total saved",
            value: formatMoney(totalSaved, currency),
            color: "text-teal-400",
          },
          {
            label: "Avg monthly",
            value: formatMoney(avgSaving, currency),
            color: "text-brand-400",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-1"
          >
            <span className="text-xs text-zinc-400">{m.label}</span>
            <span className={`text-lg font-semibold ${m.color}`}>
              {m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      {history.length >= 2 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
            Income vs Expenses vs Savings
          </p>
          <div style={{ height: 240 }}>
            <canvas ref={chartRef} />
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 text-center">
          <p className="text-sm text-zinc-400">
            Save at least{" "}
            <span className="text-brand-400 font-medium">2 months</span> to see
            the trend chart.
          </p>
        </div>
      )}

      {/* Records */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
          Monthly records
        </p>
        <div className="space-y-2">
          {history.map((h, i) => {
            const prev = history[i + 1];
            const trend = prev ? h.saving - prev.saving : 0;
            const expRatio =
              h.income > 0 ? Math.round((h.totalExp / h.income) * 100) : 0;

            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {h.label}
                    </span>
                    {trend !== 0 && (
                      <span
                        className={`flex items-center text-xs gap-0.5 ${trend > 0 ? "text-teal-400" : "text-red-400"}`}
                      >
                        {trend > 0 ? (
                          <TrendingUp size={12} />
                        ) : (
                          <TrendingDown size={12} />
                        )}
                        {formatMoney(Math.abs(trend), h.currency || currency)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Income: {formatMoney(h.income, h.currency || currency)} ·
                    Exp: {formatMoney(h.totalExp, h.currency || currency)} (
                    {expRatio}%)
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-semibold text-teal-400">
                    +{formatMoney(h.saving, h.currency || currency)}
                  </span>
                  <p className="text-xs text-zinc-400">saved</p>
                </div>

                <button
                  onClick={() =>
                    setHistory((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="p-1.5 rounded-lg text-zinc-300 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150 cursor-pointer shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
