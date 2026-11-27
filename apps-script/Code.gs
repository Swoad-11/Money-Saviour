/**
 * Money Saviour 2.0 backend (Google Apps Script, bound to the expense spreadsheet).
 *
 * Setup (once):
 *   1. Extensions > Apps Script, replace the contents of Code.gs with this file.
 *   2. Project Settings > Script properties: add MS_TOKEN with the token shown in
 *      the app's Settings page.
 *   3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 *      The token is what protects the data; requests without it are rejected.
 *
 * Every request is a POST with a text/plain JSON body: { token, action, params }.
 * Responses: { ok: true, data } or { ok: false, error: { code, message } }.
 *
 * Writes (setCells) only ever change column B of a dated expense row, and only when
 * the cell still holds the value the app last read. Column C formulas and the
 * Grand total row are never touched.
 */

var MS_VERSION = "2.2.0";

/** Settings tabs. Names start with "_" so they're never mistaken for month tabs. */
var MS_CONFIG = {
  categories: { tab: "_Categories", key: "id", columns: ["id", "name", "color", "kind", "archived", "order", "updatedAt"] },
  rules: { tab: "_Rules", key: "key", columns: ["key", "aliases", "categoryId", "kind", "updatedAt"] },
};

var MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

// ─── HTTP entry points ───────────────────────────────────────────────────

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || "");
  } catch (err) {
    return msRespond_(msFail_("BAD_REQUEST", "Body must be JSON"));
  }
  return msRespond_(msHandle_(body));
}

function doGet() {
  return msRespond_(msFail_("BAD_REQUEST", "Use POST"));
}

function msHandle_(body) {
  if (!body || typeof body !== "object") return msFail_("BAD_REQUEST", "Body must be a JSON object");
  if (!msTokenOk_(body.token)) return msFail_("AUTH", "Missing or wrong access token");

  var params = body.params || {};
  try {
    switch (body.action) {
      case "ping":
        return msOk_({ version: MS_VERSION, title: SpreadsheetApp.getActiveSpreadsheet().getName() });
      case "getWorkbook":
        return msOk_(msGetWorkbook_());
      case "getMonths":
        return msOk_(msGetMonths_(params.tabs));
      case "setCells":
        return msOk_(msSetCells_(params.edits));
      case "getConfig":
        return msOk_(msGetConfig_());
      case "saveConfig":
        return msOk_(msSaveConfig_(params));
      default:
        return msFail_("BAD_REQUEST", "Unknown action: " + body.action);
    }
  } catch (err) {
    return msFail_("SERVER", String((err && err.message) || err));
  }
}

function msRespond_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function msOk_(data) {
  return { ok: true, data: data };
}

function msFail_(code, message) {
  return { ok: false, error: { code: code, message: message } };
}

// ─── Auth ────────────────────────────────────────────────────────────────

function msTokenOk_(given) {
  var expected = PropertiesService.getScriptProperties().getProperty("MS_TOKEN");
  if (!expected || expected.length < 24) return false; // not configured: refuse everything
  if (typeof given !== "string" || given.length !== expected.length) return false;
  var diff = 0;
  for (var i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

// ─── Reading ─────────────────────────────────────────────────────────────

function msGetWorkbook_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var title = ss.getName();
  var tz = ss.getSpreadsheetTimeZone();
  var titleYear = msYearFrom_(title);
  var months = [];
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var ref = msMonthRef_(sheets[i].getName(), titleYear);
    if (ref) months.push(ref);
  }
  months.sort(function (a, b) {
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
  return { title: title, timeZone: tz, year: titleYear, months: months };
}

/** "November" or "November 2026" → { tab, key: "2026-11" }. Other tabs → null. */
function msMonthRef_(tab, fallbackYear) {
  if (tab.charAt(0) === "_") return null;
  var m = /^\s*([a-z]+)\s*(\d{4})?\s*$/i.exec(tab);
  if (!m) return null;
  var idx = MONTH_NAMES.indexOf(m[1].toLowerCase());
  if (idx < 0) return null;
  var year = m[2] ? Number(m[2]) : fallbackYear;
  if (!year) return null;
  return { tab: tab, key: year + "-" + (idx < 9 ? "0" : "") + (idx + 1) };
}

function msYearFrom_(text) {
  var m = /\b(20\d\d)\b/.exec(text || "");
  return m ? Number(m[1]) : null;
}

function msGetMonths_(tabs) {
  var wb = msGetWorkbook_();
  var wanted = Array.isArray(tabs) && tabs.length ? tabs : null;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = [];
  for (var i = 0; i < wb.months.length; i++) {
    var ref = wb.months[i];
    if (wanted && wanted.indexOf(ref.tab) < 0) continue;
    out.push(msReadMonth_(ss.getSheetByName(ref.tab), ref, wb.timeZone));
  }
  return out;
}

/**
 * Month tab layout: a row whose column A is "Date" is the header;
 * rows below: A = date, B = expenses text, C = total (formula);
 * the row whose column B contains "grand" holds the Grand total in C.
 * Income is optional: only read from a row above the header whose column A is "Income".
 */
function msReadMonth_(sheet, ref, tz) {
  var values = sheet.getDataRange().getValues();

  var header = -1;
  var income = null;
  for (var i = 0; i < values.length; i++) {
    var label = String(values[i][0]).trim().toLowerCase();
    if (label === "income") income = msNumber_(values[i][1]);
    if (label === "date") {
      header = i;
      break;
    }
  }

  var days = [];
  var grand = null;
  var warnings = [];
  if (header >= 0) {
    for (var r = header + 1; r < values.length; r++) {
      var row = values[r];
      var b = row[1] === undefined || row[1] === null ? "" : String(row[1]);
      if (/grand/i.test(b) || /grand/i.test(String(row[0]))) {
        grand = msNumber_(row[2]);
        break;
      }
      if (row[0] === "" || row[0] === null) {
        if (b.trim()) warnings.push("Row " + (r + 1) + " has expenses but no date");
        continue;
      }
      var date = msIsoDate_(row[0], tz);
      if (!date) {
        warnings.push("Row " + (r + 1) + " has an unreadable date: " + String(row[0]));
        continue;
      }
      days.push({ date: date, rowIndex: r + 1, raw: b, sheetTotal: msNumber_(row[2]) });
    }
  } else {
    warnings.push("No Date header row found");
  }

  return {
    key: ref.key,
    tab: ref.tab,
    income: income,
    days: days,
    sheetGrandTotal: grand,
    warnings: warnings,
  };
}

/** Numbers stay numbers; text counts only if it contains digits ("৳50,000" → 50000, "Expenses" → null). */
// ─── Writing ─────────────────────────────────────────────────────────────

/**
 * edits: [{ id, tab, rowIndex, date, expected, value }]
 * Each edit is checked on its own:
 *   - the tab must be a month tab, and the row must still hold `date` in column A
 *     and sit above the Grand total row;
 *   - column B must still equal `expected` (compare-and-set), otherwise "conflict".
 * Returns one result per edit: { id, status: "ok" | "conflict" | "not_found", raw, sheetTotal }.
 */
function msSetCells_(edits) {
  if (!Array.isArray(edits) || edits.length === 0) throw new Error("No edits");
  if (edits.length > 200) throw new Error("Too many edits in one request");

  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) throw new Error("The sheet is busy. Try again.");
  try {
    var wb = msGetWorkbook_();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var monthTabs = {};
    for (var i = 0; i < wb.months.length; i++) monthTabs[wb.months[i].tab] = true;

    var written = [];
    var results = [];
    for (var j = 0; j < edits.length; j++) {
      var e = edits[j] || {};
      var res = { id: e.id, status: "not_found", raw: null, sheetTotal: null };
      results.push(res);
      if (!monthTabs[e.tab] || typeof e.value !== "string" || !(e.rowIndex >= 1)) continue;
      if (e.value.length > 5000) continue;

      var sheet = ss.getSheetByName(e.tab);
      if (!sheet || e.rowIndex > sheet.getLastRow()) continue;
      var row = sheet.getRange(e.rowIndex, 1, 1, 3).getValues()[0];
      if (msIsoDate_(row[0], wb.timeZone) !== e.date) continue;
      if (/grand/i.test(String(row[1]))) continue;

      var current = row[1] === null || row[1] === undefined ? "" : String(row[1]);
      var expected = typeof e.expected === "string" ? e.expected : "";
      if (current !== expected) {
        res.status = "conflict";
        res.raw = current;
        res.sheetTotal = msNumber_(row[2]);
        continue;
      }
      // A leading apostrophe stores the text as typed, so "=40" never becomes a
      // formula and "500" never becomes a number (which would break column C).
      sheet.getRange(e.rowIndex, 2).setValue(e.value === "" ? "" : "'" + e.value);
      res.status = "ok";
      written.push({ res: res, sheet: sheet, rowIndex: e.rowIndex });
    }

    // Let the column C formulas recalculate, then read back what the sheet now says.
    if (written.length) SpreadsheetApp.flush();
    for (var k = 0; k < written.length; k++) {
      var w = written[k];
      var after = w.sheet.getRange(w.rowIndex, 2, 1, 2).getValues()[0];
      w.res.raw = after[0] === null || after[0] === undefined ? "" : String(after[0]);
      w.res.sheetTotal = msNumber_(after[1]);
    }
    return results;
  } finally {
    lock.releaseLock();
  }
}

// ─── Settings (categories and rules) ─────────────────────────────────────

/** Reads the settings tabs. Missing tabs read as empty; nothing is created here. */
function msGetConfig_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = {};
  for (var name in MS_CONFIG) {
    var spec = MS_CONFIG[name];
    var sheet = ss.getSheetByName(spec.tab);
    out[name] = sheet ? msReadTable_(sheet, spec.columns) : [];
  }
  return out;
}

function msReadTable_(sheet, columns) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var header = values[0].map(function (h) {
    return String(h).trim();
  });
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var obj = {};
    var empty = true;
    for (var c = 0; c < columns.length; c++) {
      var i = header.indexOf(columns[c]);
      var v = i >= 0 ? values[r][i] : "";
      obj[columns[c]] = v === null || v === undefined ? "" : String(v);
      if (obj[columns[c]] !== "") empty = false;
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}

/**
 * params: { categories?: [...], rules?: [...], deleteRules?: [key, ...] }
 * Rows are matched by id (categories) or key (rules). A row is only replaced when the
 * incoming updatedAt is the same or newer, so an older device can't undo a newer change.
 * Tabs are created on first use; other rows and other tabs are never touched.
 */
function msSaveConfig_(params) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) throw new Error("The sheet is busy. Try again.");
  try {
    var result = {};
    for (var name in MS_CONFIG) {
      var items = Array.isArray(params[name]) ? params[name] : [];
      var del = name === "rules" && Array.isArray(params.deleteRules) ? params.deleteRules : [];
      if (!items.length && !del.length) continue;
      result[name] = msUpsertTable_(MS_CONFIG[name], items, del);
    }
    return result;
  } finally {
    lock.releaseLock();
  }
}

function msUpsertTable_(spec, items, deleteKeys) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(spec.tab);
  if (!sheet) {
    sheet = ss.insertSheet(spec.tab);
    sheet.getRange(1, 1, 1, spec.columns.length).setValues([spec.columns]);
  }
  var values = sheet.getDataRange().getValues();
  var header = values[0].map(function (h) {
    return String(h).trim();
  });
  var keyCol = header.indexOf(spec.key);
  var updCol = header.indexOf("updatedAt");
  var rowOf = {};
  for (var r = 1; r < values.length; r++) rowOf[String(values[r][keyCol])] = r + 1;

  var written = 0;
  var skipped = 0;
  for (var i = 0; i < items.length; i++) {
    var item = items[i] || {};
    var key = String(item[spec.key] || "");
    if (!key) continue;
    var row = spec.columns.map(function (col) {
      var v = item[col];
      // Leading apostrophe keeps values like "500" or "=x" as plain text.
      return v === null || v === undefined || v === "" ? "" : "'" + String(v);
    });
    var at = rowOf[key];
    if (at) {
      var stored = String(values[at - 1][updCol] || "");
      if (stored && String(item.updatedAt || "") < stored) {
        skipped++;
        continue;
      }
      sheet.getRange(at, 1, 1, spec.columns.length).setValues([row]);
    } else {
      sheet.appendRow(row);
      rowOf[key] = sheet.getLastRow();
    }
    written++;
  }

  // Delete from the bottom up so row numbers stay valid.
  var toDelete = [];
  for (var d = 0; d < deleteKeys.length; d++) {
    var k = String(deleteKeys[d]);
    if (rowOf[k]) toDelete.push(rowOf[k]);
  }
  toDelete.sort(function (a, b) {
    return b - a;
  });
  for (var x = 0; x < toDelete.length; x++) sheet.deleteRow(toDelete[x]);

  return { written: written, skipped: skipped, deleted: toDelete.length };
}

function msNumber_(v) {
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (v === null || v === undefined) return null;
  var s = String(v);
  if (!/\d/.test(s)) return null;
  var n = Number(s.replace(/[^0-9.\-]/g, ""));
  return isFinite(n) ? n : null;
}

/** Real date cells come back as Date objects; text dates are accepted as MM-DD-YYYY or YYYY-MM-DD. */
function msIsoDate_(v, tz) {
  if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, tz, "yyyy-MM-dd");
  }
  var s = String(v).trim();
  var iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return s;
  var us = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/.exec(s);
  if (us) return us[3] + "-" + ("0" + us[1]).slice(-2) + "-" + ("0" + us[2]).slice(-2);
  return null;
}
