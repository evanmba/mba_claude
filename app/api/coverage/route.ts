import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "coverage.json");

function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function GET() {
  try {
    ensureDir();
    if (!fs.existsSync(DATA_FILE)) return NextResponse.json([]);
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    ensureDir();
    const blocks = await req.json();
    fs.writeFileSync(DATA_FILE, JSON.stringify(blocks), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[coverage] write failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
