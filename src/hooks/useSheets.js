// src/services/sheets.js

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwK310qy6j7ljFKaShMh0NTcK4adFIOfajhEICRwUkEAJceeSEd-sbyfXWCQi7SYYjV7w/exec";

async function call(params) {
  const url = new URL(SCRIPT_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method: "GET",
    redirect: "follow",
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// For large data (goals, history etc) we POST to avoid URL length limits
async function callPost(action, data) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ action, data: JSON.stringify(data) }),
  });
  const result = await res.json();
  if (result.error) throw new Error(result.error);
  return result;
}

// ─── MONTHS ───────────────────────────────────────────

export async function getMonths() {
  return call({ action: "getMonths" });
}

export async function getMonthData(monthName) {
  return call({ action: "getMonth", month: monthName });
}

export async function saveIncome(monthName, income) {
  return call({ action: "saveIncome", month: monthName, income });
}

export async function addExpenseEntry(monthName, date, expenseName, amount) {
  return call({
    action: "addExpense",
    month: monthName,
    date,
    expense: expenseName,
    amount,
  });
}

// ─── SYNC ALL ─────────────────────────────────────────

export async function syncAll() {
  return call({ action: "syncAll" });
}

// ─── GOALS ────────────────────────────────────────────

export async function getGoals() {
  return call({ action: "getGoals" });
}

export async function saveGoals(goals) {
  return call({
    action: "saveGoals",
    data: JSON.stringify(goals),
  });
}

// ─── HISTORY ──────────────────────────────────────────

export async function getHistory() {
  return call({ action: "getHistory" });
}

export async function saveHistory(history) {
  return call({
    action: "saveHistory",
    data: JSON.stringify(history),
  });
}

// ─── SETTINGS ─────────────────────────────────────────

export async function getSettings() {
  return call({ action: "getSettings" });
}

export async function saveSettings(settings) {
  return call({
    action: "saveSettings",
    data: JSON.stringify(settings),
  });
}

// ─── NET WORTH ────────────────────────────────────────

export async function getNetWorth() {
  return call({ action: "getNetWorth" });
}

export async function saveNetWorth(items) {
  return call({
    action: "saveNetWorth",
    data: JSON.stringify(items),
  });
}
