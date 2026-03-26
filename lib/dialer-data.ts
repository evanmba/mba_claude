// ─── Types ────────────────────────────────────────────────────────────────────

export interface DialerInfo {
  id: string;
  name: string;
  color: string;
  sheetName: string; // e.g. "Julio- MAR 2026"
}

/**
 * Individual dialer monthly metrics — from "{Name} - MAR 2026" sheet C4:I4
 * C = totalDials, D = linksSent, E = dialLinkPct (links/dials as %),
 * F = bookedCalls, G = setPct (booked/links as %), H = takenCalls, I = showUpRate
 */
export interface DialerMonthMetrics {
  month: string;
  totalDials: number;
  linksSent: number;
  dialLinkPct: number;  // links / dials * 100  (e.g. 3.3 for 3.3%)
  bookedCalls: number;
  setPct: number;       // booked / links * 100  (e.g. 13.3 for 13.3%)
  takenCalls: number;
  showUpRate: number;   // taken / booked * 100
  deals: number;
  closePct: number;
}

/** Team monthly row — from "2026 - Dialers" sheet */
export interface TeamMonthRow {
  month: string;
  date: string;
  booked: number;
  taken: number;
  sitPct: number;
  deals: number;
  closePct: number;
}

/** Goals tracker — from GOALS sheet */
export interface GoalsData {
  monthly: { booked: number; goal: number };
  weekly: { booked: number; goal: number };
  daily: { booked: number; goal: number };
  currentWeek: {
    weekNum: number;
    start: string;
    end: string;
    daysElapsed: number;   // work days so far this week
    totalWorkdays: number; // total work days in the week
    setters: { name: string; id: string; booked: number }[];
  };
}

/** Speed to Lead row */
export interface SpeedToLeadDay {
  date: string;
  timeToDial: string;
  timeMins: number;
  pctUnder15m: number;
}

export interface SpeedToLeadRolling {
  label: string;
  timeToDial: string;
  timeMins: number;
  pctUnder15m: number;
}

export interface SpeedToLeadData {
  days: SpeedToLeadDay[];
  rolling: SpeedToLeadRolling[];
}

// ─── Setters ──────────────────────────────────────────────────────────────────

export const DIALERS: DialerInfo[] = [
  { id: "daneile-brown",         name: "Daneile Brown",        color: "#3b82f6",  sheetName: "Daneile- MAR 2026" },
  { id: "gabriana-brown",        name: "Gabriana Brown",       color: "#d946ef",  sheetName: "Gabriana- MAR 2026" },
  { id: "julio-capellan",        name: "Julio Capellan",       color: "#f59e0b",  sheetName: "Julio- MAR 2026" },
  { id: "allieandra-alexander",  name: "Allieandra Alexander", color: "#22c55e",  sheetName: "Allieandra- MAR 2026" },
  { id: "teagan-brown",          name: "Teagan Brown",         color: "#ef4444",  sheetName: "Teagan- MAR 2026" },
];

// ─── Goals Data (from GOALS sheet) ───────────────────────────────────────────
// Week #13: Sun 3/22/26 – Sat 3/28/26 (7-day week), today = Thu 3/26 = day 5 of 7

export const GOALS_DATA: GoalsData = {
  monthly: { booked: 89, goal: 130 },
  weekly:  { booked: 26, goal: 35 },
  daily:   { booked: 4,  goal: 5 },
  currentWeek: {
    weekNum: 13,
    start: "3/22/26",
    end: "3/28/26",
    daysElapsed: 5,
    totalWorkdays: 7,
    setters: [
      { name: "Daneile Brown",        id: "daneile-brown",        booked: 4 },
      { name: "Gabriana Brown",       id: "gabriana-brown",       booked: 3 },
      { name: "Julio Capellan",       id: "julio-capellan",       booked: 3 },
      { name: "Allieandra Alexander", id: "allieandra-alexander",  booked: 0 },
      { name: "Teagan Brown",         id: "teagan-brown",         booked: 0 },
    ],
  },
};

// ─── Speed to Lead (Team — from GOALS sheet image) ───────────────────────────
// Stored oldest→newest; display shows last 5 days (sliced in component)

export const SPEED_TO_LEAD: SpeedToLeadData = {
  days: [
    { date: "3/20/2026", timeToDial: "0h:4m",   timeMins: 4,    pctUnder15m: 100.00 },
    { date: "3/21/2026", timeToDial: "2h:15m",  timeMins: 135,  pctUnder15m: 0.00   },
    { date: "3/22/2026", timeToDial: "29h:55m", timeMins: 1795, pctUnder15m: 0.00   },
    { date: "3/23/2026", timeToDial: "0h:3m",   timeMins: 3,    pctUnder15m: 100.00 },
    { date: "3/24/2026", timeToDial: "0h:3m",   timeMins: 3,    pctUnder15m: 100.00 },
    { date: "3/25/2026", timeToDial: "0h:16m",  timeMins: 16,   pctUnder15m: 76.92  },
    { date: "3/26/2026", timeToDial: "0h:0m",   timeMins: 0,    pctUnder15m: 0.00   },
  ],
  rolling: [
    { label: "2d AVG",  timeToDial: "0h:9m",   timeMins: 9,   pctUnder15m: 88.46 },
    { label: "4d-AVG",  timeToDial: "7h:8m",   timeMins: 428, pctUnder15m: 70.59 },
    { label: "7d-AVG",  timeToDial: "4h:37m",  timeMins: 277, pctUnder15m: 74.39 },
    { label: "14d-AVG", timeToDial: "7h:45m",  timeMins: 465, pctUnder15m: 70.33 },
    { label: "30d-AVG", timeToDial: "7h:47m",  timeMins: 467, pctUnder15m: 66.13 },
  ],
};

// ─── Individual Dialer Metrics (mock — replace via Google Sheets API) ─────────
// Sheet columns C–I per dialer per month:
// C = totalDials, D = linksSent, E = dialLinkPct (%), F = bookedCalls,
// G = setPct (%), H = takenCalls, I = showUpRate (%)
//
// NOTE for Julio MAR 2026 (verified from sheet):
//   C4 (dials) ≈ 2515, D4 = 83 links, E4 = 3.3%, F4 = 11 booked,
//   G4 = 13.3% set%, H4 = 4 taken, I4 = 36.4% show-up

export const DIALER_METRICS: Record<string, DialerMonthMetrics[]> = {
  "daneile-brown": [
    {
      month: "JAN 2026",
      totalDials: 0,    linksSent: 0,  dialLinkPct: 0,  bookedCalls: 0,
      setPct: 0,        takenCalls: 0, showUpRate: 0,   deals: 0, closePct: 0,
    },
    {
      month: "FEB 2026",
      totalDials: 1050, linksSent: 28, dialLinkPct: 2.7, bookedCalls: 8,
      setPct: 28.6,     takenCalls: 1, showUpRate: 12.5, deals: 0, closePct: 0,
    },
    {
      month: "MAR 2026",
      totalDials: 1580, linksSent: 52, dialLinkPct: 3.3, bookedCalls: 33,
      setPct: 63.5,     takenCalls: 10, showUpRate: 30.3, deals: 0, closePct: 0,
    },
  ],
  "gabriana-brown": [
    {
      month: "JAN 2026",
      totalDials: 0,   linksSent: 0,  dialLinkPct: 0, bookedCalls: 0,
      setPct: 0,       takenCalls: 0, showUpRate: 0,  deals: 0, closePct: 0,
    },
    {
      month: "FEB 2026",
      totalDials: 0,   linksSent: 0,  dialLinkPct: 0, bookedCalls: 0,
      setPct: 0,       takenCalls: 0, showUpRate: 0,  deals: 0, closePct: 0,
    },
    {
      month: "MAR 2026",
      totalDials: 620, linksSent: 21, dialLinkPct: 3.4, bookedCalls: 3,
      setPct: 14.3,    takenCalls: 2, showUpRate: 66.7, deals: 0, closePct: 0,
    },
  ],
  "julio-capellan": [
    {
      month: "JAN 2026",
      totalDials: 0,    linksSent: 0,  dialLinkPct: 0, bookedCalls: 1,
      setPct: 0,        takenCalls: 0, showUpRate: 0,  deals: 0, closePct: 0,
    },
    {
      month: "FEB 2026",
      totalDials: 890,  linksSent: 31, dialLinkPct: 3.5, bookedCalls: 7,
      setPct: 22.6,     takenCalls: 0, showUpRate: 0,    deals: 0, closePct: 0,
    },
    {
      month: "MAR 2026",
      // Verified from sheet: C4 dials, D4=83 links, E4=3.3%, F4=11, G4=13.3%, H4=4, I4=36.4%
      totalDials: 2515, linksSent: 83, dialLinkPct: 3.3, bookedCalls: 11,
      setPct: 13.3,     takenCalls: 4, showUpRate: 36.4, deals: 0, closePct: 0,
    },
  ],
  "allieandra-alexander": [
    {
      month: "JAN 2026",
      totalDials: 0,    linksSent: 0,  dialLinkPct: 0, bookedCalls: 8,
      setPct: 0,        takenCalls: 1, showUpRate: 12.5, deals: 0, closePct: 0,
    },
    {
      month: "FEB 2026",
      totalDials: 0,    linksSent: 0,  dialLinkPct: 0, bookedCalls: 6,
      setPct: 0,        takenCalls: 3, showUpRate: 50.0, deals: 1, closePct: 33.3,
    },
    {
      month: "MAR 2026",
      totalDials: 1380, linksSent: 47, dialLinkPct: 3.4, bookedCalls: 13,
      setPct: 27.7,     takenCalls: 5, showUpRate: 38.5, deals: 0, closePct: 0,
    },
  ],
  "teagan-brown": [
    {
      month: "JAN 2026",
      totalDials: 0,   linksSent: 0,  dialLinkPct: 0, bookedCalls: 0,
      setPct: 0,       takenCalls: 0, showUpRate: 0,  deals: 0, closePct: 0,
    },
    {
      month: "FEB 2026",
      totalDials: 590, linksSent: 18, dialLinkPct: 3.1, bookedCalls: 4,
      setPct: 22.2,    takenCalls: 0, showUpRate: 0,   deals: 0, closePct: 0,
    },
    {
      month: "MAR 2026",
      totalDials: 0,   linksSent: 0,  dialLinkPct: 0, bookedCalls: 0,
      setPct: 0,       takenCalls: 0, showUpRate: 0,  deals: 0, closePct: 0,
    },
  ],
};

// ─── Team Monthly Data (from "2026 - Dialers" sheet A3:G17) ──────────────────
// Columns: Month | Date | Booked | Taken | Sit% | Deals | Close%

export const TEAM_MONTHLY: TeamMonthRow[] = [
  { month: "January",   date: "1/1/26",  booked: 29, taken: 6,  sitPct: 21, deals: 4, closePct: 67 },
  { month: "February",  date: "2/1/26",  booked: 12, taken: 7,  sitPct: 58, deals: 1, closePct: 14 },
  { month: "March",     date: "3/1/26",  booked: 22, taken: 7,  sitPct: 32, deals: 2, closePct: 29 },
  { month: "April",     date: "4/1/26",  booked: 0,  taken: 0,  sitPct: 0,  deals: 0, closePct: 0  },
  { month: "May",       date: "5/1/26",  booked: 0,  taken: 0,  sitPct: 0,  deals: 0, closePct: 0  },
  { month: "June",      date: "6/1/26",  booked: 0,  taken: 0,  sitPct: 0,  deals: 0, closePct: 0  },
  { month: "July",      date: "7/1/26",  booked: 0,  taken: 0,  sitPct: 0,  deals: 0, closePct: 0  },
  { month: "August",    date: "8/1/26",  booked: 0,  taken: 0,  sitPct: 0,  deals: 0, closePct: 0  },
  { month: "September", date: "9/1/26",  booked: 0,  taken: 0,  sitPct: 0,  deals: 0, closePct: 0  },
  { month: "October",   date: "10/1/26", booked: 0,  taken: 0,  sitPct: 0,  deals: 0, closePct: 0  },
  { month: "November",  date: "11/1/26", booked: 0,  taken: 0,  sitPct: 0,  deals: 0, closePct: 0  },
  { month: "December",  date: "12/1/26", booked: 0,  taken: 0,  sitPct: 0,  deals: 0, closePct: 0  },
];

export const AVAILABLE_MONTHS = ["JAN 2026", "FEB 2026", "MAR 2026"] as const;
export type AvailableMonth = typeof AVAILABLE_MONTHS[number];

// ─── Helper ───────────────────────────────────────────────────────────────────

export function momPct(curr: number, prev: number): string {
  if (!prev && !curr) return "";
  if (!prev) return "+∞";
  const d = ((curr - prev) / prev) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(0)}%`;
}

export function momDir(curr: number, prev: number): "up" | "down" | "neutral" {
  if (!prev) return "neutral";
  return curr >= prev ? "up" : "down";
}
