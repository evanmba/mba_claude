import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Coverage persistence — tries two backends in order:
 *
 * 1. Google Apps Script Web App  (set COVERAGE_SCRIPT_URL in .env.local)
 *    → shared across all devices/users, stored in your Google Sheet
 *    Setup:
 *      a) Open your Google Sheet → Extensions → Apps Script
 *      b) Replace all code with the script below → Save
 *      c) Deploy → New Deployment → Web App
 *         Execute as: Me  |  Who has access: Anyone
 *      d) Copy the deployment URL → add to .env.local:
 *         COVERAGE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec
 *
 *    ---- paste into Apps Script editor ----
 *    function doGet() {
 *      var sheet = SpreadsheetApp.getActive().getSheetByName('COVERAGE');
 *      if (!sheet) return ContentService.createTextOutput('[]');
 *      var val = sheet.getRange('A1').getValue();
 *      return ContentService.createTextOutput(val || '[]')
 *        .setMimeType(ContentService.MimeType.JSON);
 *    }
 *    function doPost(e) {
 *      var ss = SpreadsheetApp.getActive();
 *      var sheet = ss.getSheetByName('COVERAGE') || ss.insertSheet('COVERAGE');
 *      sheet.getRange('A1').setValue(e.postData.contents);
 *      return ContentService.createTextOutput('{"ok":true}')
 *        .setMimeType(ContentService.MimeType.JSON);
 *    }
 *    ----------------------------------------
 *
 * 2. Local filesystem fallback  (data/coverage.json)
 *    → works when all users hit the same server instance
 */

const SCRIPT_URL = process.env.COVERAGE_SCRIPT_URL ?? "";
const DATA_FILE  = path.join(process.cwd(), "data", "coverage.json");

// ── Google Apps Script backend ─────────────────────────────────────────────

async function scriptGet(): Promise<unknown[]> {
  const res = await fetch(SCRIPT_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Apps Script GET ${res.status}`);
  return res.json();
}

async function scriptPost(blocks: unknown): Promise<void> {
  // Apps Script doPost receives via e.postData — send as plain text body
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(blocks),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Apps Script POST ${res.status}`);
}

// ── Filesystem fallback ────────────────────────────────────────────────────

function fsGet(): unknown[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch { return []; }
}

function fsPost(blocks: unknown): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(blocks), "utf-8");
}

// ── Route handlers ─────────────────────────────────────────────────────────

export async function GET() {
  try {
    const data = SCRIPT_URL ? await scriptGet() : fsGet();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[coverage] GET failed:", err);
    return NextResponse.json(fsGet());
  }
}

export async function POST(req: Request) {
  try {
    const blocks = await req.json();
    if (SCRIPT_URL) {
      await scriptPost(blocks);
    } else {
      fsPost(blocks);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[coverage] POST failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
