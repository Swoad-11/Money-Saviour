import { useState } from "react";
import { Trash2, RefreshCw, ChevronDown } from "lucide-react";

const FREQUENCIES = ["monthly", "weekly", "fortnightly", "yearly"];

export default function ExpenseRow({ expense, onChange, onDelete, symbol }) {
  const [showRecurring, setShowRecurring] = useState(false);

  const update = (field, value) => onChange({ ...expense, [field]: value });

  return (
    <div
      className={`rounded-xl border transition-colors ${expense.recurring ? "border-brand-100 dark:border-brand-800/40 bg-brand-50/40 dark:bg-brand-900/10" : "border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30"} p-3`}
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={expense.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Category name"
          className="input-base flex-1 text-sm py-1.5"
        />
        <div className="relative flex items-center">
          <span className="absolute left-3 text-xs text-zinc-400 dark:text-zinc-500 pointer-events-none">
            {symbol}
          </span>
          <input
            type="number"
            value={expense.amount || ""}
            onChange={(e) => update("amount", e.target.value)}
            placeholder="0.00"
            min="0"
            className="input-base w-28 pl-7 text-sm py-1.5"
          />
        </div>

        <button
          onClick={() => {
            update("recurring", !expense.recurring);
            setShowRecurring(!expense.recurring);
          }}
          title="Toggle recurring"
          className={`p-1.5 rounded-lg transition-colors ${expense.recurring ? "text-brand-400 bg-brand-100 dark:bg-brand-800/30" : "text-zinc-400 hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20"}`}
        >
          <RefreshCw size={14} />
        </button>

        <button
          onClick={() => setShowRecurring((s) => !s)}
          className={`p-1.5 rounded-lg text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors ${!expense.recurring && "opacity-0 pointer-events-none"}`}
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${showRecurring ? "rotate-180" : ""}`}
          />
        </button>

        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-zinc-300 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expense.recurring && showRecurring && (
        <div className="mt-2 flex items-center gap-2 pl-1">
          <span className="text-xs text-zinc-400">Frequency:</span>
          <div className="flex gap-1">
            {FREQUENCIES.map((f) => (
              <button
                key={f}
                onClick={() => update("frequency", f)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors capitalize ${expense.frequency === f ? "bg-brand-400 text-white border-brand-400" : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-brand-200"}`}
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
