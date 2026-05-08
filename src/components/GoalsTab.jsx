import { useState } from "react";
import { Plus, Trash2, Target } from "lucide-react";
import { formatMoney } from "../utils/currencies";
import { useLocalStorage } from "../hooks/useLocalStorage";

export default function GoalsTab({ currency, monthlySaving }) {
  const [goals, setGoals] = useLocalStorage("ms_goals", []);
  const [form, setForm] = useState({ name: "", target: "", saved: "" });

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

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="section-label">Add savings goal</p>
        <div className="space-y-2">
          <input
            className="input-base"
            placeholder="Goal name (e.g. Emergency fund)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input-base"
              type="number"
              placeholder="Target amount"
              value={form.target}
              onChange={(e) =>
                setForm((f) => ({ ...f, target: e.target.value }))
              }
            />
            <input
              className="input-base"
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
            className="btn-primary w-full justify-center"
          >
            <Plus size={16} /> Add goal
          </button>
        </div>
      </div>

      {goals.length === 0 && (
        <div className="card text-center py-10">
          <Target
            size={32}
            className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2"
          />
          <p className="text-sm text-zinc-400">No goals yet. Add one above!</p>
        </div>
      )}

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
            className={`card ${done ? "border-teal-200 dark:border-teal-800/40 bg-teal-50/30 dark:bg-teal-900/10" : ""}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm">{goal.name}</h3>
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
                  <span className="badge badge-green">Reached!</span>
                ) : (
                  <span className="badge badge-amber">{pct}%</span>
                )}
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="text-zinc-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="progress-track mb-3">
              <div
                className="progress-fill"
                style={{
                  width: `${pct}%`,
                  backgroundColor: done ? "#1D9E75" : "#BA7517",
                }}
              />
            </div>

            {!done && (
              <div className="flex gap-2">
                {[10, 50, 100, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => contribute(goal.id, amt)}
                    className="btn-secondary text-xs py-1 px-2"
                  >
                    +{goal.currency === "BDT" ? "৳" : "$"}
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
