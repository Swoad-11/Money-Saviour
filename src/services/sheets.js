// src/services/sheets.js

import {
  parseRawExpenses,
  extractUniqueItems,
  translateUnknownItems,
} from "./translator";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwK310qy6j7ljFKaShMh0NTcK4adFIOfajhEICRwUkEAJceeSEd-sbyfXWCQi7SYYjV7w/exec";

async function call(params) {
  const url = new URL(SCRIPT_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.json();
}

// Get all month tab names
export async function getMonths() {
  return call({ action: "getMonths" });
}

// Get full data for one month, with AI translation applied
export async function getMonthData(monthName) {
  const raw = await call({ action: "getMonth", month: monthName });
  if (raw.error) throw new Error(raw.error);

  // Collect all raw expense strings
  const allRaw = raw.expenses.map((e) => e.raw);

  // Find unknown items and translate via AI if needed
  const allItems = extractUniqueItems(allRaw);
  await translateUnknownItems(allItems);

  // Parse each day's expenses into categorized amounts
  const dailyEntries = raw.expenses.map((row) => ({
    date: row.date,
    total: row.total,
    categories: parseRawExpenses(row.raw),
  }));

  // Roll up all days into monthly category totals
  const monthlyTotals = {};
  dailyEntries.forEach((day) => {
    day.categories.forEach(({ name, amount }) => {
      monthlyTotals[name] = (monthlyTotals[name] || 0) + parseFloat(amount);
    });
  });

  // Build expenses array for the app
  const expenses = Object.entries(monthlyTotals).map(([name, amount]) => ({
    id: Date.now() + Math.random(),
    name,
    amount: amount.toFixed(2),
    recurring: false,
    frequency: "monthly",
  }));

  return {
    label: monthName,
    income: raw.income,
    expenses,
    grandTotal: raw.grandTotal,
    dailyEntries, // for daily log view
  };
}

// Save income for a month
export async function saveIncome(monthName, income) {
  return call({ action: "saveIncome", month: monthName, income });
}

// Add a single expense entry to a specific date
export async function addExpenseEntry(monthName, date, expenseName, amount) {
  return call({
    action: "addExpense",
    month: monthName,
    date,
    expense: expenseName,
    amount,
  });
}
