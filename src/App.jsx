import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  PieChart,
  Target,
  History,
  RefreshCw,
  Sliders,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Navbar from "./components/Navbar";
import BudgetTab from "./components/BudgetTab";
import OverviewTab from "./components/OverviewTab";
import GoalsTab from "./components/GoalsTab";
import HistoryTab from "./components/HistoryTab";
import RecurringTab from "./components/RecurringTab";
import SimulatorTab from "./components/SimulatorTab";
import ProjectionTab from "./components/ProjectionTab";
import { useAppData } from "./hooks/useAppData";

const TABS = [
  { id: "budget", label: "Budget", icon: LayoutDashboard },
  { id: "overview", label: "Overview", icon: PieChart },
  { id: "recurring", label: "Recurring", icon: RefreshCw },
  { id: "simulator", label: "Simulator", icon: Sliders },
  { id: "projection", label: "Projection", icon: TrendingUp },
  { id: "goals", label: "Goals", icon: Target },
  { id: "history", label: "History", icon: History },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("budget");

  const {
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
  } = useAppData();

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
          syncing={syncing}
          lastSynced={lastSynced}
          syncError={syncError}
          onSync={sync}
        />

        {/* Sync error banner */}
        {syncError && (
          <div className="max-w-5xl mx-auto px-4 pt-4">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-sm text-red-600 dark:text-red-300">
              <span>⚠️ {syncError}</span>
              <button
                onClick={sync}
                className="ml-auto text-xs underline cursor-pointer hover:no-underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <main className="max-w-5xl mx-auto px-4 py-6">
          {/* Tabs */}
          <div className="flex justify-center gap-2 mb-6 overflow-x-auto pb-1 flex-wrap">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                    whitespace-nowrap transition-all duration-200 border cursor-pointer active:scale-95
                    ${
                      isActive
                        ? "bg-brand-400 text-white border-brand-400 shadow-md"
                        : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-brand-400 hover:text-brand-400 dark:hover:border-brand-400 dark:hover:text-brand-400"
                    }
                  `}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
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
          {activeTab === "simulator" && (
            <SimulatorTab
              income={income}
              expenses={expenses}
              savingPct={savingPct}
              currency={currency}
            />
          )}
          {activeTab === "projection" && (
            <ProjectionTab
              income={income}
              expenses={expenses}
              savingPct={savingPct}
              currency={currency}
            />
          )}
          {activeTab === "goals" && (
            <GoalsTab
              currency={currency}
              monthlySaving={monthlySaving}
              goals={goals}
              setGoals={setGoals}
            />
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
          Money Saviour v2.0
          {lastSynced && (
            <span className="ml-2">
              · synced {lastSynced.toLocaleTimeString()}
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}
