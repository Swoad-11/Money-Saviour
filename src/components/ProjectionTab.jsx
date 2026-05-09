import { useState, useMemo, useEffect, useRef } from "react";
import { TrendingUp } from "lucide-react";
import { formatMoney, CURRENCIES } from "../utils/currencies";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
);

const PRESETS = [
  { label: "1 yr", years: 1 },
  { label: "3 yr", years: 3 },
  { label: "5 yr", years: 5 },
  { label: "10 yr", years: 10 },
  { label: "20 yr", years: 20 },
];

export default function ProjectionTab({
  income,
  expenses,
  savingPct,
  currency,
}) {
  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol || "$";
  const chartRef = useRef(null);
  const instanceRef = useRef(null);

  const inc = parseFloat(income) || 0;
  const totalExp = expenses.reduce(
    (s, e) => s + (parseFloat(e.amount) || 0),
    0,
  );
  const balance = inc - totalExp;
  const defaultMonthlySaving = Math.max(0, (balance * savingPct) / 100);

  const [monthlySaving, setMonthlySaving] = useState(defaultMonthlySaving);
  const [interestRate, setInterestRate] = useState(7);
  const [years, setYears] = useState(10);
  const [initialAmount, setInitialAmount] = useState(0);

  // Sync monthly saving if budget changes
  useEffect(() => {
    setMonthlySaving(defaultMonthlySaving);
  }, [defaultMonthlySaving]);

  // Calculate projection data
  const projection = useMemo(() => {
    const monthly = parseFloat(monthlySaving) || 0;
    const rate = parseFloat(interestRate) / 100 / 12;
    const initial = parseFloat(initialAmount) || 0;
    const months = years * 12;

    const withInterest = [];
    const withoutInterest = [];
    const labels = [];

    for (let m = 0; m <= months; m++) {
      // Compound interest: FV = PV(1+r)^n + PMT * [((1+r)^n - 1) / r]
      const fv =
        rate > 0
          ? initial * Math.pow(1 + rate, m) +
            monthly * ((Math.pow(1 + rate, m) - 1) / rate)
          : initial + monthly * m;

      const simple = initial + monthly * m;

      if (m % 12 === 0) {
        labels.push(m === 0 ? "Now" : `Yr ${m / 12}`);
        withInterest.push(parseFloat(fv.toFixed(2)));
        withoutInterest.push(parseFloat(simple.toFixed(2)));
      }
    }

    const finalWithInterest = withInterest[withInterest.length - 1];
    const finalSimple = withoutInterest[withoutInterest.length - 1];
    const totalContributed = initial + (parseFloat(monthly) || 0) * months;
    const interestEarned = finalWithInterest - totalContributed;

    return {
      labels,
      withInterest,
      withoutInterest,
      finalWithInterest,
      finalSimple,
      totalContributed,
      interestEarned,
    };
  }, [monthlySaving, interestRate, years, initialAmount]);

  // Chart
  useEffect(() => {
    if (!chartRef.current) return;

    const { labels, withInterest, withoutInterest } = projection;

    if (instanceRef.current) {
      instanceRef.current.data.labels = labels;
      instanceRef.current.data.datasets[0].data = withInterest;
      instanceRef.current.data.datasets[1].data = withoutInterest;
      instanceRef.current.update();
      return;
    }

    instanceRef.current = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: `With ${interestRate}% return`,
            data: withInterest,
            borderColor: "#1D9E75",
            backgroundColor: "rgba(29,158,117,0.1)",
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: "#1D9E75",
            tension: 0.4,
            fill: true,
          },
          {
            label: "No interest",
            data: withoutInterest,
            borderColor: "#BA7517",
            backgroundColor: "rgba(186,117,23,0.05)",
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: "#BA7517",
            tension: 0.4,
            fill: false,
            borderDash: [5, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "top",
            labels: {
              font: { size: 12, family: "DM Sans" },
              color: "#888",
              boxWidth: 12,
              padding: 16,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                ` ${ctx.dataset.label}: ${formatMoney(ctx.parsed.y, currency)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#888", font: { size: 11 } },
            grid: { color: "rgba(128,128,128,0.08)" },
          },
          y: {
            ticks: {
              color: "#888",
              font: { size: 11 },
              callback: (val) => formatMoney(val, currency),
            },
            grid: { color: "rgba(128,128,128,0.08)" },
          },
        },
      },
    });

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [projection, currency]);

  // Update chart dataset label when interest rate changes
  useEffect(() => {
    if (instanceRef.current) {
      instanceRef.current.data.datasets[0].label = `With ${interestRate}% return`;
      instanceRef.current.update();
    }
  }, [interestRate]);

  const inputClass =
    "w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-400 transition";

  if (!inc) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
        <TrendingUp
          size={32}
          className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2"
        />
        <p className="text-sm text-zinc-400">
          Enter your income on the Budget tab first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
          Projection settings
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Monthly saving */}
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">
              Monthly savings ({sym})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">
                {sym}
              </span>
              <input
                type="number"
                value={monthlySaving}
                onChange={(e) => setMonthlySaving(e.target.value)}
                min="0"
                className={inputClass + " pl-7"}
              />
            </div>
            {defaultMonthlySaving > 0 &&
              parseFloat(monthlySaving) !== defaultMonthlySaving && (
                <button
                  onClick={() => setMonthlySaving(defaultMonthlySaving)}
                  className="text-xs text-brand-400 mt-1 hover:underline cursor-pointer"
                >
                  Reset to budget ({formatMoney(defaultMonthlySaving, currency)}
                  )
                </button>
              )}
          </div>

          {/* Initial amount */}
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">
              Starting amount ({sym})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">
                {sym}
              </span>
              <input
                type="number"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                min="0"
                placeholder="0"
                className={inputClass + " pl-7"}
              />
            </div>
          </div>
        </div>

        {/* Interest rate */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-zinc-400">Annual return rate</label>
            <span className="text-sm font-semibold text-teal-400">
              {interestRate}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-zinc-400 mt-1">
            <span>0% (savings acc.)</span>
            <span>7% (index fund avg.)</span>
            <span>20%</span>
          </div>
        </div>

        {/* Year presets */}
        <div>
          <label className="text-xs text-zinc-400 mb-2 block">
            Time horizon
          </label>
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.years}
                onClick={() => setYears(p.years)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all duration-150 cursor-pointer active:scale-95 ${
                  years === p.years
                    ? "bg-brand-400 text-white border-brand-400"
                    : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-brand-400 hover:text-brand-400"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: `After ${years} yr${years > 1 ? "s" : ""}`,
            value: formatMoney(projection.finalWithInterest, currency),
            color: "text-teal-400",
            sub: "with compound interest",
          },
          {
            label: "Without interest",
            value: formatMoney(projection.finalSimple, currency),
            color: "text-brand-400",
            sub: "simple savings total",
          },
          {
            label: "Total contributed",
            value: formatMoney(projection.totalContributed, currency),
            color: "text-zinc-800 dark:text-zinc-100",
            sub: "your actual deposits",
          },
          {
            label: "Interest earned",
            value: formatMoney(
              Math.max(0, projection.interestEarned),
              currency,
            ),
            color: "text-teal-400",
            sub: "money made on money",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-1"
          >
            <span className="text-xs text-zinc-400">{m.label}</span>
            <span className={`text-base font-semibold ${m.color}`}>
              {m.value}
            </span>
            <span className="text-xs text-zinc-400">{m.sub}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
          Growth over {years} year{years > 1 ? "s" : ""}
        </p>
        <div style={{ height: 260 }}>
          <canvas ref={chartRef} />
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
          Milestones
        </p>
        <div className="space-y-2">
          {[1000, 5000, 10000, 50000, 100000, 500000, 1000000].map(
            (milestone) => {
              const monthly = parseFloat(monthlySaving) || 0;
              const rate = parseFloat(interestRate) / 100 / 12;
              const initial = parseFloat(initialAmount) || 0;
              if (initial >= milestone) return null;
              if (monthly <= 0) return null;

              // Solve for n months: milestone = initial*(1+r)^n + monthly*((1+r)^n - 1)/r
              let months = 0;
              if (rate === 0) {
                months = Math.ceil((milestone - initial) / monthly);
              } else {
                // Binary search
                let lo = 0,
                  hi = 120 * 12;
                while (lo < hi) {
                  const mid = Math.floor((lo + hi) / 2);
                  const fv =
                    initial * Math.pow(1 + rate, mid) +
                    monthly * ((Math.pow(1 + rate, mid) - 1) / rate);
                  if (fv >= milestone) hi = mid;
                  else lo = mid + 1;
                }
                months = lo;
              }

              if (months > 50 * 12) return null;

              const yrs = Math.floor(months / 12);
              const mos = months % 12;
              const label =
                yrs > 0 ? `${yrs}y${mos > 0 ? ` ${mos}m` : ""}` : `${mos}m`;

              return (
                <div
                  key={milestone}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {formatMoney(milestone, currency)}
                    </span>
                    <span className="text-xs text-zinc-400">milestone</span>
                  </div>
                  <span className="text-sm font-medium text-teal-400">
                    in {label}
                  </span>
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
