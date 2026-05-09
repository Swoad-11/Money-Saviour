import { useState } from "react";
import { Plus, Trash2, Target } from "lucide-react";
import { formatMoney, CURRENCIES } from "../utils/currencies";
import { useLocalStorage } from "../hooks/useLocalStorage";

export default function GoalsTab({ currency, monthlySaving }) {
  const [goals, setGoals] = useLocalStorage("ms_goals", []);
  const [form, setForm] = useState({ name: "", target: "", saved: "" });

  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol || "$";

  const addGoal = () => {
    if (!form.name || !form.target) return;
    setGoals((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: form.name,
        target: parseFloat(form.target),
        saved: parseFloat(form.saved) || 0,
        currency,
        createdAt: new Date().toISOString(),
      },
    ]);
    setForm({ name: "", target: "", saved: "" });
  };

  const contribute = (id, amount) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g,
      ),
    );
  };

  const deleteGoal = (id) =>
    setGoals((prev) => prev.filter((g) => g.id !== id));

  const inputClass =
    "w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-400 transition";

  return (
    <div className="space-y-4">
      {/* Add goal form */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
          Add savings goal
        </p>
        <div className="space-y-2">
          <input
            className={inputClass}
            placeholder="Goal name (e.g. Emergency fund)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addGoal()}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputClass}
              type="number"
              placeholder="Target amount"
              value={form.target}
              onChange={(e) =>
                setForm((f) => ({ ...f, target: e.target.value }))
              }
            />
            <input
              className={inputClass}
              type="number"
              placeholder="Already saved"
              value={form.saved}
              onChange={(e) =>
                setForm((f) => ({ ...f, saved: e.target.value }))
              }
            />
          </div>
          <button
            onClick={addGoal}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-brand-400 hover:bg-brand-600 text-white border border-brand-400 hover:border-brand-600 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <Plus size={16} /> Add goal
          </button>
        </div>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center">
          <Target
            size={32}
            className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2"
          />
          <p className="text-sm text-zinc-400">No goals yet. Add one above!</p>
        </div>
      )}

      {/* Goal cards */}
      {goals.map((goal) => {
        const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100));
        const done = pct >= 100;
        const monthsLeft =
          monthlySaving > 0
            ? Math.ceil((goal.target - goal.saved) / monthlySaving)
            : null;

        return (
          <div
            key={goal.id}
            className={`rounded-2xl border p-5 transition-colors ${
              done
                ? "bg-teal-50/50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800/40"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-100">
                  {goal.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {formatMoney(goal.saved, goal.currency)} of{" "}
                  {formatMoney(goal.target, goal.currency)}
                  {monthsLeft && !done && (
                    <span className="ml-2 text-brand-400">
                      ~{monthsLeft}mo to go
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {done ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 dark:bg-teal-800/30 text-teal-600 dark:text-teal-300">
                    ✓ Reached!
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-400/10 text-brand-400 border border-brand-400/20">
                    {pct}%
                  </span>
                )}
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="p-1 rounded-lg text-zinc-300 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150 cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-4">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: done ? "#1D9E75" : "#BA7517",
                }}
              />
            </div>

            {/* Contribute buttons */}
            {!done && (
              <div className="flex gap-2 flex-wrap">
                {[10, 50, 100, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => contribute(goal.id, amt)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-brand-400 hover:text-white hover:border-brand-400 active:scale-95 transition-all duration-150 cursor-pointer"
                  >
                    +{sym}
                    {amt}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
