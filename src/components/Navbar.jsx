import { Moon, Sun, Wallet, RefreshCw } from "lucide-react";
import { CURRENCIES } from "../utils/currencies";

export default function Navbar({
  dark,
  setDark,
  currency,
  setCurrency,
  syncing,
  syncError,
  lastSynced,
  onSync,
}) {
  return (
    <nav className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-100 dark:border-zinc-800">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="text-brand-400" size={22} />
          <span className="font-bold text-lg tracking-tight">
            Money Saviour
          </span>
          <span className="hidden sm:inline ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-400/10 text-brand-400 border border-brand-400/20">
            v2.0
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sync button */}
          <button
            onClick={onSync}
            disabled={syncing}
            title={
              lastSynced
                ? `Last synced: ${lastSynced.toLocaleTimeString()}`
                : "Sync with Google Sheets"
            }
            className={`p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
              syncError
                ? "border-red-300 dark:border-red-800 text-red-400"
                : syncing
                  ? "border-zinc-200 dark:border-zinc-700 text-zinc-400"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-teal-400 hover:border-teal-400"
            }`}
          >
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          </button>

          {/* Currency selector */}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-400 cursor-pointer transition"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
          </select>

          {/* Dark mode */}
          <button
            onClick={() => setDark((d) => !d)}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-all duration-150 cursor-pointer"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
