import { NextResponse } from "next/server";
import { getAllAthletes } from "@/lib/athletes-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const athletes = await getAllAthletes();
    return NextResponse.json({ ok: true, athletes, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[athletes] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
