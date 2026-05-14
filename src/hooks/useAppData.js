import { useState, useEffect } from "react";
import {
  syncAll,
  saveGoals,
  saveHistory,
  saveSettings,
  saveNetWorth,
  saveIncome,
} from "../services/sheets";

const DEFAULT_EXPENSES = [
  { id: 1, name: "Food", amount: "", recurring: true, frequency: "monthly" },
  { id: 2, name: "Rent", amount: "", recurring: true, frequency: "monthly" },
  {
    id: 3,
    name: "Transport",
    amount: "",
    recurring: false,
    frequency: "monthly",
  },
  {
    id: 4,
    name: "Utilities",
    amount: "",
    recurring: true,
    frequency: "monthly",
  },
  {
    id: 5,
    name: "Medicine",
    amount: "",
    recurring: false,
    frequency: "monthly",
  },
  {
    id: 6,
    name: "Internet",
    amount: "",
    recurring: true,
    frequency: "monthly",
  },
];

export function useAppData() {
  const [syncing, setSyncing] = useState(true);
  const [syncError, setSyncError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  const [currency, setCurrencyState] = useState("BDT");
  const [dark, setDarkState] = useState(false);
  const [savingPct, setSavingPctState] = useState(20);

  const [income, setIncomeState] = useState("");
  const [expenses, setExpensesState] = useState(DEFAULT_EXPENSES);

  const [goals, setGoalsState] = useState([]);
  const [history, setHistoryState] = useState([]);
  const [netWorth, setNetWorthState] = useState([]);
  const [months, setMonths] = useState([]);

  useEffect(() => {
    sync();
  }, []);

  async function sync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const data = await syncAll();

      if (data.settings && Object.keys(data.settings).length > 0) {
        if (data.settings.currency) setCurrencyState(data.settings.currency);
        if (data.settings.dark !== undefined)
          setDarkState(
            data.settings.dark === "true" || data.settings.dark === true,
          );
        if (data.settings.savingPct)
          setSavingPctState(Number(data.settings.savingPct));
      }

      if (Array.isArray(data.goals)) {
        setGoalsState(
          data.goals.map((g) => ({
            ...g,
            target: parseFloat(g.target) || 0,
            saved: parseFloat(g.saved) || 0,
          })),
        );
      }

      if (Array.isArray(data.history)) {
        setHistoryState(
          data.history.map((h) => ({
            ...h,
            income: parseFloat(h.income) || 0,
            totalExp: parseFloat(h.totalExp) || 0,
            saving: parseFloat(h.saving) || 0,
            savingPct: parseFloat(h.savingPct) || 20,
          })),
        );
      }

      if (Array.isArray(data.netWorth)) {
        setNetWorthState(
          data.netWorth.map((n) => ({
            ...n,
            value: parseFloat(n.value) || 0,
          })),
        );
      }

      if (Array.isArray(data.months)) {
        setMonths(data.months);
      }

      setLastSynced(new Date());
    } catch (e) {
      setSyncError("Could not sync with Google Sheets. Working offline.");
      console.warn("Sync failed:", e);
    }
    setSyncing(false);
  }

  // Settings
  async function setCurrency(val) {
    setCurrencyState(val);
    await saveSettings({ currency: val, dark, savingPct }).catch(console.warn);
  }

  async function setDark(val) {
    const newVal = typeof val === "function" ? val(dark) : val;
    setDarkState(newVal);
    await saveSettings({ currency, dark: newVal, savingPct }).catch(
      console.warn,
    );
  }

  async function setSavingPct(val) {
    setSavingPctState(val);
    await saveSettings({ currency, dark, savingPct: val }).catch(console.warn);
  }

  // Budget
  function setIncome(val) {
    setIncomeState(val);
  }

  function setExpenses(val) {
    if (typeof val === "function") {
      setExpensesState(val);
    } else {
      setExpensesState(val);
    }
  }

  // Goals
  async function setGoals(val) {
    const newGoals = typeof val === "function" ? val(goals) : val;
    setGoalsState(newGoals);
    await saveGoals(newGoals).catch(console.warn);
  }

  // History
  async function setHistory(val) {
    const newHistory = typeof val === "function" ? val(history) : val;
    setHistoryState(newHistory);
    await saveHistory(newHistory).catch(console.warn);
  }

  // Net worth
  async function setNetWorth(val) {
    const newNetWorth = typeof val === "function" ? val(netWorth) : val;
    setNetWorthState(newNetWorth);
    await saveNetWorth(newNetWorth).catch(console.warn);
  }

  return {
    syncing,
    syncError,
    lastSynced,
    sync,
    currency,
    setCurrency,
    dark,
    setDark,
    savingPct,
    setSavingPct,
    income,
    setIncome,
    expenses,
    setExpenses,
    goals,
    setGoals,
    history,
    setHistory,
    netWorth,
    setNetWorth,
    months,
  };
}
