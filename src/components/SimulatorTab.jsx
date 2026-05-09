import { useState, useMemo } from "react";
import { Sliders, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatMoney } from "../utils/currencies";

export default function SimulatorTab({
  income,
  expenses,
  savingPct,
  currency,
}) {
  const inc = parseFloat(income) || 0;

  // Build sliders from current expenses — one per category
  const [adjustments, setAdjustments] = useState(() =>
    Object.fromEntries(expenses.map((e) => [e.id, 0])),
  );
  const [simSavingPct, setSimSavingPct] = useState(savingPct);

  const updateAdj = (id, val) =>
    setAdjustments((prev) => ({ ...prev, [id]: val }));

  const reset = () => {
    setAdjustments(Object.fromEntries(expenses.map((e) => [e.id, 0])));
    setSimSavingPct(savingPct);
  };

  // Current (real) numbers
  const currentTotalExp = expenses.reduce(
    (s, e) => s + (parseFloat(e.amount) || 0),
    0,
  );
  const currentBalance = inc - currentTotalExp;
  const currentSaving = Math.max(0, (currentBalance * savingPct) / 100);
  const currentRemaining = currentBalance - currentSaving;

  // Simulated numbers
  const simExpenses = useMemo(
    () =>
      expenses.map((e) => {
        const base = parseFloat(e.amount) || 0;
        const change = base * ((adjustments[e.id] || 0) / 100);
        return { ...e, simAmount: Math.max(0, base + change) };
      }),
    [expenses, adjustments],
  );

  const simTotalExp = simExpenses.reduce((s, e) => s + e.simAmount, 0);
  const simBalance = inc - simTotalExp;
  const simSaving = Math.max(0, (simBalance * simSavingPct) / 100);
  const simRemaining = simBalance - simSaving;

  const savingDiff = simSaving - currentSaving;
  const expDiff = simTotalExp - currentTotalExp;

  const filledExpenses = expenses.filter((e) => parseFloat(e.amount) > 0);

  if (!inc || filledExpenses.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
        <Sliders
          size={32}
          className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2"
        />
        <p className="text-sm text-zinc-400">
          Enter your income and expenses on the Budget tab first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            What if simulator
          </p>
          <button
            onClick={reset}
            className="text-xs px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-brand-400 hover:border-brand-400 transition-all duration-150 cursor-pointer"
          >
            Reset all
          </button>
        </div>
        <p className="text-sm text-zinc-400">
          Drag the sliders to simulate changes to your spending. See the impact
          instantly.
        </p>
      </div>

      {/* Before vs After summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
            Current
          </p>
          <div className="space-y-2">
            {[
              {
                label: "Total expenses",
                value: formatMoney(currentTotalExp, currency),
                color: "text-red-500",
              },
              {
                label: "Balance",
                value: formatMoney(currentBalance, currency),
                color: currentBalance >= 0 ? "text-teal-400" : "text-red-500",
              },
              {
                label: "Monthly savings",
                value: formatMoney(currentSaving, currency),
                color: "text-brand-400",
              },
              {
                label: "Remaining",
                value: formatMoney(currentRemaining, currency),
                color: "text-zinc-600 dark:text-zinc-300",
              },
            ].map((m) => (
              <div key={m.label} className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">{m.label}</span>
                <span className={`text-sm font-semibold ${m.color}`}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
            Simulated
          </p>
          <div className="space-y-2">
            {[
              {
                label: "Total expenses",
                value: formatMoney(simTotalExp, currency),
                color: "text-red-500",
              },
              {
                label: "Balance",
                value: formatMoney(simBalance, currency),
                color: simBalance >= 0 ? "text-teal-400" : "text-red-500",
              },
              {
                label: "Monthly savings",
                value: formatMoney(simSaving, currency),
                color: "text-brand-400",
              },
              {
                label: "Remaining",
                value: formatMoney(simRemaining, currency),
                color: "text-zinc-600 dark:text-zinc-300",
              },
            ].map((m) => (
              <div key={m.label} className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">{m.label}</span>
                <span className={`text-sm font-semibold ${m.color}`}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Impact summary */}
      <div
        className={`rounded-2xl border p-4 flex items-center gap-4 ${
          savingDiff > 0
            ? "bg-teal-50/50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800/40"
            : savingDiff < 0
              ? "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40"
              : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
        }`}
      >
        <div className="flex-1">
          <p className="text-xs text-zinc-400 mb-1">Savings impact</p>
          <div className="flex items-center gap-2">
            {savingDiff === 0 ? (
              <Minus size={16} className="text-zinc-400" />
            ) : savingDiff > 0 ? (
              <TrendingUp size={16} className="text-teal-400" />
            ) : (
              <TrendingDown size={16} className="text-red-400" />
            )}
            <span
              className={`text-lg font-semibold ${
                savingDiff > 0
                  ? "text-teal-400"
                  : savingDiff < 0
                    ? "text-red-400"
                    : "text-zinc-400"
              }`}
            >
              {savingDiff > 0 ? "+" : ""}
              {formatMoney(savingDiff, currency)}/mo
            </span>
          </div>
          {savingDiff !== 0 && (
            <p className="text-xs text-zinc-400 mt-1">
              That's {formatMoney(Math.abs(savingDiff) * 12, currency)}/yr{" "}
              {savingDiff > 0 ? "more" : "less"} saved
            </p>
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs text-zinc-400 mb-1">Expense impact</p>
          <div className="flex items-center gap-2">
            {expDiff === 0 ? (
              <Minus size={16} className="text-zinc-400" />
            ) : expDiff < 0 ? (
              <TrendingDown size={16} className="text-teal-400" />
            ) : (
              <TrendingUp size={16} className="text-red-400" />
            )}
            <span
              className={`text-lg font-semibold ${
                expDiff < 0
                  ? "text-teal-400"
                  : expDiff > 0
                    ? "text-red-400"
                    : "text-zinc-400"
              }`}
            >
              {expDiff > 0 ? "+" : ""}
              {formatMoney(expDiff, currency)}/mo
            </span>
          </div>
          {expDiff !== 0 && (
            <p className="text-xs text-zinc-400 mt-1">
              {formatMoney(Math.abs(expDiff) * 12, currency)}/yr{" "}
              {expDiff < 0 ? "less" : "more"} spent
            </p>
          )}
        </div>
      </div>

      {/* Expense sliders */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
          Adjust spending
        </p>
        <div className="space-y-5">
          {filledExpenses.map((e) => {
            const base = parseFloat(e.amount) || 0;
            const adj = adjustments[e.id] || 0;
            const simAmt = Math.max(0, base + base * (adj / 100));
            const diff = simAmt - base;

            return (
              <div key={e.id}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {e.name}
                    </span>
                    {adj !== 0 && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          adj < 0
                            ? "bg-teal-400/10 text-teal-400 border border-teal-400/20"
                            : "bg-red-400/10 text-red-400 border border-red-400/20"
                        }`}
                      >
                        {adj > 0 ? "+" : ""}
                        {adj}%
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {formatMoney(simAmt, currency)}
                    </span>
                    {diff !== 0 && (
                      <span
                        className={`ml-2 text-xs ${diff < 0 ? "text-teal-400" : "text-red-400"}`}
                      >
                        {diff > 0 ? "+" : ""}
                        {formatMoney(diff, currency)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-8 text-right">
                    -50%
                  </span>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={adj}
                    onChange={(e) =>
                      updateAdj(
                        e.target.id || e.currentTarget.dataset.id,
                        Number(e.target.value),
                      )
                    }
                    data-id={e.id}
                    onInput={(ev) => updateAdj(e.id, Number(ev.target.value))}
                    className="flex-1"
                    style={{
                      background:
                        adj === 0
                          ? undefined
                          : adj < 0
                            ? `linear-gradient(to right, #1D9E75 0%, #1D9E75 ${((adj + 50) / 100) * 100}%, #e4e4e7 ${((adj + 50) / 100) * 100}%, #e4e4e7 100%)`
                            : `linear-gradient(to right, #e4e4e7 0%, #e4e4e7 50%, #E24B4A 50%, #E24B4A ${((adj + 50) / 100) * 100}%, #e4e4e7 ${((adj + 50) / 100) * 100}%, #e4e4e7 100%)`,
                    }}
                  />
                  <span className="text-xs text-zinc-400 w-8">+50%</span>
                </div>

                <div className="h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 mt-1.5 overflow-hidden">
                  <div
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((simAmt / inc) * 100, 100)}%`,
                      backgroundColor:
                        adj < 0 ? "#1D9E75" : adj > 0 ? "#E24B4A" : "#BA7517",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulate savings % too */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
          What if I saved more?
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={simSavingPct}
            onChange={(e) => setSimSavingPct(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-2xl font-semibold w-16 text-right text-brand-400">
            {simSavingPct}%
          </span>
        </div>
        {simSavingPct !== savingPct && (
          <p className="text-xs text-zinc-400 mt-2">
            Changing from {savingPct}% → {simSavingPct}% means{" "}
            <span
              className={
                simSavingPct > savingPct ? "text-teal-400" : "text-red-400"
              }
            >
              {simSavingPct > savingPct ? "+" : ""}
              {formatMoney(simSaving - currentSaving, currency)}/mo
            </span>{" "}
            difference
          </p>
        )}
      </div>
    </div>
  );
}
