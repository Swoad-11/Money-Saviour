import { useState } from "react";
import { Plus, Save, Download } from "lucide-react";
import ExpenseRow from "./ExpenseRow";
import { formatMoney, CURRENCIES } from "../utils/currencies";
import { exportToCSV } from "../utils/csv";

export default function BudgetTab({
  currency,
  income,
  setIncome,
  expenses,
  setExpenses,
  savingPct,
  setSavingPct,
  history,
  setHistory,
}) {
  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol || "$";
  const [newCat, setNewCat] = useState("");
  const [saved, setSaved] = useState(false);

  const inc = parseFloat(income) || 0;
  const totalExp = expenses.reduce(
    (s, e) => s + (parseFloat(e.amount) || 0),
    0,
  );
  const balance = inc - totalExp;
  const saving = Math.max(0, (balance * savingPct) / 100);
  const remaining = balance - saving;
  const expRatio = inc > 0 ? Math.round((totalExp / inc) * 100) : 0;

  const addExpense = () => {
    if (!newCat.trim()) return;
    setExpenses((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newCat.trim(),
        amount: "",
        recurring: false,
        frequency: "monthly",
      },
    ]);
    setNewCat("");
  };

  const updateExpense = (id, updated) =>
    setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
  const deleteExpense = (id) =>
    setExpenses((prev) => prev.filter((e) => e.id !== id));

  const saveMonth = () => {
    if (!inc) return;
    const label = new Date().toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    setHistory((prev) => [
      { label, income: inc, totalExp, saving, currency },
      ...prev.filter((h) => h.label !== label),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Income */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
          Monthly income
        </p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">
            {sym}
          </span>
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="0.00"
            min="0"
            className="w-full pl-8 pr-4 py-3 text-2xl font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
          />
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
          Expenses
        </p>
        <div className="space-y-2">
          {expenses.map((exp) => (
            <ExpenseRow
              key={exp.id}
              expense={exp}
              symbol={sym}
              onChange={(updated) => updateExpense(exp.id, updated)}
              onDelete={() => deleteExpense(exp.id)}
            />
          ))}
        </div>

        {/* Add new category */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <input
            type="text"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExpense()}
            placeholder="Add new category..."
            className="flex-1 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
          />
          <button
            onClick={addExpense}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-brand-400 hover:text-white hover:border-brand-400 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* Savings target */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
          Savings target
        </p>
        <div className="flex items-center gap-4 mb-5">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={savingPct}
            onChange={(e) => setSavingPct(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-2xl font-semibold w-16 text-right text-brand-400">
            {savingPct}%
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Total expenses</span>
            <span className="text-base font-semibold text-red-500">
              {formatMoney(totalExp, currency)}
            </span>
            <span className="text-xs text-zinc-400">{expRatio}% of income</span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Balance left</span>
            <span
              className={`text-base font-semibold ${balance >= 0 ? "text-teal-400" : "text-red-500"}`}
            >
              {formatMoney(balance, currency)}
            </span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Monthly savings</span>
            <span className="text-base font-semibold text-brand-400">
              {formatMoney(saving, currency)}
            </span>
            <span className="text-xs text-zinc-400">
              Left: {formatMoney(remaining, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={saveMonth}
          disabled={!inc}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150 active:scale-95 cursor-pointer
            ${saved ? "bg-teal-600 border-teal-600 text-white" : "bg-teal-400 hover:bg-teal-600 border-teal-400 hover:border-teal-600 text-white"}
            ${!inc ? "opacity-40 cursor-not-allowed" : ""}
          `}
        >
          <Save size={15} /> {saved ? "Saved!" : "Save month"}
        </button>
        <button
          onClick={() =>
            exportToCSV({ income: inc, expenses, savingPct, currency, history })
          }
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-brand-400 hover:text-white hover:border-brand-400 active:scale-95 transition-all duration-150 cursor-pointer"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>
    </div>
  );
}
