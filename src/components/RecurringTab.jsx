import { RefreshCw, AlertCircle } from "lucide-react";
import { formatMoney } from "../utils/currencies";

const FREQ_MULTIPLIER = {
  monthly: 1,
  weekly: 4.33,
  fortnightly: 2.17,
  yearly: 1 / 12,
};
const FREQ_LABEL = {
  monthly: "/mo",
  weekly: "/wk",
  fortnightly: "/2wk",
  yearly: "/yr",
};

export default function RecurringTab({ expenses, currency, income }) {
  const recurring = expenses.filter(
    (e) => e.recurring && parseFloat(e.amount) > 0,
  );
  const inc = parseFloat(income) || 0;

  const monthlyTotal = recurring.reduce((s, e) => {
    const mult = FREQ_MULTIPLIER[e.frequency] || 1;
    return s + (parseFloat(e.amount) || 0) * mult;
  }, 0);

  const yearlyTotal = monthlyTotal * 12;
  const pctOfIncome = inc > 0 ? Math.round((monthlyTotal / inc) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="metric-card">
          <span className="text-xs text-zinc-400">Recurring / mo</span>
          <span className="text-xl font-semibold text-red-500">
            {formatMoney(monthlyTotal, currency)}
          </span>
        </div>
        <div className="metric-card">
          <span className="text-xs text-zinc-400">Recurring / yr</span>
          <span className="text-xl font-semibold text-zinc-700 dark:text-zinc-200">
            {formatMoney(yearlyTotal, currency)}
          </span>
        </div>
        <div className="metric-card">
          <span className="text-xs text-zinc-400">% of income</span>
          <span
            className={`text-xl font-semibold ${pctOfIncome > 60 ? "text-red-500" : "text-brand-400"}`}
          >
            {pctOfIncome}%
          </span>
        </div>
      </div>

      {pctOfIncome > 60 && (
        <div className="flex gap-3 items-start p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40">
          <AlertCircle
            size={16}
            className="text-red-500 mt-0.5 flex-shrink-0"
          />
          <p className="text-sm text-red-700 dark:text-red-300">
            Your recurring expenses are over 60% of your income. Consider
            reviewing subscriptions or fixed costs.
          </p>
        </div>
      )}

      <div className="card">
        <p className="section-label">All recurring commitments</p>
        {recurring.length === 0 ? (
          <div className="text-center py-8">
            <RefreshCw
              size={28}
              className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2"
            />
            <p className="text-sm text-zinc-400">No recurring expenses yet.</p>
            <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-1">
              Mark expenses as recurring on the Budget tab.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recurring.map((e) => {
              const monthly =
                (parseFloat(e.amount) || 0) *
                (FREQ_MULTIPLIER[e.frequency] || 1);
              const pct = inc > 0 ? Math.round((monthly / inc) * 100) : 0;
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                >
                  <RefreshCw
                    size={14}
                    className="text-brand-400 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{e.name}</span>
                      <span className="text-sm font-semibold">
                        {formatMoney(e.amount, currency)}
                        <span className="text-xs text-zinc-400 font-normal ml-1">
                          {FREQ_LABEL[e.frequency]}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-zinc-400">
                        {formatMoney(monthly, currency)}/mo equivalent
                      </span>
                      <span className="text-xs text-zinc-400">
                        {pct}% of income
                      </span>
                    </div>
                    <div className="progress-track mt-1.5">
                      <div
                        className="progress-fill bg-brand-400"
                        style={{ width: `${Math.min(pct * 2, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
