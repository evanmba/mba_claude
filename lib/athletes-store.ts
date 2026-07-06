import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import {
  normalizePhone,
  computeWeeks,
  type AthleteEntry,
  type AthleteHistory,
} from "./athletes";

// Server-only storage layer for athlete check-ins. Appends to a Google Sheet
// when configured (see ATHLETE_CHECKIN_SETUP.md), otherwise falls back to a
// local JSON file so the feature still works in development. This module must
// only be imported from server code (route handlers / server components) —
// it uses Node built-ins (crypto, fs).

// ─── Row <-> Entry (Google Sheet column order) ──────────────────────────────
//
// Columns: A submittedAt | B phone | C name | D armVelo | E exitVelo
//          F sixtyYard | G fiveTenFive | H bodyWeight

const SHEET_COLUMNS = "A:H";
export const SHEET_HEADER = [
  "submittedAt",
  "phone",
  "name",
  "armVelo",
  "exitVelo",
  "sixtyYard",
  "fiveTenFive",
  "bodyWeight",
];

function entryToRow(e: AthleteEntry): (string | number)[] {
  // Blank optional metrics (0) are written as "" so the sheet shows an empty
  // cell rather than a misleading 0.
  const opt = (v: number) => (v > 0 ? v : "");
  return [
    e.submittedAt,
    e.phone,
    e.name,
    opt(e.armVelo),
    opt(e.exitVelo),
    opt(e.sixtyYard),
    e.fiveTenFive,
    e.bodyWeight,
  ];
}

// A cell can arrive as a string (CSV / Sheets API) or a number / Date
// (Apps Script getValues()), so coerce defensively.
function toStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return String(v ?? "").trim();
}
function toNum(v: unknown): number {
  return parseFloat(toStr(v)) || 0;
}

function rowToEntry(row: unknown[]): AthleteEntry | null {
  const submittedAt = toStr(row[0]);
  // Skip header / blank / malformed rows.
  if (!submittedAt || isNaN(new Date(submittedAt).getTime())) return null;
  const phone = normalizePhone(toStr(row[1]));
  if (phone.length < 7) return null;
  return {
    submittedAt,
    phone,
    name: toStr(row[2]),
    armVelo: toNum(row[3]),
    exitVelo: toNum(row[4]),
    sixtyYard: toNum(row[5]),
    fiveTenFive: toNum(row[6]),
    bodyWeight: toNum(row[7]),
  };
}

// ─── Google service-account auth (no external deps) ─────────────────────────

interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
}

function getServiceAccount(): ServiceAccount | null {
  // Preferred: full JSON key file contents in one env var.
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (parsed.client_email && parsed.private_key) {
        return { clientEmail: parsed.client_email, privateKey: parsed.private_key };
      }
    } catch {
      // fall through to discrete vars
    }
  }
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (clientEmail && rawKey) {
    // Env vars usually store the key with literal "\n" sequences.
    return { clientEmail, privateKey: rawKey.replace(/\\n/g, "\n") };
  }
  return null;
}

function getSheetConfig() {
  const sheetId = process.env.ATHLETE_SHEET_ID;
  const tab = process.env.ATHLETE_SHEET_TAB || "CheckIns";
  const sa = getServiceAccount();
  if (!sheetId || !sa) return null;
  return { sheetId, tab, sa };
}

// ─── Apps Script Web App backend (simplest: one URL, no key file) ────────────

function getWebAppConfig() {
  const url = process.env.ATHLETE_WEBAPP_URL;
  if (!url) return null;
  return { url, token: process.env.ATHLETE_WEBAPP_TOKEN || "" };
}

/** True when any durable backend (web app OR service account) is configured. */
export function isStorageConfigured(): boolean {
  return getWebAppConfig() !== null || getSheetConfig() !== null;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const b64 = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const signingInput = `${b64(header)}.${b64(claims)}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(sa.privateKey).toString("base64url");
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${detail}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, exp: now + (json.expires_in ?? 3600) };
  return json.access_token;
}

// ─── Google Sheets storage backend ──────────────────────────────────────────

async function sheetAppend(
  cfg: NonNullable<ReturnType<typeof getSheetConfig>>,
  entry: AthleteEntry,
): Promise<void> {
  const token = await getAccessToken(cfg.sa);
  const range = encodeURIComponent(`${cfg.tab}!${SHEET_COLUMNS}`);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${cfg.sheetId}` +
    `/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [entryToRow(entry)] }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Sheet append failed (${res.status}): ${detail}`);
  }
}

async function sheetReadAll(
  cfg: NonNullable<ReturnType<typeof getSheetConfig>>,
): Promise<AthleteEntry[]> {
  const token = await getAccessToken(cfg.sa);
  const range = encodeURIComponent(`${cfg.tab}!${SHEET_COLUMNS}`);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${cfg.sheetId}/values/${range}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Sheet read failed (${res.status}): ${detail}`);
  }
  const json = (await res.json()) as { values?: string[][] };
  const rows = json.values ?? [];
  return rows.map(rowToEntry).filter((e): e is AthleteEntry => e !== null);
}

async function webAppAppend(
  web: NonNullable<ReturnType<typeof getWebAppConfig>>,
  entry: AthleteEntry,
): Promise<void> {
  const res = await fetch(web.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: web.token, row: entryToRow(entry) }),
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Web app append failed (${res.status}): ${detail}`);
  }
  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!json.ok) throw new Error(`Web app append rejected: ${json.error ?? "unknown"}`);
}

async function webAppReadAll(
  web: NonNullable<ReturnType<typeof getWebAppConfig>>,
): Promise<AthleteEntry[]> {
  const u = new URL(web.url);
  if (web.token) u.searchParams.set("token", web.token);
  const res = await fetch(u.toString(), { redirect: "follow", cache: "no-store" });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Web app read failed (${res.status}): ${detail}`);
  }
  const json = (await res.json()) as { ok?: boolean; values?: unknown[][]; error?: string };
  if (!json.ok) throw new Error(`Web app read rejected: ${json.error ?? "unknown"}`);
  return (json.values ?? []).map(rowToEntry).filter((e): e is AthleteEntry => e !== null);
}

// ─── Local file fallback (dev / no credentials) ─────────────────────────────
//
// Used only when Google Sheets is not configured, so the feature still works
// end-to-end locally. Note: on read-only serverless filesystems writes fail —
// that is expected; configure the Sheet for production.

const FILE_PATH = path.join(process.cwd(), ".data", "athletes.json");

async function fileReadAll(): Promise<AthleteEntry[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as AthleteEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function fileAppend(entry: AthleteEntry): Promise<void> {
  const all = await fileReadAll();
  all.push(entry);
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(all, null, 2), "utf8");
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Append a new check-in entry to the active storage backend. */
export async function addEntry(entry: AthleteEntry): Promise<void> {
  const web = getWebAppConfig();
  if (web) {
    await webAppAppend(web, entry);
    return;
  }
  const cfg = getSheetConfig();
  if (cfg) {
    await sheetAppend(cfg, entry);
    return;
  }
  console.warn(
    "[athletes] No durable storage configured — writing to local .data/athletes.json (not durable on serverless).",
  );
  await fileAppend(entry);
}

async function readAll(): Promise<AthleteEntry[]> {
  const web = getWebAppConfig();
  if (web) return webAppReadAll(web);
  const cfg = getSheetConfig();
  return cfg ? sheetReadAll(cfg) : fileReadAll();
}

/** Full history for one athlete, keyed by phone, with program weeks computed. */
export async function getHistory(rawPhone: string): Promise<AthleteHistory> {
  const phone = normalizePhone(rawPhone);
  const all = await readAll();
  const mine = all.filter((e) => e.phone === phone);
  const entries = computeWeeks(mine);
  // Prefer the most recently supplied name.
  const name = [...entries].reverse().find((e) => e.name)?.name ?? "";
  return { phone, name, entries };
}

/** Grouped view of every athlete — for the coach roster. */
export async function getAllAthletes(): Promise<AthleteHistory[]> {
  const all = await readAll();
  const byPhone = new Map<string, AthleteEntry[]>();
  for (const e of all) {
    const list = byPhone.get(e.phone) ?? [];
    list.push(e);
    byPhone.set(e.phone, list);
  }
  const athletes: AthleteHistory[] = [];
  for (const [phone, list] of byPhone) {
    const entries = computeWeeks(list);
    const name = [...entries].reverse().find((e) => e.name)?.name ?? "";
    athletes.push({ phone, name, entries });
  }
  // Most recently active first.
  athletes.sort((a, b) => {
    const la = a.entries[a.entries.length - 1]?.submittedAt ?? "";
    const lb = b.entries[b.entries.length - 1]?.submittedAt ?? "";
    return lb.localeCompare(la);
  });
  return athletes;
}
