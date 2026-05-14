// replace with
import { useState, useEffect } from "react";
import { getMonths, getMonthData } from "../services/sheets";
import { RefreshCw, ChevronDown, AlertCircle } from "lucide-react";
import {
  extractUniqueItems,
  translateUnknownItems,
  parseRawExpenses,
} from "../services/translator";
import { formatMoney } from "../utils/currencies";

export default function SheetImporter({ currency, onImport }) {
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState([]);
  const [activeMonth, setActiveMonth] = useState(null);
  const [loadingMonth, setLoadingMonth] = useState(null);
  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  async function loadMonth(monthName, cancelled = false) {
    setSyncing(true);
    setLoadingMonth(monthName);
    try {
      const raw = await getMonthData(monthName);
      if (cancelled) return;

      // extract all raw expense strings
      const allRaw = raw.expenses?.map((e) => e.raw) || [];

      // find and translate unknown words via AI
      const allItems = extractUniqueItems(allRaw);
      await translateUnknownItems(allItems);

      // parse and group by category
      const categoryTotals = {};
      allRaw.forEach((rawStr) => {
        const parsed = parseRawExpenses(rawStr);
        parsed.forEach(({ name, amount }) => {
          categoryTotals[name] =
            (categoryTotals[name] || 0) + parseFloat(amount);
        });
      });

      const expenses = Object.entries(categoryTotals).map(([name, amount]) => ({
        id: Date.now() + Math.random(),
        name,
        amount: amount.toFixed(2),
        recurring: false,
        frequency: "monthly",
      }));

      if (!cancelled) {
        setMonthData({
          label: monthName,
          income: raw.income,
          expenses,
          grandTotal: raw.grandTotal,
        });
        setActiveMonth(monthName);
      }
    } catch (e) {
      if (!cancelled) setError(`Could not load ${monthName}.`);
    }
    if (!cancelled) {
      setSyncing(false);
      setLoadingMonth(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const list = await getMonths();
        if (cancelled) return;
        setMonths(list);
        if (list.length > 0) {
          const last = list[list.length - 1];
          setLoadingMonth(last);
          setSyncing(true);
          await loadMonth(last, cancelled);
        }
      } catch (e) {
        if (!cancelled) setError("Could not connect to Google Sheets.");
      }
      if (!cancelled) setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function switchMonth(monthName) {
    setSyncing(true);
    setLoadingMonth(monthName);
    setMonthData(null); // clear previous data immediately
    try {
      const raw = await getMonthData(monthName);

      const allRaw = raw.expenses?.map((e) => e.raw) || [];
      const allItems = extractUniqueItems(allRaw);
      await translateUnknownItems(allItems);

      const categoryTotals = {};
      allRaw.forEach((rawStr) => {
        const parsed = parseRawExpenses(rawStr);
        parsed.forEach(({ name, amount }) => {
          categoryTotals[name] =
            (categoryTotals[name] || 0) + parseFloat(amount);
        });
      });

      const expenses = Object.entries(categoryTotals).map(([name, amount]) => ({
        id: Date.now() + Math.random(),
        name,
        amount: amount.toFixed(2),
        recurring: false,
        frequency: "monthly",
      }));

      setMonthData({
        label: monthName,
        income: raw.income,
        expenses,
        grandTotal: raw.grandTotal,
      });
      setActiveMonth(monthName);
    } catch (e) {
      setError(`Could not load ${monthName}.`);
    }
    setSyncing(false);
    setLoadingMonth(null);
  }

  const handleImport = () => {
    if (!monthData) return;
    onImport({
      label: monthData.label,
      income: monthData.income,
      expenses: monthData.expenses,
    });
    setOpen(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-400/10 border border-teal-400/20">
            <RefreshCw size={14} className="text-teal-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
              Import from Google Sheets
            </p>
            <p className="text-xs text-zinc-400">
              Load your expense data directly from your spreadsheet
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-4">
          {/* Error */}
          {error && (
            <div className="flex gap-2 items-start p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
              <AlertCircle
                size={14}
                className="text-red-500 mt-0.5 flex-shrink-0"
              />
              <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              Connecting to Google Sheets...
            </div>
          )}

          {/* Month selector */}
          {!loading && months.length > 0 && (
            <>
              <div>
                <p className="text-xs text-zinc-400 mb-2">Select month</p>
                <div className="flex gap-1.5 flex-wrap">
                  {months.map((m) => (
                    <button
                      key={m}
                      onClick={() => switchMonth(m)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer active:scale-95 ${
                        activeMonth === m
                          ? "bg-brand-400 text-white border-brand-400"
                          : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-brand-400 hover:text-brand-400"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {syncing && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  Loading {loadingMonth}...
                </div>
              )}

              {!syncing && monthData && (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">
                    Preview — {monthData.label}
                  </p>

                  {/* Income */}
                  <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700">
                    <span className="text-xs text-zinc-400">Income</span>
                    <span className="text-sm font-semibold text-teal-400">
                      {formatMoney(monthData.income, currency)}
                    </span>
                  </div>

                  {/* Expense categories */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {monthData.expenses.map((e, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700"
                      >
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          {e.name}
                        </span>
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                          {formatMoney(e.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Grand total */}
                  <div className="flex justify-between items-center p-3 rounded-xl bg-brand-400/10 border border-brand-400/20">
                    <span className="text-xs font-semibold text-brand-400">
                      Grand Total
                    </span>
                    <span className="text-sm font-semibold text-brand-400">
                      {formatMoney(monthData.grandTotal, currency)}
                    </span>
                  </div>

                  <button
                    onClick={handleImport}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-teal-400 hover:bg-teal-600 text-white border border-teal-400 hover:border-teal-600 active:scale-95 transition-all duration-150 cursor-pointer"
                  >
                    <RefreshCw size={15} />
                    Load {activeMonth} into budget
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
