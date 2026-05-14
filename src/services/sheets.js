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

export async function syncAll() {
  return call({ action: "syncAll" });
}
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
export async function getGoals() {
  return call({ action: "getGoals" });
}
export async function saveGoals(goals) {
  return call({ action: "saveGoals", data: JSON.stringify(goals) });
}
export async function getHistory() {
  return call({ action: "getHistory" });
}
export async function saveHistory(history) {
  return call({ action: "saveHistory", data: JSON.stringify(history) });
}
export async function getSettings() {
  return call({ action: "getSettings" });
}
export async function saveSettings(settings) {
  return call({ action: "saveSettings", data: JSON.stringify(settings) });
}
export async function getNetWorth() {
  return call({ action: "getNetWorth" });
}
export async function saveNetWorth(items) {
  return call({ action: "saveNetWorth", data: JSON.stringify(items) });
}
