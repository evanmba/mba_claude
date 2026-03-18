// ─── Types ────────────────────────────────────────────────────────────────────

export type SetterInfo = {
  id: string;
  name: string;
  color: string;
};

export type WeeklyRow = {
  setterId: string;
  setter: string;
  booked: number;
  goal: number;
};

export type DialingDay = {
  date: string;
  timeToDial: string;
  timeMins: number; // raw minutes, for coloring
  pctUnder15m: number;
};

export type RollingAvgRow = {
  label: string;
  timeToDial: string;
  timeMins: number;
  pctUnder15m: number;
};

export type MonthData = {
  month: string; // e.g. "MAR 2026"
  booked: number;
  goal: number;
  taken: number;  // sits taken
  deals: number;  // closed deals
  dialingDays: DialingDay[];
  rollingAvg: RollingAvgRow[];
  weeklyBreakdown: { week: string; start: string; end: string; booked: number; goal: number }[];
};

// ─── Setters ──────────────────────────────────────────────────────────────────

export const SETTERS: SetterInfo[] = [
  { id: "daneile-brown", name: "Daneile Brown", color: "#3b82f6" },
  { id: "gabriana-brown", name: "Gabriana Brown", color: "#d946ef" },
  { id: "julio-capellan", name: "Julio Capellan", color: "#f59e0b" },
  { id: "allieandra-alexander", name: "Allieandra Alexander", color: "#22c55e" },
  { id: "teagan-brown", name: "Teagan Brown", color: "#ef4444" },
];

// ─── Current Period Goals ─────────────────────────────────────────────────────

export const GOALS = {
  monthly: { booked: 46, goal: 130 },
  weekly: { booked: 12, goal: 35 },
  daily: { booked: 2, goal: 5 },
};

export const CURRENT_WEEK = {
  weekNum: 12,
  start: "3/15/26",
  end: "3/21/26",
};

export const WEEKLY_SETTER_DATA: WeeklyRow[] = [
  { setter: "Daneile Brown", setterId: "daneile-brown", booked: 1, goal: 4 },
  { setter: "Gabriana Brown", setterId: "gabriana-brown", booked: 1, goal: 4 },
  { setter: "Julio Capellan", setterId: "julio-capellan", booked: 2, goal: 4 },
  { setter: "Allieandra Alexander", setterId: "allieandra-alexander", booked: 4, goal: 4 },
  { setter: "Teagan Brown", setterId: "teagan-brown", booked: 0, goal: 4 },
];

// ─── Dialing Performance (Team Level) ────────────────────────────────────────

export const TEAM_DIALING_MAR: DialingDay[] = [
  { date: "3/12/2026", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 85.0 },
  { date: "3/13/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 95.45 },
  { date: "3/14/2026", timeToDial: "39h:40m", timeMins: 2380, pctUnder15m: 13.64 },
  { date: "3/15/2026", timeToDial: "23h:5m", timeMins: 1385, pctUnder15m: 0.0 },
  { date: "3/16/2026", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 96.15 },
  { date: "3/17/2026", timeToDial: "0h:3m", timeMins: 3, pctUnder15m: 100.0 },
  { date: "3/18/2026", timeToDial: "0h:0m", timeMins: 0, pctUnder15m: 0.0 },
];

export const TEAM_ROLLING_AVG_MAR: RollingAvgRow[] = [
  { label: "2d AVG", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 97.92 },
  { label: "4d-AVG", timeToDial: "15h:32m", timeMins: 932, pctUnder15m: 51.02 },
  { label: "7d-AVG", timeToDial: "9h:37m", timeMins: 577, pctUnder15m: 65.41 },
  { label: "14d-AVG", timeToDial: "7h:25m", timeMins: 445, pctUnder15m: 60.82 },
  { label: "30d-AVG", timeToDial: "6h:42m", timeMins: 402, pctUnder15m: 57.68 },
];

// ─── Individual Setter Monthly Data ──────────────────────────────────────────

type SetterMonthlyData = Record<string, Record<string, MonthData>>;

export const SETTER_MONTHLY_DATA: SetterMonthlyData = {
  "gabriana-brown": {
    "JAN 2026": {
      month: "JAN 2026",
      booked: 8,
      goal: 40,
      taken: 2,
      deals: 1,
      weeklyBreakdown: [
        { week: "W1", start: "1/5/26", end: "1/11/26", booked: 2, goal: 10 },
        { week: "W2", start: "1/12/26", end: "1/18/26", booked: 2, goal: 10 },
        { week: "W3", start: "1/19/26", end: "1/25/26", booked: 2, goal: 10 },
        { week: "W4", start: "1/26/26", end: "2/1/26", booked: 2, goal: 10 },
      ],
      dialingDays: [
        { date: "1/6/2026", timeToDial: "0h:8m", timeMins: 8, pctUnder15m: 78.0 },
        { date: "1/7/2026", timeToDial: "0h:6m", timeMins: 6, pctUnder15m: 82.5 },
        { date: "1/8/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 91.0 },
        { date: "1/9/2026", timeToDial: "12h:15m", timeMins: 735, pctUnder15m: 22.0 },
        { date: "1/10/2026", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 88.0 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 89.5 },
        { label: "7d-AVG", timeToDial: "2h:38m", timeMins: 158, pctUnder15m: 72.3 },
        { label: "30d-AVG", timeToDial: "1h:45m", timeMins: 105, pctUnder15m: 69.1 },
      ],
    },
    "FEB 2026": {
      month: "FEB 2026",
      booked: 6,
      goal: 40,
      taken: 3,
      deals: 1,
      weeklyBreakdown: [
        { week: "W5", start: "2/2/26", end: "2/8/26", booked: 2, goal: 10 },
        { week: "W6", start: "2/9/26", end: "2/15/26", booked: 2, goal: 10 },
        { week: "W7", start: "2/16/26", end: "2/22/26", booked: 1, goal: 10 },
        { week: "W8", start: "2/23/26", end: "3/1/26", booked: 1, goal: 10 },
      ],
      dialingDays: [
        { date: "2/3/2026", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 90.0 },
        { date: "2/4/2026", timeToDial: "0h:7m", timeMins: 7, pctUnder15m: 85.7 },
        { date: "2/5/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 93.3 },
        { date: "2/6/2026", timeToDial: "18h:20m", timeMins: 1100, pctUnder15m: 8.3 },
        { date: "2/7/2026", timeToDial: "0h:6m", timeMins: 6, pctUnder15m: 87.5 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 90.4 },
        { label: "7d-AVG", timeToDial: "3h:48m", timeMins: 228, pctUnder15m: 73.0 },
        { label: "30d-AVG", timeToDial: "2h:10m", timeMins: 130, pctUnder15m: 70.5 },
      ],
    },
    "MAR 2026": {
      month: "MAR 2026",
      booked: 3,
      goal: 40,
      taken: 2,
      deals: 0,
      weeklyBreakdown: [
        { week: "W9", start: "3/2/26", end: "3/8/26", booked: 1, goal: 10 },
        { week: "W10", start: "3/9/26", end: "3/14/26", booked: 1, goal: 10 },
        { week: "W11", start: "3/15/26", end: "3/21/26", booked: 1, goal: 10 },
        { week: "W12", start: "3/22/26", end: "3/28/26", booked: 0, goal: 10 },
      ],
      dialingDays: [
        { date: "3/12/2026", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 85.0 },
        { date: "3/13/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 95.45 },
        { date: "3/14/2026", timeToDial: "39h:40m", timeMins: 2380, pctUnder15m: 13.64 },
        { date: "3/15/2026", timeToDial: "23h:5m", timeMins: 1385, pctUnder15m: 0.0 },
        { date: "3/16/2026", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 96.15 },
        { date: "3/17/2026", timeToDial: "0h:3m", timeMins: 3, pctUnder15m: 100.0 },
        { date: "3/18/2026", timeToDial: "0h:0m", timeMins: 0, pctUnder15m: 0.0 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 97.92 },
        { label: "4d-AVG", timeToDial: "15h:32m", timeMins: 932, pctUnder15m: 51.02 },
        { label: "7d-AVG", timeToDial: "9h:37m", timeMins: 577, pctUnder15m: 65.41 },
        { label: "30d-AVG", timeToDial: "6h:42m", timeMins: 402, pctUnder15m: 57.68 },
      ],
    },
  },
  "daneile-brown": {
    "JAN 2026": {
      month: "JAN 2026",
      booked: 4,
      goal: 40,
      taken: 0,
      deals: 0,
      weeklyBreakdown: [
        { week: "W1", start: "1/5/26", end: "1/11/26", booked: 1, goal: 10 },
        { week: "W2", start: "1/12/26", end: "1/18/26", booked: 1, goal: 10 },
        { week: "W3", start: "1/19/26", end: "1/25/26", booked: 1, goal: 10 },
        { week: "W4", start: "1/26/26", end: "2/1/26", booked: 1, goal: 10 },
      ],
      dialingDays: [
        { date: "1/6/2026", timeToDial: "0h:9m", timeMins: 9, pctUnder15m: 76.0 },
        { date: "1/7/2026", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 88.0 },
        { date: "1/8/2026", timeToDial: "0h:6m", timeMins: 6, pctUnder15m: 83.3 },
        { date: "1/9/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 92.0 },
        { date: "1/10/2026", timeToDial: "8h:30m", timeMins: 510, pctUnder15m: 18.5 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 87.5 },
        { label: "7d-AVG", timeToDial: "1h:49m", timeMins: 109, pctUnder15m: 71.6 },
        { label: "30d-AVG", timeToDial: "1h:20m", timeMins: 80, pctUnder15m: 68.4 },
      ],
    },
    "FEB 2026": {
      month: "FEB 2026",
      booked: 0,
      goal: 40,
      taken: 0,
      deals: 0,
      weeklyBreakdown: [
        { week: "W5", start: "2/2/26", end: "2/8/26", booked: 0, goal: 10 },
        { week: "W6", start: "2/9/26", end: "2/15/26", booked: 0, goal: 10 },
        { week: "W7", start: "2/16/26", end: "2/22/26", booked: 0, goal: 10 },
        { week: "W8", start: "2/23/26", end: "3/1/26", booked: 0, goal: 10 },
      ],
      dialingDays: [
        { date: "2/3/2026", timeToDial: "0h:6m", timeMins: 6, pctUnder15m: 86.0 },
        { date: "2/4/2026", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 90.0 },
        { date: "2/5/2026", timeToDial: "0h:7m", timeMins: 7, pctUnder15m: 84.2 },
        { date: "2/6/2026", timeToDial: "14h:10m", timeMins: 850, pctUnder15m: 11.1 },
        { date: "2/7/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 93.8 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 91.9 },
        { label: "7d-AVG", timeToDial: "2h:56m", timeMins: 176, pctUnder15m: 73.0 },
        { label: "30d-AVG", timeToDial: "1h:55m", timeMins: 115, pctUnder15m: 70.0 },
      ],
    },
    "MAR 2026": {
      month: "MAR 2026",
      booked: 3,
      goal: 40,
      taken: 3,
      deals: 0,
      weeklyBreakdown: [
        { week: "W9", start: "3/2/26", end: "3/8/26", booked: 1, goal: 10 },
        { week: "W10", start: "3/9/26", end: "3/14/26", booked: 1, goal: 10 },
        { week: "W11", start: "3/15/26", end: "3/21/26", booked: 1, goal: 10 },
        { week: "W12", start: "3/22/26", end: "3/28/26", booked: 0, goal: 10 },
      ],
      dialingDays: [
        { date: "3/12/2026", timeToDial: "0h:6m", timeMins: 6, pctUnder15m: 83.3 },
        { date: "3/13/2026", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 90.0 },
        { date: "3/14/2026", timeToDial: "28h:15m", timeMins: 1695, pctUnder15m: 10.0 },
        { date: "3/15/2026", timeToDial: "19h:40m", timeMins: 1180, pctUnder15m: 0.0 },
        { date: "3/16/2026", timeToDial: "0h:7m", timeMins: 7, pctUnder15m: 88.0 },
        { date: "3/17/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 100.0 },
        { date: "3/18/2026", timeToDial: "0h:0m", timeMins: 0, pctUnder15m: 0.0 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 94.0 },
        { label: "4d-AVG", timeToDial: "12h:6m", timeMins: 726, pctUnder15m: 44.5 },
        { label: "7d-AVG", timeToDial: "6h:51m", timeMins: 411, pctUnder15m: 67.0 },
        { label: "30d-AVG", timeToDial: "5h:10m", timeMins: 310, pctUnder15m: 60.0 },
      ],
    },
  },
  "julio-capellan": {
    "JAN 2026": {
      month: "JAN 2026",
      booked: 7,
      goal: 40,
      taken: 0,
      deals: 0,
      weeklyBreakdown: [
        { week: "W1", start: "1/5/26", end: "1/11/26", booked: 2, goal: 10 },
        { week: "W2", start: "1/12/26", end: "1/18/26", booked: 2, goal: 10 },
        { week: "W3", start: "1/19/26", end: "1/25/26", booked: 2, goal: 10 },
        { week: "W4", start: "1/26/26", end: "2/1/26", booked: 1, goal: 10 },
      ],
      dialingDays: [
        { date: "1/6/2026", timeToDial: "0h:10m", timeMins: 10, pctUnder15m: 72.0 },
        { date: "1/7/2026", timeToDial: "0h:7m", timeMins: 7, pctUnder15m: 85.0 },
        { date: "1/8/2026", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 90.0 },
        { date: "1/9/2026", timeToDial: "0h:8m", timeMins: 8, pctUnder15m: 80.0 },
        { date: "1/10/2026", timeToDial: "0h:6m", timeMins: 6, pctUnder15m: 87.5 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:7m", timeMins: 7, pctUnder15m: 83.75 },
        { label: "7d-AVG", timeToDial: "0h:7m", timeMins: 7, pctUnder15m: 82.9 },
        { label: "30d-AVG", timeToDial: "0h:8m", timeMins: 8, pctUnder15m: 80.5 },
      ],
    },
    "FEB 2026": {
      month: "FEB 2026",
      booked: 0,
      goal: 40,
      taken: 0,
      deals: 0,
      weeklyBreakdown: [
        { week: "W5", start: "2/2/26", end: "2/8/26", booked: 0, goal: 10 },
        { week: "W6", start: "2/9/26", end: "2/15/26", booked: 0, goal: 10 },
        { week: "W7", start: "2/16/26", end: "2/22/26", booked: 0, goal: 10 },
        { week: "W8", start: "2/23/26", end: "3/1/26", booked: 0, goal: 10 },
      ],
      dialingDays: [
        { date: "2/3/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 93.3 },
        { date: "2/4/2026", timeToDial: "0h:6m", timeMins: 6, pctUnder15m: 87.5 },
        { date: "2/5/2026", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 91.7 },
        { date: "2/6/2026", timeToDial: "0h:7m", timeMins: 7, pctUnder15m: 84.6 },
        { date: "2/7/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 94.1 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 92.6 },
        { label: "7d-AVG", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 90.2 },
        { label: "30d-AVG", timeToDial: "0h:6m", timeMins: 6, pctUnder15m: 86.5 },
      ],
    },
    "MAR 2026": {
      month: "MAR 2026",
      booked: 5,
      goal: 40,
      taken: 0,
      deals: 0,
      weeklyBreakdown: [
        { week: "W9", start: "3/2/26", end: "3/8/26", booked: 2, goal: 10 },
        { week: "W10", start: "3/9/26", end: "3/14/26", booked: 2, goal: 10 },
        { week: "W11", start: "3/15/26", end: "3/21/26", booked: 1, goal: 10 },
        { week: "W12", start: "3/22/26", end: "3/28/26", booked: 0, goal: 10 },
      ],
      dialingDays: [
        { date: "3/12/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 92.3 },
        { date: "3/13/2026", timeToDial: "0h:3m", timeMins: 3, pctUnder15m: 96.0 },
        { date: "3/14/2026", timeToDial: "35h:20m", timeMins: 2120, pctUnder15m: 14.3 },
        { date: "3/15/2026", timeToDial: "20h:10m", timeMins: 1210, pctUnder15m: 0.0 },
        { date: "3/16/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 97.0 },
        { date: "3/17/2026", timeToDial: "0h:3m", timeMins: 3, pctUnder15m: 100.0 },
        { date: "3/18/2026", timeToDial: "0h:0m", timeMins: 0, pctUnder15m: 0.0 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:3m", timeMins: 3, pctUnder15m: 98.5 },
        { label: "4d-AVG", timeToDial: "13h:58m", timeMins: 838, pctUnder15m: 50.8 },
        { label: "7d-AVG", timeToDial: "8h:0m", timeMins: 480, pctUnder15m: 71.4 },
        { label: "30d-AVG", timeToDial: "5h:50m", timeMins: 350, pctUnder15m: 64.2 },
      ],
    },
  },
  "allieandra-alexander": {
    "JAN 2026": {
      month: "JAN 2026",
      booked: 8,
      goal: 40,
      taken: 1,
      deals: 0,
      weeklyBreakdown: [
        { week: "W1", start: "1/5/26", end: "1/11/26", booked: 2, goal: 10 },
        { week: "W2", start: "1/12/26", end: "1/18/26", booked: 2, goal: 10 },
        { week: "W3", start: "1/19/26", end: "1/25/26", booked: 2, goal: 10 },
        { week: "W4", start: "1/26/26", end: "2/1/26", booked: 2, goal: 10 },
      ],
      dialingDays: [
        { date: "1/6/2026", timeToDial: "0h:3m", timeMins: 3, pctUnder15m: 96.0 },
        { date: "1/7/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 93.3 },
        { date: "1/8/2026", timeToDial: "0h:3m", timeMins: 3, pctUnder15m: 97.0 },
        { date: "1/9/2026", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 90.5 },
        { date: "1/10/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 94.1 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 94.1 },
        { label: "7d-AVG", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 94.2 },
        { label: "30d-AVG", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 93.8 },
      ],
    },
    "FEB 2026": {
      month: "FEB 2026",
      booked: 0,
      goal: 40,
      taken: 0,
      deals: 0,
      weeklyBreakdown: [
        { week: "W5", start: "2/2/26", end: "2/8/26", booked: 0, goal: 10 },
        { week: "W6", start: "2/9/26", end: "2/15/26", booked: 0, goal: 10 },
        { week: "W7", start: "2/16/26", end: "2/22/26", booked: 0, goal: 10 },
        { week: "W8", start: "2/23/26", end: "3/1/26", booked: 0, goal: 10 },
      ],
      dialingDays: [
        { date: "2/3/2026", timeToDial: "0h:3m", timeMins: 3, pctUnder15m: 97.5 },
        { date: "2/4/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 94.4 },
        { date: "2/5/2026", timeToDial: "0h:3m", timeMins: 3, pctUnder15m: 96.3 },
        { date: "2/6/2026", timeToDial: "0h:5m", timeMins: 5, pctUnder15m: 91.7 },
        { date: "2/7/2026", timeToDial: "0h:3m", timeMins: 3, pctUnder15m: 98.1 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:3m", timeMins: 3, pctUnder15m: 97.1 },
        { label: "7d-AVG", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 95.6 },
        { label: "30d-AVG", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 94.5 },
      ],
    },
    "MAR 2026": {
      month: "MAR 2026",
      booked: 13,
      goal: 40,
      taken: 5,
      deals: 0,
      weeklyBreakdown: [
        { week: "W9", start: "3/2/26", end: "3/8/26", booked: 4, goal: 10 },
        { week: "W10", start: "3/9/26", end: "3/14/26", booked: 4, goal: 10 },
        { week: "W11", start: "3/15/26", end: "3/21/26", booked: 4, goal: 10 },
        { week: "W12", start: "3/22/26", end: "3/28/26", booked: 1, goal: 10 },
      ],
      dialingDays: [
        { date: "3/12/2026", timeToDial: "0h:3m", timeMins: 3, pctUnder15m: 96.0 },
        { date: "3/13/2026", timeToDial: "0h:3m", timeMins: 3, pctUnder15m: 98.0 },
        { date: "3/14/2026", timeToDial: "42h:10m", timeMins: 2530, pctUnder15m: 12.5 },
        { date: "3/15/2026", timeToDial: "25h:30m", timeMins: 1530, pctUnder15m: 0.0 },
        { date: "3/16/2026", timeToDial: "0h:4m", timeMins: 4, pctUnder15m: 97.0 },
        { date: "3/17/2026", timeToDial: "0h:2m", timeMins: 2, pctUnder15m: 100.0 },
        { date: "3/18/2026", timeToDial: "0h:0m", timeMins: 0, pctUnder15m: 0.0 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:3m", timeMins: 3, pctUnder15m: 98.5 },
        { label: "4d-AVG", timeToDial: "16h:54m", timeMins: 1014, pctUnder15m: 51.4 },
        { label: "7d-AVG", timeToDial: "9h:45m", timeMins: 585, pctUnder15m: 57.6 },
        { label: "30d-AVG", timeToDial: "6h:15m", timeMins: 375, pctUnder15m: 57.6 },
      ],
    },
  },
  "teagan-brown": {
    "JAN 2026": {
      month: "JAN 2026",
      booked: 0,
      goal: 40,
      taken: 0,
      deals: 0,
      weeklyBreakdown: [
        { week: "W1", start: "1/5/26", end: "1/11/26", booked: 0, goal: 10 },
        { week: "W2", start: "1/12/26", end: "1/18/26", booked: 0, goal: 10 },
        { week: "W3", start: "1/19/26", end: "1/25/26", booked: 0, goal: 10 },
        { week: "W4", start: "1/26/26", end: "2/1/26", booked: 0, goal: 10 },
      ],
      dialingDays: [
        { date: "1/6/2026", timeToDial: "0h:12m", timeMins: 12, pctUnder15m: 68.0 },
        { date: "1/7/2026", timeToDial: "0h:9m", timeMins: 9, pctUnder15m: 77.8 },
        { date: "1/8/2026", timeToDial: "0h:11m", timeMins: 11, pctUnder15m: 72.7 },
        { date: "1/9/2026", timeToDial: "5h:45m", timeMins: 345, pctUnder15m: 30.0 },
        { date: "1/10/2026", timeToDial: "0h:8m", timeMins: 8, pctUnder15m: 82.4 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:10m", timeMins: 10, pctUnder15m: 77.6 },
        { label: "7d-AVG", timeToDial: "1h:16m", timeMins: 76, pctUnder15m: 66.2 },
        { label: "30d-AVG", timeToDial: "0h:55m", timeMins: 55, pctUnder15m: 63.5 },
      ],
    },
    "FEB 2026": {
      month: "FEB 2026",
      booked: 0,
      goal: 40,
      taken: 0,
      deals: 0,
      weeklyBreakdown: [
        { week: "W5", start: "2/2/26", end: "2/8/26", booked: 0, goal: 10 },
        { week: "W6", start: "2/9/26", end: "2/15/26", booked: 0, goal: 10 },
        { week: "W7", start: "2/16/26", end: "2/22/26", booked: 0, goal: 10 },
        { week: "W8", start: "2/23/26", end: "3/1/26", booked: 0, goal: 10 },
      ],
      dialingDays: [
        { date: "2/3/2026", timeToDial: "0h:10m", timeMins: 10, pctUnder15m: 73.0 },
        { date: "2/4/2026", timeToDial: "0h:8m", timeMins: 8, pctUnder15m: 80.0 },
        { date: "2/5/2026", timeToDial: "0h:11m", timeMins: 11, pctUnder15m: 72.7 },
        { date: "2/6/2026", timeToDial: "9h:15m", timeMins: 555, pctUnder15m: 25.0 },
        { date: "2/7/2026", timeToDial: "0h:9m", timeMins: 9, pctUnder15m: 78.6 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:10m", timeMins: 10, pctUnder15m: 75.7 },
        { label: "7d-AVG", timeToDial: "2h:5m", timeMins: 125, pctUnder15m: 65.9 },
        { label: "30d-AVG", timeToDial: "1h:30m", timeMins: 90, pctUnder15m: 63.0 },
      ],
    },
    "MAR 2026": {
      month: "MAR 2026",
      booked: 0,
      goal: 40,
      taken: 0,
      deals: 0,
      weeklyBreakdown: [
        { week: "W9", start: "3/2/26", end: "3/8/26", booked: 0, goal: 10 },
        { week: "W10", start: "3/9/26", end: "3/14/26", booked: 0, goal: 10 },
        { week: "W11", start: "3/15/26", end: "3/21/26", booked: 0, goal: 10 },
        { week: "W12", start: "3/22/26", end: "3/28/26", booked: 0, goal: 10 },
      ],
      dialingDays: [
        { date: "3/12/2026", timeToDial: "0h:11m", timeMins: 11, pctUnder15m: 72.7 },
        { date: "3/13/2026", timeToDial: "0h:9m", timeMins: 9, pctUnder15m: 77.8 },
        { date: "3/14/2026", timeToDial: "44h:0m", timeMins: 2640, pctUnder15m: 11.1 },
        { date: "3/15/2026", timeToDial: "28h:20m", timeMins: 1700, pctUnder15m: 0.0 },
        { date: "3/16/2026", timeToDial: "0h:10m", timeMins: 10, pctUnder15m: 80.0 },
        { date: "3/17/2026", timeToDial: "0h:8m", timeMins: 8, pctUnder15m: 87.5 },
        { date: "3/18/2026", timeToDial: "0h:0m", timeMins: 0, pctUnder15m: 0.0 },
      ],
      rollingAvg: [
        { label: "2d AVG", timeToDial: "0h:9m", timeMins: 9, pctUnder15m: 83.75 },
        { label: "4d-AVG", timeToDial: "18h:9m", timeMins: 1089, pctUnder15m: 42.3 },
        { label: "7d-AVG", timeToDial: "10h:25m", timeMins: 625, pctUnder15m: 61.3 },
        { label: "30d-AVG", timeToDial: "7h:40m", timeMins: 460, pctUnder15m: 55.8 },
      ],
    },
  },
};

export const AVAILABLE_MONTHS = ["JAN 2026", "FEB 2026", "MAR 2026"];
