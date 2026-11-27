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
 * This version only reads. It never changes any cell.
 */

var MS_VERSION = "2.0.0-read";

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
