/** Fetch a Google Sheets "publish to web" CSV URL and return rows as a 2-D array. */
export async function fetchCSV(url: string, opts?: RequestInit): Promise<string[][]> {
  const res = await fetch(url, opts ?? { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const text = await res.text();
  return parseCSV(text);
}

export function parseCSV(text: string): string[][] {
  return text.split("\n").map((line) => parseCSVLine(line.replace(/\r$/, "")));
}

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (line[i] === "," && !inQ) {
      cells.push(cur); cur = "";
    } else {
      cur += line[i];
    }
  }
  cells.push(cur);
  return cells;
}

/** Parse a cell value to a number, stripping $, %, commas. */
export function toNum(val: string): number {
  return parseFloat((val ?? "").replace(/[$%,]/g, "")) || 0;
}

/** Strip __ markdown-style bold markers from a title string. */
export function cleanTitle(val: string): string {
  return val.replace(/__/g, "").trim();
}

/** Decode common HTML entities. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Fetch the HTML-published version of a Google Sheet and return a Map of
 * { linkText -> href } for every hyperlinked cell in the sheet.
 * This is needed because CSV exports strip embedded hyperlinks.
 */
export async function fetchSheetLinks(htmlUrl: string): Promise<Map<string, string>> {
  try {
    const res = await fetch(htmlUrl, { cache: "no-store" });
    if (!res.ok) return new Map();
    const html = await res.text();
    const map = new Map<string, string>();
    const re = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      let href = decodeEntities(m[1]);
      const text = decodeEntities(m[2].replace(/<[^>]+>/g, "")).trim();
      // Unwrap Google redirect: https://www.google.com/url?q=ACTUAL_URL&...
      const gMatch = href.match(/[?&]q=([^&]+)/);
      if (gMatch) href = decodeURIComponent(gMatch[1]);
      if (text && href && !href.startsWith("#")) {
        map.set(text, href);
        map.set(cleanTitle(text), href); // also store cleaned variant
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

// ─── Google Sheets API (grid data + hyperlinks) ───────────────────────────────

interface GridCell {
  formattedValue?: string;
  hyperlink?: string;
}

interface GridData {
  sheets: Array<{
    data: Array<{
      rowData: Array<{ values?: GridCell[] }>;
    }>;
  }>;
}

/**
 * Fetch a sheet's grid data via the Sheets API v4.
 * Returns cell values AND embedded hyperlinks (which CSV exports strip).
 * Requires GOOGLE_SHEETS_API_KEY and the spreadsheet to be accessible.
 */
export async function fetchPostsViaAPI(
  spreadsheetId: string,
  sheetName: string,
  apiKey: string,
): Promise<IGPost[]> {
  const range = encodeURIComponent(sheetName);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}` +
    `?includeGridData=true&ranges=${range}&key=${apiKey}`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const json: GridData = await res.json();

  const rowData = json.sheets?.[0]?.data?.[0]?.rowData ?? [];
  if (rowData.length < 2) return [];

  // Build header map from first row
  const headerCells = rowData[0]?.values ?? [];
  const hdrs = headerCells.map((c) => (c.formattedValue ?? "").toLowerCase().trim());

  function fi(kw: string[]): number {
    return hdrs.findIndex((h) => kw.every((k) => h.includes(k)));
  }

  const cols = {
    title:          fi(["title"]),
    reach:          fi(["reach", "24"]),
    watchTime:      fi(["watch"]),
    likes:          fi(["likes", "24"]),
    shares:         fi(["shares", "24"]),
    follows:        fi(["follows", "24"]),
    reachLike:      fi(["reach", "like"]),
    reachShares:    hdrs.findIndex((h) => h.includes("reach") && h.includes("share") && !h.includes("24")),
    reachFollowers: fi(["reach", "follow"]),
    who:            fi(["who"]),
    style:          fi(["style"]),
    type:           fi(["type"]),
    intentional:    fi(["intentional"]),
    cta:            fi(["cta"]),
    notes:          fi(["notes"]),
    url:            hdrs.findIndex((h) => h.includes("url") || h.includes("link")),
  };

  const val = (cells: GridCell[], i: number) =>
    i >= 0 ? (cells[i]?.formattedValue ?? "") : "";
  const link = (cells: GridCell[], i: number) =>
    i >= 0 ? (cells[i]?.hyperlink ?? "") : "";

  return rowData.slice(1).flatMap((row) => {
    const cells = row.values ?? [];
    const col0 = (cells[0]?.formattedValue ?? "").trim();
    if (!/^\d{1,4}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(col0)) return [];

    // The hyperlink on the title cell IS the video URL
    const videoUrl = link(cells, cols.title);
    // Post URL: dedicated url column, or fall back to title hyperlink
    const postUrl = val(cells, cols.url) || videoUrl;

    return [{
      date:           col0,
      title:          cleanTitle(val(cells, cols.title)),
      url:            postUrl,
      videoUrl,
      reach:          toNum(val(cells, cols.reach)),
      watchTime:      toNum(val(cells, cols.watchTime)),
      likes:          toNum(val(cells, cols.likes)),
      shares:         toNum(val(cells, cols.shares)),
      follows:        toNum(val(cells, cols.follows)),
      reachLike:      val(cells, cols.reachLike),
      reachShares:    val(cells, cols.reachShares),
      reachFollowers: val(cells, cols.reachFollowers),
      who:            val(cells, cols.who),
      style:          val(cells, cols.style),
      type:           val(cells, cols.type),
      intentional:    val(cells, cols.intentional),
      cta:            val(cells, cols.cta),
      notes:          val(cells, cols.notes),
    }];
  });
}

// ─── IG Data Types ────────────────────────────────────────────────────────────

export interface IGMonthlyRow {
  month: string;
  reach: number;
  watchTime: number;
  likes: number;
  shares: number;
  follows: number;
  reachLike: string;
  reachShares: string;
  reachFollowers: string;
  evan: string;
  nate: string;
  yasir: string;
}

export interface IGPost {
  date: string;
  title: string;
  url: string;
  reach: number;
  watchTime: number;
  likes: number;
  shares: number;
  follows: number;
  reachLike: string;
  reachShares: string;
  reachFollowers: string;
  who: string;
  style: string;
  type: string;
  intentional: string;
  cta: string;
  notes: string;
  videoUrl: string;
}

export interface IGData {
  monthly: IGMonthlyRow[];
  averages: IGMonthlyRow | null;
  posts: IGPost[];
}

const MONTHS = new Set([
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
]);

export function parseIGData(rows: string[][]): IGData {
  const monthly: IGMonthlyRow[] = [];
  const posts: IGPost[] = [];
  let averages: IGMonthlyRow | null = null;
  let mode: "none" | "monthly" | "posts" = "none";

  for (const row of rows) {
    const joined = row.join(",").toLowerCase();
    const col0 = (row[0] ?? "").trim();

    // Detect section headers
    if (joined.includes("avg reach") || joined.includes("avg reach")) {
      mode = "monthly";
      continue;
    }
    if (
      (joined.includes("reach 24h") || joined.includes("reach(24h)") || joined.includes("reach (24h)")) &&
      (joined.includes("likes 24h") || joined.includes("likes(24h)") || joined.includes("likes (24h)"))
    ) {
      mode = "posts";
      continue;
    }

    if (mode === "monthly") {
      if (MONTHS.has(col0.toLowerCase()) && row.length > 1) {
        monthly.push({
          month: col0,
          reach: toNum(row[1]),
          watchTime: toNum(row[2]),
          likes: toNum(row[3]),
          shares: toNum(row[4]),
          follows: toNum(row[5]),
          reachLike: row[6] ?? "",
          reachShares: row[7] ?? "",
          reachFollowers: row[8] ?? "",
          evan: row[9] ?? "",
          nate: row[10] ?? "",
          yasir: row[11] ?? "",
        });
      } else if (col0.toLowerCase().startsWith("average")) {
        averages = {
          month: "Average",
          reach: toNum(row[1]),
          watchTime: toNum(row[2]),
          likes: toNum(row[3]),
          shares: toNum(row[4]),
          follows: toNum(row[5]),
          reachLike: row[6] ?? "",
          reachShares: row[7] ?? "",
          reachFollowers: row[8] ?? "",
          evan: "",
          nate: "",
          yasir: "",
        };
      }
    }

    if (mode === "posts") {
      // Date column looks like "3/1/26" or "3/1/2026"
      if (/^\d{1,4}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(col0) && row.length > 3) {
        posts.push({
          date: col0,
          title: cleanTitle(row[1] ?? ""),
          url: row[16] ?? "",
          reach: toNum(row[2]),
          watchTime: toNum(row[3]),
          likes: toNum(row[4]),
          shares: toNum(row[5]),
          follows: toNum(row[6]),
          reachLike: row[7] ?? "",
          reachShares: row[8] ?? "",
          reachFollowers: row[9] ?? "",
          who: row[10] ?? "",
          style: row[11] ?? "",
          type: row[12] ?? "",
          intentional: row[13] ?? "",
          cta: row[14] ?? "",
          notes: row[15] ?? "",
          videoUrl: row[17] ?? "",
        });
      }
    }
  }

  return { monthly, averages, posts };
}

/**
 * Find the post-log header row anywhere in a sheet and parse posts from it.
 * Works for both standalone DATA tabs and mixed sheets where the post section
 * starts below the monthly summary.
 */
export function extractPostsFromSheet(rows: string[][]): IGPost[] {
  const headerIdx = rows.findIndex((row) => {
    const j = row.join(",").toLowerCase();
    return (j.includes("reach 24h") || j.includes("reach(24h)") || j.includes("reach (24h)")) &&
           (j.includes("likes 24h") || j.includes("likes(24h)") || j.includes("likes (24h)"));
  });
  if (headerIdx === -1) return [];
  return parsePostLogCSV(rows.slice(headerIdx));
}

/**
 * Parse a standalone post-log CSV where row 0 is the header row.
 * Used for the separate DATA tab (individual post records).
 * Column names are matched by keyword so column order doesn't matter.
 */
export function parsePostLogCSV(rows: string[][]): IGPost[] {
  if (rows.length < 2) return [];

  const hdrs = rows[0].map((h) => h.toLowerCase().trim());

  // Find column index by required keywords (all must be present in the header cell)
  function fi(kw: string[]): number {
    return hdrs.findIndex((h) => kw.every((k) => h.includes(k)));
  }

  const cols = {
    title:          fi(["title"]),
    reach:          fi(["reach", "24"]),
    watchTime:      fi(["watch"]),
    likes:          fi(["likes", "24"]),
    shares:         fi(["shares", "24"]),
    follows:        fi(["follows", "24"]),
    reachLike:      fi(["reach", "like"]),
    reachShares:    hdrs.findIndex((h) => h.includes("reach") && h.includes("share") && !h.includes("24")),
    reachFollowers: fi(["reach", "follow"]),
    who:            fi(["who"]),
    style:          fi(["style"]),
    type:           fi(["type"]),
    intentional:    fi(["intentional"]),
    cta:            fi(["cta"]),
    notes:          fi(["notes"]),
    url:            hdrs.findIndex((h) => h.includes("url") || h.includes("link") || h.includes("post url") || h.includes("post link")),
    videoUrl:       hdrs.findIndex((h) => h.includes("video") && (h.includes("url") || h.includes("link") || h.includes("watch"))),
  };

  const get = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "") : "");

  return rows.slice(1).flatMap((row) => {
    const col0 = (row[0] ?? "").trim();
    // Accept slash-separated (3/1/26, 3/1/2026) or dash-separated (2026-03-01) dates
    if (!/^\d{1,4}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(col0)) return [];
    return [{
      date:           col0,
      title:          cleanTitle(get(row, cols.title)),
      url:            get(row, cols.url),
      reach:          toNum(get(row, cols.reach)),
      watchTime:      toNum(get(row, cols.watchTime)),
      likes:          toNum(get(row, cols.likes)),
      shares:         toNum(get(row, cols.shares)),
      follows:        toNum(get(row, cols.follows)),
      reachLike:      get(row, cols.reachLike),
      reachShares:    get(row, cols.reachShares),
      reachFollowers: get(row, cols.reachFollowers),
      who:            get(row, cols.who),
      style:          get(row, cols.style),
      type:           get(row, cols.type),
      intentional:    get(row, cols.intentional),
      cta:            get(row, cols.cta),
      notes:          get(row, cols.notes),
      videoUrl:       get(row, cols.videoUrl),
    }];
  });
}

// ─── YouTube Data Types ───────────────────────────────────────────────────────

export interface YTMonthlyRow {
  month: string;
  ctr: string;
  watchTime: number;
  impressions: number;
  wtImpressions: string;
}

export interface YTVideo {
  title: string;
  publishDate: string;
  url: string;
  ctr: string;
  watchTime: number;
  impressions: number;
  wtImpressions: string;
}

export interface YTData {
  monthly: YTMonthlyRow[];
  averages: YTMonthlyRow | null;
  videos: YTVideo[];
}

const YT_MONTH_NAMES = new Set([
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
]);

export function parseYTData(rows: string[][]): YTData {
  const monthly: YTMonthlyRow[] = [];
  const videos: YTVideo[] = [];
  let averages: YTMonthlyRow | null = null;
  let mode: "none" | "monthly" | "videos" = "none";

  for (const row of rows) {
    const joined = row.join(",").toLowerCase();
    const col0 = (row[0] ?? "").trim();
    const col0l = col0.toLowerCase();

    // Monthly section header: contains "ctr @ 24h" but NOT "video title" / "publish date"
    if (joined.includes("ctr @ 24h") && joined.includes("watch time") && !joined.includes("publish date") && !joined.includes("video title")) {
      mode = "monthly";
      continue;
    }
    // Video section header
    if (joined.includes("video title") || joined.includes("publish date")) {
      mode = "videos";
      continue;
    }

    if (mode === "monthly") {
      // Data rows: col[0] = month name, col[1] = date (1/1/26), col[2] = CTR, col[3] = watch time, col[4] = impressions, col[5] = ratio
      if (YT_MONTH_NAMES.has(col0l)) {
        monthly.push({
          month: col0,
          ctr: row[2] ?? "",
          watchTime: toNum(row[3]),
          impressions: toNum(row[4]),
          wtImpressions: row[5] ?? "",
        });
      // Average row: col[0] = "MONTHLY AVG", col[1] = CTR, col[2] = watch time, col[3] = impressions, col[4] = ratio
      } else if (col0l.includes("monthly avg")) {
        // Same column layout as data rows: col[1] = blank/date, metrics at col[2]+
        averages = {
          month: "Monthly Avg",
          ctr: row[2] ?? "",
          watchTime: toNum(row[3]),
          impressions: toNum(row[4]),
          wtImpressions: row[5] ?? "",
        };
      }
    }

    if (mode === "videos") {
      // data rows have a date in col[1] (like "3/14/2026") and a title in col[0]
      const dateCell = row[1] ?? "";
      if (/\d+\/\d+\/\d+/.test(dateCell) && row.length > 3) {
        videos.push({
          title: cleanTitle(row[0] ?? ""),
          publishDate: dateCell,
          url: "",
          ctr: row[2] ?? "",
          watchTime: toNum(row[3]),
          impressions: toNum(row[4]),
          wtImpressions: row[5] ?? "",
        });
      }
    }
  }

  return { monthly, averages, videos };
}

/**
 * Header-based parser for a dedicated YT DATA tab.
 * Column order doesn't matter — matched by keyword.
 */
export function parseVideoLogCSV(rows: string[][]): YTVideo[] {
  if (rows.length < 2) return [];
  const hdrs = rows[0].map((h) => h.toLowerCase().trim());
  const fi = (keys: string[]) => hdrs.findIndex((h) => keys.some((k) => h.includes(k)));
  const idx = {
    title:         fi(["title", "video name", "video"]),
    publishDate:   fi(["date", "publish"]),
    url:           fi(["video url", "video link", "youtube", " url", "link url", "url", "link"]),
    ctr:           fi(["ctr"]),
    watchTime:     fi(["watch time", "watchtime", "avg watch"]),
    impressions:   fi(["impression"]),
    wtImpressions: fi(["watch:impr", "wt:impr", "ratio", "watch impr", "w:i"]),
  };
  const get = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "");
  return rows
    .slice(1)
    .filter((row) => row.some((c) => c.trim()))
    .map((row) => ({
      title:         cleanTitle(get(row, idx.title)),
      publishDate:   get(row, idx.publishDate),
      url:           get(row, idx.url),
      ctr:           get(row, idx.ctr),
      watchTime:     toNum(get(row, idx.watchTime)),
      impressions:   toNum(get(row, idx.impressions)),
      wtImpressions: get(row, idx.wtImpressions),
    }))
    .filter((v) => v.title || v.publishDate);
}

// ─── Email Data Types ─────────────────────────────────────────────────────────

export interface EmailMonthlyRow {
  month: string;
  delivered: number;
  opens: number;
  openPct: number;   // e.g. 85.7
  clicks: number;
  ctrPct: number;    // e.g. 0.95
}

export interface EmailCampaign {
  subject: string;
  date: string;
  delivered: number;
  opens: number;
  openPct: number;
  clicks: number;
  ctrPct: number;
}

export interface EmailData {
  monthly: EmailMonthlyRow[];
  campaigns: EmailCampaign[];
  yearlyAvg: EmailMonthlyRow | null;
}

const EMAIL_MONTHS = new Set([
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
]);

export function parseEmailData(rows: string[][]): EmailData {
  // Find header row: must contain "delivered" and "opens"
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const j = rows[i].join(",").toLowerCase();
    if (j.includes("delivered") && j.includes("opens")) { headerIdx = i; break; }
  }
  if (headerIdx === -1) return { monthly: [], campaigns: [], yearlyAvg: null };

  const h = rows[headerIdx].map((c) => c.toLowerCase().trim());
  const ci = (...names: string[]) => {
    for (const name of names) {
      const idx = h.findIndex((c) => c.includes(name));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const C = {
    delivered: ci("delivered"),
    opens:     ci("opens"),
    openPct:   ci("open %", "open rate", "open%"),
    clicks:    ci("# of click", "clicks"),
    ctrPct:    ci("ctr"),
  };

  const monthly: EmailMonthlyRow[] = [];
  const campaigns: EmailCampaign[] = [];
  let yearlyAvg: EmailMonthlyRow | null = null;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const col0 = (row[0] ?? "").trim();
    const col0l = col0.toLowerCase();
    if (!col0) continue;

    const n = (idx: number) => idx >= 0 ? toNum(row[idx] ?? "") : 0;

    if (EMAIL_MONTHS.has(col0l)) {
      monthly.push({
        month: col0, delivered: n(C.delivered), opens: n(C.opens),
        openPct: n(C.openPct), clicks: n(C.clicks), ctrPct: n(C.ctrPct),
      });
    } else if (col0l.includes("yearly") || col0l.includes("annual") || col0l.includes("total avg")) {
      yearlyAvg = {
        month: col0, delivered: n(C.delivered), opens: n(C.opens),
        openPct: n(C.openPct), clicks: n(C.clicks), ctrPct: n(C.ctrPct),
      };
    } else if (n(C.delivered) > 0) {
      // Individual campaign row
      campaigns.push({
        subject: col0, date: "",
        delivered: n(C.delivered), opens: n(C.opens),
        openPct: n(C.openPct), clicks: n(C.clicks), ctrPct: n(C.ctrPct),
      });
    }
  }

  return { monthly, campaigns, yearlyAvg };
}

// ─── Platform Distribution Data ───────────────────────────────────────────────

export interface PlatformMonthRow {
  month: string;
  // pieces published per channel
  ig: number;
  ytLong: number;
  ytShorts: number;
  ytPosts: number;
  fbPosts: number;
  tiktok: number;
  x: number;
  podcasts: number;
  email: number;
  // leads per channel
  igLeads: number;
  ytLeads: number;
  fbLeads: number;
  ttLeads: number;
  emailLeads: number;
  // totals
  totalPieces: number;
  totalLeads: number;
  generatedValue: number;
}

export interface PlatformGoals {
  ig: number;
  email: number;
  ytLong: number;
  ytShorts: number;
  ytPosts: number;
  fbPosts: number;
  tiktok: number;
  x: number;
  podcasts: number;
}

export interface PlatformData {
  rows: PlatformMonthRow[];
  goals: PlatformGoals | null;
}

const MONTH_NAMES = new Set([
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
]);

export function parsePlatformData(rows: string[][]): PlatformData {
  // The sheet uses TWO header rows:
  //   Row 1: Month, (empty ×12), X, Podcasts, TOTAL PIECES, TOTAL LEADS, CPL, TOTAL GENERATED VALUE
  //   Row 2: (empty), IG, IG LEADS, YT Long, YT Shorts, YT Posts, YT LEADS,
  //          FB Posts, FB LEADS, TikTok, TT LEADS, Email, Email LEADS, (empty ×6)
  // We find row 1 by "month" + "total pieces", then merge both rows into one colMap.

  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const joined = rows[i].join(",").toLowerCase();
    if (joined.includes("month") && joined.includes("total pieces")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return { rows: [], goals: null };

  // Merge header row 1 and row 2: for each column, prefer row 2's value if non-empty
  const h1 = rows[headerIdx]     ?? [];
  const h2 = rows[headerIdx + 1] ?? [];
  const colMap: Record<string, number> = {};
  const width = Math.max(h1.length, h2.length);
  for (let j = 0; j < width; j++) {
    const label = (h2[j]?.trim() || h1[j]?.trim() || "").toLowerCase();
    if (label) colMap[label] = j;
  }

  const col = (...names: string[]): number => {
    for (const n of names) {
      const idx = colMap[n.toLowerCase()];
      if (idx !== undefined) return idx;
    }
    return -1;
  };

  const C = {
    month:       col("month"),
    ig:          col("ig"),
    igLeads:     col("ig leads"),
    ytLong:      col("yt long"),
    ytShorts:    col("yt shorts"),
    ytPosts:     col("yt posts"),
    ytLeads:     col("yt leads"),
    fbPosts:     col("fb posts"),
    fbLeads:     col("fb leads"),
    tiktok:      col("tiktok"),
    ttLeads:     col("tt leads"),
    email:       col("email"),
    emailLeads:  col("email leads"),
    x:           col("x"),
    podcasts:    col("podcasts"),
    totalPieces: col("total pieces"),
    totalLeads:  col("total leads"),
    genValue:    col("total generated value ($8 cpl)", "total generated value"),
  };

  const n = (row: string[], idx: number) => idx >= 0 ? toNum(row[idx] ?? "") : 0;

  // Data rows start after both header rows
  const result: PlatformMonthRow[] = [];
  let goals: PlatformGoals | null = null;

  for (let i = headerIdx + 2; i < rows.length; i++) {
    const row = rows[i];
    const month = (row[C.month] ?? "").trim();
    const monthLower = month.toLowerCase();

    // Parse GOALS row
    if (monthLower === "goals") {
      goals = {
        ig:       n(row, C.ig),
        email:    n(row, C.email),
        ytLong:   n(row, C.ytLong),
        ytShorts: n(row, C.ytShorts),
        ytPosts:  n(row, C.ytPosts),
        fbPosts:  n(row, C.fbPosts),
        tiktok:   n(row, C.tiktok),
        x:        n(row, C.x),
        podcasts: n(row, C.podcasts),
      };
      continue;
    }

    if (!MONTH_NAMES.has(monthLower)) continue;
    result.push({
      month,
      ig:             n(row, C.ig),
      ytLong:         n(row, C.ytLong),
      ytShorts:       n(row, C.ytShorts),
      ytPosts:        n(row, C.ytPosts),
      fbPosts:        n(row, C.fbPosts),
      tiktok:         n(row, C.tiktok),
      x:              n(row, C.x),
      podcasts:       n(row, C.podcasts),
      email:          n(row, C.email),
      igLeads:        n(row, C.igLeads),
      ytLeads:        n(row, C.ytLeads),
      fbLeads:        n(row, C.fbLeads),
      ttLeads:        n(row, C.ttLeads),
      emailLeads:     n(row, C.emailLeads),
      totalPieces:    n(row, C.totalPieces),
      totalLeads:     n(row, C.totalLeads),
      generatedValue: n(row, C.genValue),
    });
  }
  return { rows: result, goals };
}
