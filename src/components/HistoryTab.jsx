import { Trash2, TrendingUp, TrendingDown, History } from "lucide-react";
import { formatMoney } from "../utils/currencies";

export default function HistoryTab({ history, setHistory, currency }) {
  if (history.length === 0) {
    return (
      <div className="card text-center py-12">
        <History
          size={32}
          className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2"
        />
        <p className="text-sm text-zinc-400">No months saved yet.</p>
        <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-1">
          Go to the Budget tab and click "Save month".
        </p>
      </div>
    );
  }

  const totalSaved = history.reduce((s, h) => s + h.saving, 0);
  const avgSaving = totalSaved / history.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="metric-card">
          <span className="text-xs text-zinc-400">Months tracked</span>
          <span className="text-xl font-semibold">{history.length}</span>
        </div>
        <div className="metric-card">
          <span className="text-xs text-zinc-400">Total saved</span>
          <span className="text-xl font-semibold text-teal-400">
            {formatMoney(totalSaved, currency)}
          </span>
        </div>
        <div className="metric-card">
          <span className="text-xs text-zinc-400">Avg monthly</span>
          <span className="text-xl font-semibold text-brand-400">
            {formatMoney(avgSaving, currency)}
          </span>
        </div>
      </div>

      <div className="card">
        <p className="section-label">Monthly records</p>
        <div className="space-y-2">
          {history.map((h, i) => {
            const prev = history[i + 1];
            const trend = prev ? h.saving - prev.saving : 0;
            const expRatio =
              h.income > 0 ? Math.round((h.totalExp / h.income) * 100) : 0;

            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{h.label}</span>
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
                <div className="text-right">
                  <span className="text-sm font-semibold text-teal-400">
                    +{formatMoney(h.saving, h.currency || currency)}
                  </span>
                  <p className="text-xs text-zinc-400">saved</p>
                </div>
                <button
                  onClick={() =>
                    setHistory((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="text-zinc-300 hover:text-red-400 transition-colors"
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
