import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  PieChart,
  Target,
  History,
  RefreshCw,
} from "lucide-react";
import Navbar from "./components/Navbar";
import BudgetTab from "./components/BudgetTab";
import OverviewTab from "./components/OverviewTab";
import GoalsTab from "./components/GoalsTab";
import HistoryTab from "./components/HistoryTab";
import RecurringTab from "./components/RecurringTab";
import { useLocalStorage } from "./hooks/useLocalStorage";

const TABS = [
  { id: "budget", label: "Budget", icon: LayoutDashboard },
  { id: "overview", label: "Overview", icon: PieChart },
  { id: "recurring", label: "Recurring", icon: RefreshCw },
  { id: "goals", label: "Goals", icon: Target },
  { id: "history", label: "History", icon: History },
];

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
];

export default function App() {
  const [dark, setDark] = useLocalStorage("ms_dark", false);
  const [currency, setCurrency] = useLocalStorage("ms_currency", "USD");
  const [activeTab, setActiveTab] = useState("budget");
  const [history, setHistory] = useLocalStorage("ms_history", []);

  const [income, setIncome] = useLocalStorage("ms_income", "");
  const [expenses, setExpenses] = useLocalStorage(
    "ms_expenses",
    DEFAULT_EXPENSES,
  );
  const [savingPct, setSavingPct] = useLocalStorage("ms_saving_pct", 20);

  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [dark]);

  const totalExp = expenses.reduce(
    (s, e) => s + (parseFloat(e.amount) || 0),
    0,
  );
  const balance = (parseFloat(income) || 0) - totalExp;
  const monthlySaving = Math.max(0, (balance * savingPct) / 100);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
        <Navbar
          dark={dark}
          setDark={setDark}
          currency={currency}
          setCurrency={setCurrency}
        />

        <main className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl mb-6 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-btn flex items-center justify-center gap-1.5 whitespace-nowrap px-3 ${activeTab === tab.id ? "active" : ""}`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === "budget" && (
            <BudgetTab
              currency={currency}
              income={income}
              setIncome={setIncome}
              expenses={expenses}
              setExpenses={setExpenses}
              savingPct={savingPct}
              setSavingPct={setSavingPct}
              history={history}
              setHistory={setHistory}
            />
          )}
          {activeTab === "overview" && (
            <OverviewTab
              income={income}
              expenses={expenses}
              savingPct={savingPct}
              currency={currency}
            />
          )}
          {activeTab === "recurring" && (
            <RecurringTab
              expenses={expenses}
              currency={currency}
              income={income}
            />
          )}
          {activeTab === "goals" && (
            <GoalsTab currency={currency} monthlySaving={monthlySaving} />
          )}
          {activeTab === "history" && (
            <HistoryTab
              history={history}
              setHistory={setHistory}
              currency={currency}
            />
          )}
        </main>

        <footer className="text-center py-6 text-xs text-zinc-400 dark:text-zinc-600">
          Money Saviour v2.0 — your data is saved locally in your browser
        </footer>
      </div>
    </div>
  );
}
