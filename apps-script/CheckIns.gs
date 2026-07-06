/**
 * Athlete Weekly Check-In — Google Apps Script Web App
 * ----------------------------------------------------
 * Turns your Google Sheet into a tiny endpoint the check-in form can use.
 * Works for BOTH the Vercel dashboard and a pure-HTML embed.
 *
 * Endpoints:
 *   doPost  — PUBLIC. Appends a check-in row and returns ONLY that phone's
 *             history (so the athlete's own progress graph can render). No
 *             admin token is required or exposed here.
 *   doGet   — ADMIN. Returns every row. Protected by TOKEN. Used only by the
 *             dashboard server (never by the public HTML), so the full roster
 *             is never exposed to visitors.
 *
 * SETUP:
 *   1. Sheet tab named exactly SHEET_TAB below, headers in row 1:
 *        submittedAt  phone  name  armVelo  exitVelo  sixtyYard  fiveTenFive
 *   2. Extensions -> Apps Script, paste this whole file. Change TOKEN.
 *   3. Deploy -> New deployment -> Web app: Execute as Me, Access: Anyone.
 *      Copy the /exec URL.
 *   4. Put the /exec URL in the HTML embed (ENDPOINT) and/or in the
 *      dashboard's ATHLETE_WEBAPP_URL; keep TOKEN as ATHLETE_WEBAPP_TOKEN.
 *   After editing later: Deploy -> Manage deployments -> edit -> New version.
 */

const SHEET_TAB = 'CheckIns';
const TOKEN = 'CHANGE_ME_to_a_secret'; // protects the full-roster read (doGet). Keep secret.

function sheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TAB);
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
function digits_(v) {
  return String(v == null ? '' : v).replace(/\D/g, '').slice(-10);
}

// PUBLIC: append a check-in, return only the submitting phone's rows.
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!Array.isArray(body.row)) return json_({ ok: false, error: 'missing row' });
    const sh = sheet_();
    sh.appendRow(body.row);
    const phone = digits_(body.row[1]); // column B = phone
    const values = sh.getDataRange().getValues();
    const history = values.filter(function (r) {
      return phone.length >= 7 && digits_(r[1]) === phone;
    });
    return json_({ ok: true, history: history });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ADMIN (token-protected): return every row. Not used by the public HTML form.
function doGet(e) {
  try {
    const token = (e && e.parameter && e.parameter.token) || '';
    if (TOKEN && token !== TOKEN) return json_({ ok: false, error: 'unauthorized' });
    return json_({ ok: true, values: sheet_().getDataRange().getValues() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
