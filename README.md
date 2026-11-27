# Money Saviour 2.0

A monthly expense calculator and workspace for an expense log kept in Google Sheets. You keep writing `item=amount` in the sheet; the app reads every day, sorts each item into a category, and shows the month as an editable table, a running calculator and charts. Edits made in the app go back to the sheet.

The v1 savings planner is kept at the tag [`v1-legacy`](https://github.com/Swoad-11/Money-Saviour/tree/v1-legacy).

## What it does

- **Overview:** spent so far against last month on the same day, daily average, projected month-end, fixed costs, quick add for today, daily and running-total charts, category breakdown, biggest days, and what needs attention.
- **Expenses:** every day of the month. Edit a day as text or item by item with a live total, bulk-paste many days at once, or add from anywhere with Ctrl/Cmd+K. Undo works for single edits, batches and templates.
- **History:** the year by month, with a month table and a category-by-month grid.
- **Categories:** a review queue for item names that have no rule yet, the full rule list (about 200 rules carried over from v1, plus yours), and category settings including fixed or variable.
- **Templates:** expected monthly items such as bills, applied to a month with a preview that skips what's already there.
- **Settings:** connection, sync status, theme (light, dark, system), JSON backup and restore, CSV export.

It works offline from the last sync. Edits made offline are kept on the device and sent when the connection returns.

## The spreadsheet

One spreadsheet per year (for example "Monthly Expense - 2026"), one tab per month named `January` to `December`:

| | A | B | C |
|---|---|---|---|
| 1 | Date | Expenses | Total |
| 2 | 11-01-2026 | `gas bill=1080, nasta=60, vara=20+15` | `=IF(B2="", "", SUM(SPLIT(REGEXREPLACE(B2, "[^0-9.]+", "\|"), "\|")))` |
| … | | | |
| | | Grand Total= | `=SUMIF(C2:C32, ">0")` |

The app only ever writes column B of a dated row. Column C formulas and the Grand total row are never touched. Every app write checks that the cell still holds what the app last read, so a change made directly in the sheet is never overwritten silently.

Settings the app creates live in tabs whose names start with `_` (`_Categories`, `_Rules`, `_Templates`). Month tabs are never restructured.

## Connecting your sheet

1. Open the app, go to **Settings › Data source › Google Sheet**, click **Generate a token** and copy it.
2. In the spreadsheet: **Extensions › Apps Script**. Replace `Code.gs` with [`apps-script/Code.gs`](apps-script/Code.gs) and save.
3. **Project Settings › Script properties**: add `MS_TOKEN` with the token as its value.
4. **Deploy › New deployment › Web app**. Execute as: *Me*. Who has access: *Anyone*. Deploy and authorize.
5. Paste the Web app URL into Settings, click **Test connection**, then **Save**.

"Anyone" is required because the browser can't send Google credentials to a web app. The token is the protection: the script refuses every request without it.

**Updating the script later:** paste the new `Code.gs`, then **Deploy › Manage deployments ›** edit (pencil) **› Version: New version**. The URL and token stay the same. **Settings › About › Check** shows which version is deployed.

## Privacy

- The token and script URL are stored only in the browser that uses them. They are never put in backups, exports or the repository.
- No real financial data is committed. The golden test that checks the parser against the real sheet reads a snapshot from `local-fixtures/`, which is git-ignored, and skips itself when the folder isn't there.

## Development

```
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest: core, data layer, Apps Script backend (run in a VM)
npm run lint
npm run typecheck
npm run build
```

To try the app without a sheet, pick **Sample data** in Settings.

### Layout

```
apps-script/Code.gs      Google Apps Script backend (token-protected POST API)
apps-script/legacy/      v1 backend, for reference only. Do not deploy.
src/core/                Pure logic: parser, rules, categorizer, summaries, templates, CSV
src/data/                API client, IndexedDB cache and outbox, backup format, sample data
src/state/               Zustand stores: sheet data and edits, categories/rules/templates, theme
src/features/            Pages: overview, expenses, history, categories, templates, settings
src/ui/                  Design tokens, shared components, charts
tests/                   Apps Script backend tests and the private golden test
```

Stack: React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Zustand, idb, Zod, Chart.js, Vitest.
