import { useState } from "react";
import { Trash2, RefreshCw, ChevronDown } from "lucide-react";

const FREQUENCIES = ["monthly", "weekly", "fortnightly", "yearly"];

export default function ExpenseRow({ expense, onChange, onDelete, symbol }) {
  const [showRecurring, setShowRecurring] = useState(false);

  const update = (field, value) => onChange({ ...expense, [field]: value });

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 transition-colors">
      <div className="flex items-center gap-2">
        {/* Name input */}
        <input
          type="text"
          value={expense.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Category name"
          className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
        />

        {/* Amount input */}
        <div className="relative flex items-center">
          <span className="absolute left-3 text-xs text-zinc-400 pointer-events-none">
            {symbol}
          </span>
          <input
            type="number"
            value={expense.amount || ""}
            onChange={(e) => update("amount", e.target.value)}
            placeholder="0.00"
            min="0"
            className="w-28 pl-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
          />
        </div>

        {/* Recurring toggle */}
        <button
          onClick={() => {
            update("recurring", !expense.recurring);
            setShowRecurring(!expense.recurring);
          }}
          title="Toggle recurring"
          className={`p-1.5 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer ${
            expense.recurring
              ? "text-brand-400 bg-brand-400/10 border border-brand-400/30"
              : "text-zinc-400 border border-transparent hover:text-brand-400 hover:bg-brand-400/10 hover:border-brand-400/30"
          }`}
        >
          <RefreshCw size={14} />
        </button>

        {/* Chevron */}
        <button
          onClick={() => setShowRecurring((s) => !s)}
          className={`p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer ${
            !expense.recurring ? "opacity-0 pointer-events-none" : ""
          }`}
        >
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${showRecurring ? "rotate-180" : ""}`}
          />
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Frequency selector */}
      {expense.recurring && showRecurring && (
        <div className="mt-3 flex items-center gap-2 pl-1">
          <span className="text-xs text-zinc-400">Frequency:</span>
          <div className="flex gap-1 flex-wrap">
            {FREQUENCIES.map((f) => (
              <button
                key={f}
                onClick={() => update("frequency", f)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-150 capitalize cursor-pointer active:scale-95 ${
                  expense.frequency === f
                    ? "bg-brand-400 text-white border-brand-400"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-brand-400 hover:text-brand-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
