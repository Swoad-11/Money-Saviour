import { useState } from "react";
import { Plus, Sparkles, Save, Download } from "lucide-react";
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
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
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

  const getAI = async () => {
    if (!inc) return;
    setAiLoading(true);
    setAiText("");
    const breakdown = expenses
      .filter((e) => e.amount)
      .map(
        (e) =>
          `${e.name}: ${formatMoney(e.amount, currency)}${e.recurring ? ` (${e.frequency})` : ""}`,
      )
      .join(", ");
    const prompt = `You are a friendly, practical personal finance advisor. Monthly budget in ${currency}:
- Income: ${formatMoney(inc, currency)}
- Expenses: ${breakdown || "none entered"}
- Total expenses: ${formatMoney(totalExp, currency)} (${expRatio}% of income)
- Balance after expenses: ${formatMoney(balance, currency)}
- Monthly savings target: ${formatMoney(saving, currency)} (${savingPct}%)
- Remaining: ${formatMoney(remaining, currency)}
Give 3 concise, specific, actionable financial tips tailored to these exact numbers. Note any recurring expenses that seem high. Be warm and encouraging. Under 180 words, no headers.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      setAiText(
        data.content?.find((b) => b.type === "text")?.text ||
          "Could not get advice right now.",
      );
    } catch {
      setAiText("Connection error. Please try again.");
    }
    setAiLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="section-label">Monthly income</p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium text-sm">
            {sym}
          </span>
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="0.00"
            min="0"
            className="input-base pl-8 text-2xl font-semibold py-3"
          />
        </div>
      </div>

      <div className="card">
        <p className="section-label">Expenses</p>
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
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExpense()}
            placeholder="New category..."
            className="input-base flex-1"
          />
          <button onClick={addExpense} className="btn-secondary">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div className="card">
        <p className="section-label">Savings target</p>
        <div className="flex items-center gap-4">
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
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="metric-card">
            <span className="text-xs text-zinc-400">Total expenses</span>
            <span className="text-base font-semibold text-red-500">
              {formatMoney(totalExp, currency)}
            </span>
            <span className="text-xs text-zinc-400">{expRatio}% of income</span>
          </div>
          <div className="metric-card">
            <span className="text-xs text-zinc-400">Balance left</span>
            <span
              className={`text-base font-semibold ${balance >= 0 ? "text-teal-400" : "text-red-500"}`}
            >
              {formatMoney(balance, currency)}
            </span>
          </div>
          <div className="metric-card">
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

      <div className="flex gap-2 flex-wrap">
        <button onClick={getAI} disabled={!inc} className="btn-primary flex-1">
          <Sparkles size={15} /> AI advice
        </button>
        <button
          onClick={saveMonth}
          disabled={!inc}
          className={`btn-teal flex-1 ${saved ? "opacity-70" : ""}`}
        >
          <Save size={15} /> {saved ? "Saved!" : "Save month"}
        </button>
        <button
          onClick={() =>
            exportToCSV({ income: inc, expenses, savingPct, currency, history })
          }
          className="btn-secondary"
        >
          <Download size={15} /> CSV
        </button>
      </div>

      {(aiLoading || aiText) && (
        <div className="card border border-purple-200 dark:border-purple-800/40 bg-purple-50/50 dark:bg-purple-900/10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-purple-500" />
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
              AI financial advisor
            </span>
          </div>
          {aiLoading ? (
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed whitespace-pre-wrap">
              {aiText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
