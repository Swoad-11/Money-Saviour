import { Trash2, TrendingUp, TrendingDown, History } from "lucide-react";
import { formatMoney } from "../utils/currencies";

export default function HistoryTab({ history, setHistory, currency }) {
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
