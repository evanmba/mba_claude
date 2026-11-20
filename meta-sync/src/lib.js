// Pure helpers (no network) — unit tested in test/lib.test.js

export const CONFIG = {
  SHEET_NAME: 'Webinar Tracker',
  HEADER_ROW: 2,
  FIRST_DATA_ROW: 3,
  CUTOFF_TZ: 'America/Chicago',
  CUTOFF_HOUR: 19, // 7pm CT
  // Campaigns whose name contains any of these (case-insensitive) are excluded.
  EXCLUDE_CAMPAIGNS_CONTAINING: ['hiring', 'call funnel'],
  COLS: {
    key: ['Webinar Date & Time (key)', 'Webinar Date & Time'],
    spend: ['Amount Spent'],
    cpm: ['CPM'],
    lctr: ['LCTR'],
    pageConv: ['Page Conversion Rate', 'Page AgeQ Opt-In'],
    ageQ: ['Age Q Reg'],
  },
  HELPER_HEADERS: ['Unique Link Clicks', 'Impressions', 'Reach', 'Last Synced'],
};

/** Offset of `tz` from UTC at `date`, in ms (e.g. CDT = -5h). */
export function tzOffsetMs(date, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(date);
  const g = (t) => Number(parts.find((p) => p.type === t).value);
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Wall-clock time in `tz` -> absolute Date (DST-safe). */
export function wallClockToInstant(y, mo, d, h, tz) {
  const guess = Date.UTC(y, mo - 1, d, h);
  const t = guess - tzOffsetMs(new Date(guess), tz);
  return new Date(guess - tzOffsetMs(new Date(t), tz));
}

/** 7:00pm CT on the given [y, m, d]. */
export function cutoffInstant(ymd) {
  return wallClockToInstant(ymd[0], ymd[1], ymd[2], CONFIG.CUTOFF_HOUR, CONFIG.CUTOFF_TZ);
}

/** 'YYYY-MM-DD' of `date` in `tz`. */
export function ymdIn(date, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function formatCT(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CONFIG.CUTOFF_TZ, month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date).replace(',', '') + ' CT';
}

/** Parses "11/8/2026 9:00 PM" -> { ymd:[2026,11,8], timeText:'9:00 PM' }. */
export function parseKey(text) {
  const m = String(text || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(.*)$/);
  if (!m) return null;
  return { ymd: [Number(m[3]), Number(m[1]), Number(m[2])], timeText: m[4] || '9:00 PM' };
}

/** Next workshop date: Wed -> Sun (+4), Sun -> Wed (+3), anything else -> next Wed/Sun. */
export function nextWorkshopYmd(ymd) {
  const base = new Date(Date.UTC(ymd[0], ymd[1] - 1, ymd[2]));
  const dow = base.getUTCDay();
  const add = dow === 3 ? 4 : dow === 0 ? 3 : dow < 3 ? 3 - dow : 7 - dow;
  const n = new Date(base.getTime() + add * 86400000);
  return [n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate()];
}

export function isExcluded(name) {
  const n = String(name || '').toLowerCase();
  return CONFIG.EXCLUDE_CAMPAIGNS_CONTAINING.some((x) => n.includes(x));
}

export function colLetter(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Sums hourly Meta rows that fall inside [start, end). */
export function sumHourly(rows, start, end, acctTz) {
  let spend = 0, impressions = 0;
  for (const r of rows) {
    if (isExcluded(r.campaign_name)) continue;
    const hour = Number(String(r.hourly_stats_aggregated_by_advertiser_time_zone).slice(0, 2));
    const [y, m, d] = r.date_start.split('-').map(Number);
    const t = wallClockToInstant(y, m, d, hour, acctTz);
    if (t >= start && t < end) {
      spend += Number(r.spend || 0);
      impressions += Number(r.impressions || 0);
    }
  }
  return { spend, impressions };
}

/* ------------------------------- Footer ------------------------------- */

// Footer rows (in order) under the workshop rows. `count` = last N completed workshops; null = all rows.
export const FOOTER = [
  { label: 'Past 2 Weeks (4)', count: 4 },
  { label: 'Past Month (8)', count: 8 },
  { label: 'Past 3 Months (24)', count: 24 },
  { label: 'Totals', count: null },
];
// Old footer labels to take over.
export const OLD_FOOTER_LABELS = ['sums', 'averages'];

export const FOOTER_SUM_COLS = [
  'Amount Spent', 'Registrants', 'Age Q Reg', 'Upsells', 'Upsell Rev', 'Peak Attendance', 'Retained to $CTA',
  'Calls Pre Webby', 'Calls Post Webby', 'Total Calls', 'Shown Appts', 'Offers', 'Deals',
  'Cash From Deals', 'Total Cash Collected', 'Unique Link Clicks', 'Impressions', 'Reach',
];

// {Header} = this footer row's cell in that column; {Header:range} = that column over the window.
export const FOOTER_RATIO_COLS = {
  'CPM': '=IFERROR(SUMPRODUCT({CPM:range},{Impressions:range})/{Impressions},"")',
  'LCTR': '=IFERROR({Unique Link Clicks}/{Reach},"")',
  'Page AgeQ Opt-In': '=IFERROR({Age Q Reg}/SUMIFS({Unique Link Clicks:range},{Age Q Reg:range},">0"),"")',
  'AgeQ %': '=IFERROR({Age Q Reg}/{Registrants},"")',
  'Cost Per Reg': '=IFERROR({Amount Spent}/{Registrants},"")',
  'Cost Per AgeQ': '=IFERROR({Amount Spent}/{Age Q Reg},"")',
  'Upsell %': '=IF({Registrants}=0,"",{Upsells}/{Registrants})',
  'Show % on AgeQ': '=IF({Age Q Reg}=0,"",{Peak Attendance}/{Age Q Reg})',
  'Cost Per Attendance': '=IF({Peak Attendance}=0,"",{Amount Spent}/{Peak Attendance})',
  'Retention %': '=IF({Peak Attendance}=0,"",{Retained to $CTA}/{Peak Attendance})',
  'Cost Per Retention': '=IF({Retained to $CTA}=0,"",{Amount Spent}/{Retained to $CTA})',
  'Pre->Booked %': '=IF({Registrants}=0,"",{Calls Pre Webby}/{Registrants})',
  'Post->Booked %': '=IF({Retained to $CTA}=0,"",{Calls Post Webby}/{Retained to $CTA})',
  'Show->Book %': '=IF({Retained to $CTA}=0,"",{Total Calls}/{Retained to $CTA})',
  'CPC': '=IF({Total Calls}=0,"",{Amount Spent}/{Total Calls})',
  'Cost Per Show': '=IF({Shown Appts}=0,"-",{Amount Spent}/{Shown Appts})',
  'Show %': '=IF({Total Calls}=0,"-",{Shown Appts}/{Total Calls})',
  'Cost Per Offer': '=IF({Offers}=0,"-",{Amount Spent}/{Offers})',
  'Offer %': '=IF({Shown Appts}=0,"-",{Offers}/{Shown Appts})',
  'CPA': '=IF({Deals}=0,"-",{Amount Spent}/{Deals})',
  'Close Rate': '=IF({Offers}=0,"-",{Deals}/{Offers})',
  'Cash ROAS': '=IF({Amount Spent}=0,"",{Total Cash Collected}/{Amount Spent})',
};

/**
 * Builds { colNumber: formula } for one footer row.
 * headerCols: { 'header name lowercased': colNumber }, row: footer row, [r1, r2]: data window rows.
 */
export function footerFormulas(headerCols, row, r1, r2) {
  const L = (name) => {
    const c = headerCols[name.toLowerCase()];
    if (!c) throw new Error(`Footer: header not found: ${name}`);
    return colLetter(c);
  };
  const out = {};
  for (const name of FOOTER_SUM_COLS) out[headerCols[name.toLowerCase()]] = `=SUM(${L(name)}${r1}:${L(name)}${r2})`;
  for (const [name, tpl] of Object.entries(FOOTER_RATIO_COLS)) {
    out[headerCols[name.toLowerCase()]] = tpl.replace(/\{([^}:]+)(:range)?\}/g, (_, h, rng) =>
      rng ? `${L(h)}${r1}:${L(h)}${r2}` : `${L(h)}${row}`);
  }
  return out;
}
