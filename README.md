# 💰 Money Saviour v2.0

A personal finance tracker built with **React + Tailwind CSS v4 + Vite**. Started as a simple HTML/CSS/JS project in 2019 — rebuilt from the ground up with modern tooling, AI-powered insights, and a clean dark-mode UI.

---

## ✨ Features

### Budget Tab

- Enter your monthly income
- Add, edit, and delete expense categories dynamically
- Mark expenses as **recurring** with frequency options (monthly, weekly, fortnightly, yearly)
- Savings target slider — drag to set your savings % goal
- Live summary cards: total expenses, balance left, monthly savings
- **Save month** — snapshot your budget to history
- **Export CSV** — download your full budget as a spreadsheet

### Overview Tab

- Doughnut chart showing spending by category
- Budget health bars — expense ratio and savings rate at a glance
- Per-category breakdown with color-coded progress bars

### Recurring Tab

- See all recurring commitments in one place
- Monthly and yearly totals for fixed costs
- Warning alert if recurring expenses exceed 60% of income

### Goals Tab

- Create named savings goals with a target amount
- Track progress with a visual progress bar
- Quick-contribute buttons (+10, +50, +100, +500)
- Estimated months to reach goal based on current savings rate

### History Tab

- Monthly snapshots saved from the Budget tab
- Trend indicators showing if savings went up or down vs last month
- Total saved and average monthly savings across all recorded months

### Global Features

- 🌙 **Dark mode** — toggle in the navbar, preference saved automatically
- 💱 **20+ currencies** — USD, BDT, EUR, GBP, INR, AED, SAR, JPY, and more
- 💾 **localStorage persistence** — all data survives page refresh, no account needed
- 📱 **Responsive** — works on mobile and desktop

---

## 🛠 Tech Stack

| Tool            | Version | Purpose                    |
| --------------- | ------- | -------------------------- |
| React           | 18      | UI framework               |
| Vite            | 5+      | Build tool & dev server    |
| Tailwind CSS    | v4      | Styling                    |
| Chart.js        | 4       | Doughnut chart             |
| react-chartjs-2 | 5       | React wrapper for Chart.js |
| lucide-react    | 0.383   | Icons                      |

--

## 🗺 Roadmap

### Phase 2 — Visuals & Simulator

- [ ] Income vs expense trend line chart across saved months
- [ ] "What if" simulator — sliders to explore spending cuts
- [ ] Savings projection — compound interest calculator over 1, 5, 10, 20 years

### Phase 3 — AI Features

- [ ] Receipt scanner — upload a photo, AI extracts expenses automatically
- [ ] Spending pattern detection — AI flags unusual month-over-month changes
- [ ] Personalized savings plan — AI generates a week-by-week action plan

### Phase 4 — Daily Tracking

- [ ] Daily expense log — quick-add transactions through the day
- [ ] Bill due date reminders — alert when payments are coming up
- [ ] Debt tracker — log loans and track payoff progress

---

## 🙏 Origin Story

This project started as a simple HTML/CSS/JS expense calculator back in 2019 — one of my very first coding projects. Six years later it's been completely rebuilt as a modern React app with dark mode, AI features, persistent storage, and a proper component architecture. Same idea, grown up.
