const SHEET_ID = "1vMLUZbcJsmP35ACR_kgi2a7wWjfX3sdXcuYPKxYcAno";
const TAB      = "Self v Internal Reporting";
const RANGE    = `${encodeURIComponent(TAB)}!A1:I25`;
const TZ       = "America/New_York";

function toNum(v: string | undefined): number {
  if (!v || v.trim() === "" || v.trim() === "—") return 0;
  return parseFloat(v.replace(/[$,%\s]/g, "")) || 0;
}

function parseWinner(cell: string | undefined): "A" | "B" | null {
  if (!cell) return null;
  if (cell.includes("A -") || cell.includes("A—") || cell.startsWith("A")) return "A";
  if (cell.includes("B -") || cell.includes("B—") || cell.startsWith("B")) return "B";
  return null;
}

export interface OverallStats {
  totalLeads:  number;
  callsShown:  number;
  totalClosed: number;
  showRate:    number; // e.g. 34.8
  closeRate:   number; // e.g. 12.9
  totalCash:   number;
}

export interface H2HRow {
  metric:      string;
  selfVal:     string; // display string (e.g. "39.2%", "$13,083")
  internalVal: string;
  selfNum:     number; // numeric for bar sizing
  internalNum: number;
  winner:      "A" | "B" | null;
}

export interface QualityScore {
  self:     number; // e.g. 26.0
  internal: number; // e.g. 18.1
  better:   "A" | "B";
}

export interface SelfVsInternalData {
  overall:    OverallStats;
  headToHead: H2HRow[];
  quality:    QualityScore;
  lastFetched: string;
}

export async function fetchSelfVsInternalData(): Promise<SelfVsInternalData> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY ?? "";
  const url    = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${apiKey}`;

  let rows: string[][] = [];
  try {
    const res  = await fetch(url, { next: { revalidate: 300 } });
    const json = await res.json();
    rows = (json.values ?? []) as string[][];
  } catch { /* fall through — render zeros */ }

  // Row 4 (index 4): overall values
  // cols: [totalLeads, callsShown, totalClosed, "", showRate, "", closeRate, "", totalCash]
  const or = rows[4] ?? [];
  const overall: OverallStats = {
    totalLeads:  toNum(or[0]),
    callsShown:  toNum(or[1]),
    totalClosed: toNum(or[2]),
    showRate:    toNum(or[4]),
    closeRate:   toNum(or[6]),
    totalCash:   toNum(or[8]),
  };

  // Rows 8–14: head-to-head
  // cols: [metric, "", selfVal, "", internalVal, "", winner]
  const H2H_ROWS = [8, 9, 10, 11, 12, 13, 14];
  const headToHead: H2HRow[] = H2H_ROWS.map((i) => {
    const r = rows[i] ?? [];
    const selfVal     = (r[2] ?? "").trim();
    const internalVal = (r[4] ?? "").trim();
    return {
      metric:      (r[0] ?? "").trim(),
      selfVal,
      internalVal,
      selfNum:     toNum(selfVal),
      internalNum: toNum(internalVal),
      winner:      parseWinner(r[6]),
    };
  }).filter(r => r.metric);

  // Rows 18–20: quality score
  // col 4 has value; row 18 = self score, row 19 = internal score, row 20 = better
  const selfScore     = toNum((rows[18] ?? [])[4]);
  const internalScore = toNum((rows[19] ?? [])[4]);
  const betterText    = ((rows[20] ?? [])[4] ?? "").trim();
  const quality: QualityScore = {
    self:     selfScore,
    internal: internalScore,
    better:   betterText.startsWith("B") ? "B" : "A",
  };

  return {
    overall,
    headToHead,
    quality,
    lastFetched: new Date().toLocaleString("en-US", { timeZone: TZ, timeZoneName: "short" }),
  };
}
