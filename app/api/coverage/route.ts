import { NextResponse } from "next/server";
import fs from "fs";

const FILE = "/tmp/mba-coverage.json";

export async function GET() {
  try {
    if (!fs.existsSync(FILE)) return NextResponse.json([]);
    return NextResponse.json(JSON.parse(fs.readFileSync(FILE, "utf-8")));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(await req.json()), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[coverage] write failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
