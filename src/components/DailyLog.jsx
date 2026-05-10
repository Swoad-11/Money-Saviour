import { useState } from "react";
import { Plus, Trash2, ClipboardList } from "lucide-react";
import { formatMoney, CURRENCIES } from "../utils/currencies";
import { useLocalStorage } from "../hooks/useLocalStorage";

const QUICK_CATEGORIES = [
  "Food",
  "Transport",
  "Snacks",
  "Shopping",
  "Medicine",
  "Entertainment",
  "Other",
];

export default function DailyLog({ currency, selectedLabel, onRollUp }) {
  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol || "$";
  const [logs, setLogs] = useLocalStorage("ms_daily_logs", {});

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [customCat, setCustomCat] = useState(false);

  const todayKey = new Date().toISOString().slice(0, 10);
  const monthLogs = logs[selectedLabel] || {};
  const allEntries = Object.entries(monthLogs)
    .sort(([a], [b]) => b.localeCompare(a))
    .flatMap(([date, entries]) => entries.map((e) => ({ ...e, date })));

  const totalLogged = allEntries.reduce(
    (s, e) => s + (parseFloat(e.amount) || 0),
    0,
  );

  const addEntry = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const entry = {
      id: Date.now(),
      desc: desc.trim() || category,
      amount: parseFloat(amount),
      category,
    };
    setLogs((prev) => ({
      ...prev,
      [selectedLabel]: {
        ...prev[selectedLabel],
        [todayKey]: [...(prev[selectedLabel]?.[todayKey] || []), entry],
      },
    }));
    setDesc("");
    setAmount("");
  };

  const deleteEntry = (date, id) => {
    setLogs((prev) => ({
      ...prev,
      [selectedLabel]: {
        ...prev[selectedLabel],
        [date]: (prev[selectedLabel]?.[date] || []).filter((e) => e.id !== id),
      },
    }));
  };

  // Group by category for rollup
  const rollUp = () => {
    const grouped = {};
    allEntries.forEach((e) => {
      grouped[e.category] = (grouped[e.category] || 0) + parseFloat(e.amount);
    });
    const rolled = Object.entries(grouped).map(([name, amount]) => ({
      id: Date.now() + Math.random(),
      name,
      amount: amount.toString(),
      recurring: false,
      frequency: "monthly",
    }));
    onRollUp(rolled);
  };

  const inputClass =
    "px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-400 transition";

  return (
    <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Daily expense log — {selectedLabel}
        </p>
        {totalLogged > 0 && (
          <span className="text-xs text-brand-400 font-medium">
            {formatMoney(totalLogged, currency)} logged
          </span>
        )}
      </div>

      {/* Quick add */}
      <div className="space-y-2 mb-4">
        {/* Category picker */}
        <div className="flex gap-1.5 flex-wrap">
          {QUICK_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                setCustomCat(false);
              }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-150 cursor-pointer active:scale-95 ${
                category === cat && !customCat
                  ? "bg-brand-400 text-white border-brand-400"
                  : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-brand-400 hover:text-brand-400"
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={() => setCustomCat(true)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-150 cursor-pointer ${
              customCat
                ? "bg-brand-400 text-white border-brand-400"
                : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-brand-400 hover:text-brand-400"
            }`}
          >
            + Custom
          </button>
        </div>

        {customCat && (
          <input
            className={inputClass + " w-full"}
            placeholder="Category name..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        )}

        <div className="flex gap-2">
          <input
            className={inputClass + " flex-1"}
            placeholder="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEntry()}
          />
          <div className="relative flex items-center">
            <span className="absolute left-3 text-xs text-zinc-400 pointer-events-none">
              {sym}
            </span>
            <input
              type="number"
              className={inputClass + " w-28 pl-7"}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEntry()}
              min="0"
            />
          </div>
          <button
            onClick={addEntry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-brand-400 hover:text-white hover:border-brand-400 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Entries list */}
      {allEntries.length === 0 ? (
        <div className="text-center py-6">
          <ClipboardList
            size={24}
            className="mx-auto text-zinc-300 dark:text-zinc-600 mb-1"
          />
          <p className="text-xs text-zinc-400">
            No entries yet for {selectedLabel}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(monthLogs)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, entries]) => (
              <div key={date}>
                <p className="text-xs text-zinc-400 mb-1.5">
                  {new Date(date + "T00:00:00").toLocaleDateString("default", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <div className="space-y-1">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700"
                    >
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-400/10 text-brand-400 border border-brand-400/20 flex-shrink-0">
                        {entry.category}
                      </span>
                      <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1 truncate">
                        {entry.desc}
                      </span>
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 flex-shrink-0">
                        {formatMoney(entry.amount, currency)}
                      </span>
                      <button
                        onClick={() => deleteEntry(date, entry.id)}
                        className="text-zinc-300 hover:text-red-400 hover:bg-red-400/10 p-1 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {/* Roll up button */}
          <button
            onClick={rollUp}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-brand-400 hover:text-white hover:border-brand-400 active:scale-95 transition-all duration-150 cursor-pointer mt-2"
          >
            <ClipboardList size={15} />
            Roll up into expense categories
          </button>
        </div>
      )}
    </div>
  );
}
