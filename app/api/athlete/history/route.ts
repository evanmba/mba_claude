import { NextResponse } from "next/server";
import { getHistory } from "@/lib/athletes-store";
import { normalizePhone } from "@/lib/athletes";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = normalizePhone(searchParams.get("phone") ?? "");
  if (phone.length < 10) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid 10-digit phone number." },
      { status: 400 },
    );
  }
  try {
    const history = await getHistory(phone);
    return NextResponse.json({ ok: true, history });
  } catch (err) {
    console.error("[history] failed:", err);
    return NextResponse.json({ ok: false, error: "Could not load history." }, { status: 500 });
  }
}
