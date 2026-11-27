// LEGACY v1 backend, kept for reference only. Do not deploy: it has no access check
// and its save actions clear whole tabs. The 2.0 backend is apps-script/Code.gs.

function doGet(e) {
  const action = e.parameter.action;

  try {
    if (action === "getMonths")       return respond(getMonths());
    if (action === "getMonth")        return respond(getMonth(e.parameter.month));
    if (action === "saveIncome")      return respond(saveIncome(e.parameter.month, e.parameter.income));
    if (action === "addExpense")      return respond(addExpense(e.parameter.month, e.parameter.date, e.parameter.expense, e.parameter.amount));
    if (action === "getGoals")        return respond(getGoals());
    if (action === "saveGoals")       return respond(saveGoals(e.parameter.data));
    if (action === "getHistory")      return respond(getHistory());
    if (action === "saveHistory")     return respond(saveHistory(e.parameter.data));
    if (action === "getSettings")     return respond(getSettings());
    if (action === "saveSettings")    return respond(saveSettings(e.parameter.data));
    if (action === "getNetWorth")     return respond(getNetWorth());
    if (action === "saveNetWorth")    return respond(saveNetWorth(e.parameter.data));
    if (action === "syncAll")         return respond(syncAll());
    return respond({ error: "Unknown action" });
  } catch(err) {
    return respond({ error: err.message });
  }
}

function respond(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(name, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

// ─── MONTHS ───────────────────────────────────────────

function getMonths() {
  const ss = getSpreadsheet();
  const excluded = ["Goals", "History", "Settings", "NetWorth"];
  return ss.getSheets()
    .map(s => s.getName())
    .filter(name => !excluded.includes(name));
}

function getMonth(monthName) {
  const sheet = getSpreadsheet().getSheetByName(monthName);
  if (!sheet) return { error: "Sheet not found" };

  const data = sheet.getDataRange().getValues();
  const income = parseFloat(data[0][1]) || 0;

  let headerRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === "date") {
      headerRow = i;
      break;
    }
  }

  const expenses = [];
  if (headerRow >= 0) {
    for (let i = headerRow + 1; i < data.length; i++) {
      const date = data[i][0];
      const expStr = data[i][1];
      const total = data[i][2];
      if (!date || !expStr) continue;
      if (String(expStr).toLowerCase().includes("grand")) continue;
      if (String(date).toLowerCase().includes("grand")) continue;
      expenses.push({
        date: String(date).trim(),
        raw: String(expStr).trim(),
        total: parseFloat(total) || 0,
      });
    }
  }

  let grandTotal = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (String(data[i][1]).toLowerCase().includes("grand")) {
      grandTotal = parseFloat(data[i][2]) || 0;
      break;
    }
  }

  return { month: monthName, income, expenses, grandTotal };
}

function saveIncome(monthName, income) {
  const sheet = getSpreadsheet().getSheetByName(monthName);
  if (!sheet) return { error: "Sheet not found" };
  sheet.getRange("A1").setValue("Income");
  sheet.getRange("B1").setValue(parseFloat(income) || 0);
  return { success: true };
}

function addExpense(monthName, date, expense, amount) {
  const sheet = getSpreadsheet().getSheetByName(monthName);
  if (!sheet) return { error: "Sheet not found" };

  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(date).trim()) {
      const existing = String(data[i][1]).trim();
      const updated = existing ? `${existing}, ${expense}=${amount}` : `${expense}=${amount}`;
      sheet.getRange(i + 1, 2).setValue(updated);

      const items = updated.split(",").map(s => s.trim());
      let rowTotal = 0;
      items.forEach(item => {
        const parts = item.split("=");
        if (parts.length === 2) rowTotal += parseFloat(parts[1]) || 0;
      });
      sheet.getRange(i + 1, 3).setValue(rowTotal);
      return { success: true };
    }
  }
  return { error: "Date not found" };
}

// ─── GOALS ────────────────────────────────────────────

function getGoals() {
  const sheet = getOrCreateSheet("Goals", ["id","name","target","saved","currency","createdAt"]);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(row => ({
    id: row[0], name: row[1], target: row[2],
    saved: row[3], currency: row[4], createdAt: row[5],
  }));
}

function saveGoals(dataStr) {
  const goals = JSON.parse(dataStr);
  const sheet = getOrCreateSheet("Goals", ["id","name","target","saved","currency","createdAt"]);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, 6).setValues([["id","name","target","saved","currency","createdAt"]]);
  if (goals.length > 0) {
    sheet.getRange(2, 1, goals.length, 6).setValues(
      goals.map(g => [g.id, g.name, g.target, g.saved, g.currency, g.createdAt])
    );
  }
  return { success: true };
}

// ─── HISTORY ──────────────────────────────────────────

function getHistory() {
  const sheet = getOrCreateSheet("History", ["label","income","totalExp","saving","savingPct","currency"]);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(row => ({
    label: row[0], income: row[1], totalExp: row[2],
    saving: row[3], savingPct: row[4], currency: row[5],
  }));
}

function saveHistory(dataStr) {
  const history = JSON.parse(dataStr);
  const sheet = getOrCreateSheet("History", ["label","income","totalExp","saving","savingPct","currency"]);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, 6).setValues([["label","income","totalExp","saving","savingPct","currency"]]);
  if (history.length > 0) {
    sheet.getRange(2, 1, history.length, 6).setValues(
      history.map(h => [h.label, h.income, h.totalExp, h.saving, h.savingPct || 20, h.currency])
    );
  }
  return { success: true };
}

// ─── SETTINGS ─────────────────────────────────────────

function getSettings() {
  const sheet = getOrCreateSheet("Settings", ["key","value"]);
  const data = sheet.getDataRange().getValues();
  const settings = {};
  data.slice(1).forEach(row => { settings[row[0]] = row[1]; });
  return settings;
}

function saveSettings(dataStr) {
  const settings = JSON.parse(dataStr);
  const sheet = getOrCreateSheet("Settings", ["key","value"]);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, 2).setValues([["key","value"]]);
  const rows = Object.entries(settings);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
  return { success: true };
}

// ─── NET WORTH ────────────────────────────────────────

function getNetWorth() {
  const sheet = getOrCreateSheet("NetWorth", ["id","name","type","value","category","updatedAt"]);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(row => ({
    id: row[0], name: row[1], type: row[2],
    value: row[3], category: row[4], updatedAt: row[5],
  }));
}

function saveNetWorth(dataStr) {
  const items = JSON.parse(dataStr);
  const sheet = getOrCreateSheet("NetWorth", ["id","name","type","value","category","updatedAt"]);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, 6).setValues([["id","name","type","value","category","updatedAt"]]);
  if (items.length > 0) {
    sheet.getRange(2, 1, items.length, 6).setValues(
      items.map(i => [i.id, i.name, i.type, i.value, i.category, i.updatedAt])
    );
  }
  return { success: true };
}

// ─── SYNC ALL ─────────────────────────────────────────

function syncAll() {
  return {
    goals: getGoals(),
    history: getHistory(),
    settings: getSettings(),
    netWorth: getNetWorth(),
    months: getMonths(),
  };
}

function doOptions(e) {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
