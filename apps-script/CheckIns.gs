/**
 * Athlete Weekly Check-In — Google Apps Script Web App
 * ----------------------------------------------------
 * This turns your Google Sheet into a tiny write/read endpoint the dashboard
 * can use with just ONE URL — no Google Cloud project, no service-account key.
 *
 * SETUP (about 3 minutes):
 *   1. Open your Google Sheet. Make sure the first tab is named exactly the
 *      value of SHEET_TAB below (default "CheckIns"), and row 1 has headers:
 *        submittedAt  phone  name  armVelo  exitVelo  sixtyYard  fiveTenFive
 *   2. Extensions → Apps Script. Delete anything there and paste this whole file.
 *   3. Change TOKEN below to your own secret word/phrase.
 *   4. Click Deploy → New deployment → type "Web app".
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      Click Deploy, authorize when asked, and COPY the Web app URL
 *      (it ends in "/exec").
 *   5. In the dashboard's environment variables set:
 *        ATHLETE_WEBAPP_URL   = <the /exec URL you copied>
 *        ATHLETE_WEBAPP_TOKEN = <the same TOKEN you set below>
 *
 * After changing this script later, redeploy with Deploy → Manage deployments →
 * edit → New version, so the "/exec" URL keeps working.
 */

const SHEET_TAB = 'CheckIns';
const TOKEN = 'CHANGE_ME_to_a_secret'; // must match ATHLETE_WEBAPP_TOKEN

function sheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TAB);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Append one check-in row. The dashboard POSTs { token, row: [...] }.
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (TOKEN && body.token !== TOKEN) return json_({ ok: false, error: 'unauthorized' });
    if (!Array.isArray(body.row)) return json_({ ok: false, error: 'missing row' });
    sheet_().appendRow(body.row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Return every row so the dashboard can build each athlete's progress.
function doGet(e) {
  try {
    const token = (e && e.parameter && e.parameter.token) || '';
    if (TOKEN && token !== TOKEN) return json_({ ok: false, error: 'unauthorized' });
    const values = sheet_().getDataRange().getValues();
    return json_({ ok: true, values: values });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
