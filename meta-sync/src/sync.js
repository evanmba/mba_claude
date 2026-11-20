// Hourly Meta Ads -> [MBA] Webby "Webinar Tracker" sync.
// Usage: node src/sync.js            (normal hourly run)
//        node src/sync.js --backfill (fill CPM/LCTR/helpers for all past rows, spend untouched)
//        add --dry-run to print instead of writing.
import { GoogleAuth } from 'google-auth-library';
import {
  CONFIG, cutoffInstant, ymdIn, formatCT, parseKey, nextWorkshopYmd, isExcluded, colLetter, sumHourly,
} from './lib.js';

const env = (k) => { const v = process.env[k]; if (!v) throw new Error(`Missing env ${k}`); return v; };
const SHEET_ID = env('SHEET_ID');
const META_TOKEN = env('META_ADS_ACCESS_TOKEN');
const AD_ACCOUNT = env('META_AD_ACCOUNT_ID');
const GRAPH = 'https://graph.facebook.com/v22.0';
const BACKFILL = process.argv.includes('--backfill');
const DRY = process.argv.includes('--dry-run');
const VERBOSE = process.env.VERBOSE === '1'; // public repo: Actions logs never print numbers

/* ----------------------------- Google Sheets ----------------------------- */

const auth = new GoogleAuth({
  credentials: {
    client_email: env('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    private_key: env('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const gclient = await auth.getClient();
const SHEETS = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

async function sheets(path, { method = 'GET', body } = {}) {
  const res = await gclient.request({ url: SHEETS + path, method, data: body });
  return res.data;
}
const q = (s) => `'${CONFIG.SHEET_NAME.replace(/'/g, "''")}'!${s}`;

async function getValues(range, render = 'FORMATTED_VALUE') {
  const d = await sheets(`/values/${encodeURIComponent(q(range))}?valueRenderOption=${render}`);
  return d.values || [];
}

const pendingWrites = [];
function write(row, col, value) {
  pendingWrites.push({ range: q(`${colLetter(col)}${row}`), values: [[value]] });
}
async function flushWrites() {
  if (!pendingWrites.length) return;
  if (DRY) { console.log(`DRY RUN: would write ${pendingWrites.length} cells`); if (VERBOSE) console.log(JSON.stringify(pendingWrites, null, 1)); pendingWrites.length = 0; return; }
  await sheets('/values:batchUpdate', {
    method: 'POST', body: { valueInputOption: 'USER_ENTERED', data: pendingWrites.splice(0) },
  });
}
async function batchUpdate(requests) {
  if (!requests.length) return;
  if (DRY) { console.log(`DRY RUN: would send ${requests.length} sheet requests`); return; }
  await sheets(':batchUpdate', { method: 'POST', body: { requests } });
}

async function getSheetId() {
  const d = await sheets('?fields=sheets.properties');
  const s = d.sheets.find((x) => x.properties.title === CONFIG.SHEET_NAME);
  if (!s) throw new Error(`Tab "${CONFIG.SHEET_NAME}" not found`);
  return s.properties.sheetId;
}

async function getCols() {
  const header = ((await getValues(`${CONFIG.HEADER_ROW}:${CONFIG.HEADER_ROW}`))[0] || [])
    .map((h) => String(h).trim().toLowerCase());
  const cols = {};
  for (const [k, names] of Object.entries(CONFIG.COLS)) {
    const idx = names.map((n) => header.indexOf(n.toLowerCase())).find((i) => i !== -1);
    if (idx === undefined) throw new Error(`Header not found in row ${CONFIG.HEADER_ROW}: ${names[0]}`);
    cols[k] = idx + 1;
  }
  let last = header.length;
  for (const h of CONFIG.HELPER_HEADERS) {
    let idx = header.indexOf(h.toLowerCase());
    if (idx === -1) { last += 1; idx = last - 1; header.push(h.toLowerCase()); write(CONFIG.HEADER_ROW, last, h); }
    cols[h] = idx + 1;
  }
  await flushWrites();
  return cols;
}

async function getWorkshopRows(cols) {
  const L = colLetter(cols.key);
  const vals = await getValues(`${L}${CONFIG.FIRST_DATA_ROW}:${L}`);
  const rows = [];
  vals.forEach((v, i) => {
    const p = parseKey(v[0]);
    if (p) rows.push({ row: CONFIG.FIRST_DATA_ROW + i, ...p });
  });
  return rows.sort((a, b) => Date.UTC(...a.ymd) - Date.UTC(...b.ymd));
}

/* -------------------------------- Meta -------------------------------- */

async function graphAll(path, params) {
  let url = `${GRAPH}/${path}?${new URLSearchParams({ ...params, access_token: META_TOKEN })}`;
  const out = [];
  while (url) {
    const body = await (await fetch(url)).json();
    if (body.error) throw new Error(`Meta API: ${body.error.message}`);
    out.push(...(body.data || []));
    url = body.paging?.next;
  }
  return out;
}

let acctTz;
async function getAccountTz() {
  if (!acctTz) {
    const b = await (await fetch(`${GRAPH}/act_${AD_ACCOUNT}?fields=timezone_name&access_token=${META_TOKEN}`)).json();
    if (b.error) throw new Error(`Meta API: ${b.error.message}`);
    acctTz = b.timezone_name;
  }
  return acctTz;
}

async function windowMetrics(start, end) {
  const tz = await getAccountTz();
  const since = ymdIn(start, tz);
  const until = ymdIn(end, tz);

  // Spend + impressions hour-by-hour so the 7pm CT cutoff is exact.
  const hourly = await graphAll(`act_${AD_ACCOUNT}/insights`, {
    level: 'campaign',
    fields: 'campaign_name,spend,impressions',
    breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
    time_range: JSON.stringify({ since, until }),
    time_increment: '1',
    limit: '500',
  });
  const { spend, impressions } = sumHourly(hourly, start, end, tz);

  // Uniques can't be broken down by hour: use whole days (day after window opens -> workshop day).
  let uSince = ymdIn(new Date(start.getTime() + 6 * 3600e3), tz);
  if (uSince > until) uSince = until;
  let uniqueClicks = 0, reach = 0;
  for (const r of await graphAll(`act_${AD_ACCOUNT}/insights`, {
    level: 'campaign',
    fields: 'campaign_name,unique_inline_link_clicks,reach',
    time_range: JSON.stringify({ since: uSince, until }),
    limit: '500',
  })) {
    if (isExcluded(r.campaign_name)) continue;
    uniqueClicks += Number(r.unique_inline_link_clicks || 0);
    reach += Number(r.reach || 0);
  }
  return { spend, impressions, uniqueClicks, reach };
}

/* ------------------------------- Rows ------------------------------- */

function pageConvFormula(cols, row) {
  const g = `${colLetter(cols.ageQ)}${row}`;
  const u = `${colLetter(cols['Unique Link Clicks'])}${row}`;
  return `=IFERROR(IF(${g}="","",${g}/${u}),"")`;
}

async function fillRow(cols, row, start, end, now, includeSpend) {
  const m = await windowMetrics(start, end < now ? end : now);
  console.log(`row ${row}: ${start.toISOString()} -> ${end.toISOString()}`);
  if (VERBOSE) console.log(m);
  if (includeSpend) write(row, cols.spend, Math.round(m.spend * 100) / 100);
  write(row, cols.cpm, m.impressions ? Math.round((m.spend / m.impressions) * 1000 * 100) / 100 : '');
  write(row, cols.lctr, m.reach ? m.uniqueClicks / m.reach : '');
  write(row, cols['Unique Link Clicks'], m.uniqueClicks);
  write(row, cols.Impressions, m.impressions);
  write(row, cols.Reach, m.reach);
  write(row, cols['Last Synced'], formatCT(now));
  write(row, cols.pageConv, pageConvFormula(cols, row));
}

function numberFormats(sheetId, cols, rows) {
  const fmt = (col, pattern, type) => rows.map((r) => ({
    repeatCell: {
      range: { sheetId, startRowIndex: r - 1, endRowIndex: r, startColumnIndex: col - 1, endColumnIndex: col },
      cell: { userEnteredFormat: { numberFormat: { type, pattern } } },
      fields: 'userEnteredFormat.numberFormat',
    },
  }));
  return [
    ...fmt(cols.cpm, '$#,##0.00', 'CURRENCY'),
    ...fmt(cols.lctr, '0.00%', 'PERCENT'),
    ...fmt(cols.pageConv, '0.00%', 'PERCENT'),
  ];
}

/** At/after 7pm CT on the latest workshop day, insert the next workshop's row below it. */
async function ensureNextRow(sheetId, cols, now) {
  const rows = await getWorkshopRows(cols);
  const last = rows.at(-1);
  if (!last || now < cutoffInstant(last.ymd)) return false;

  const [y, m, d] = nextWorkshopYmd(last.ymd);
  const newRow = last.row + 1;
  console.log(`Creating row ${newRow} for ${m}/${d}/${y} ${last.timeText}`);
  // Insert a row and paste the previous row into it (formulas shift to the new row + formatting).
  await batchUpdate([
    { insertDimension: { range: { sheetId, dimension: 'ROWS', startIndex: newRow - 1, endIndex: newRow }, inheritFromBefore: true } },
    { copyPaste: {
      source: { sheetId, startRowIndex: last.row - 1, endRowIndex: last.row },
      destination: { sheetId, startRowIndex: newRow - 1, endRowIndex: newRow },
      pasteType: 'PASTE_NORMAL',
    } },
  ]);
  if (DRY) return true;
  // Clear typed-in values (keep formulas), then set the new key.
  const cells = (await getValues(`${newRow}:${newRow}`, 'FORMULA'))[0] || [];
  cells.forEach((v, i) => {
    const col = i + 1;
    if (col === cols.key || col === cols.pageConv) return;
    if (v !== '' && !String(v).startsWith('=')) write(newRow, col, '');
  });
  write(newRow, cols.key, `${m}/${d}/${y} ${last.timeText}`);
  write(newRow, cols.pageConv, pageConvFormula(cols, newRow));
  await flushWrites();
  return true;
}

/* -------------------------------- Main -------------------------------- */

const now = new Date();
const sheetId = await getSheetId();
const cols = await getCols();
if (!BACKFILL) await ensureNextRow(sheetId, cols, now);

const rows = await getWorkshopRows(cols);
const touched = [];
for (let i = 1; i < rows.length; i++) {
  const start = cutoffInstant(rows[i - 1].ymd);
  const end = cutoffInstant(rows[i].ymd);
  if (start >= now) continue;
  // Normal run: the open window plus the one that closed in the last 3h (final pull after 7pm).
  if (!BACKFILL && end.getTime() <= now.getTime() - 3 * 3600e3) continue;
  await fillRow(cols, rows[i].row, start, end, now, !BACKFILL);
  touched.push(rows[i].row);
}
await flushWrites();
await batchUpdate(numberFormats(sheetId, cols, touched));
console.log(`Done. Updated rows: ${touched.join(', ') || 'none'}`);
