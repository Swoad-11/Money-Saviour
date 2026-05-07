import React from 'react';
import { Moon, Sun, PiggyBank } from 'lucide-react';
import { CURRENCIES } from '../utils/currencies';

export default function Navbar({ dark, setDark, currency, setCurrency }) {
  return (
    <nav className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-100 dark:border-zinc-800">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiggyBank className="text-brand-400" size={22} />
          <span className="font-display font-bold text-lg tracking-tight">Money Saviour</span>
          <span className="badge badge-amber ml-1">v2.0</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="input-base py-1 px-2 text-xs w-auto cursor-pointer"
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
            ))}
          </select>

          <button
            onClick={() => setDark(d => !d)}
            className="btn-ghost p-2 rounded-xl"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
