import { NextResponse } from "next/server";
import { addEntry, getHistory } from "@/lib/athletes-store";
import {
  normalizePhone,
  METRICS,
  type AthleteEntry,
  type MetricKey,
} from "@/lib/athletes";

export const runtime = "nodejs";

interface CheckInBody {
  phone?: string;
  name?: string;
  armVelo?: unknown;
  exitVelo?: unknown;
  sixtyYard?: unknown;
  fiveTenFive?: unknown;
}

function parseMetric(value: unknown): number | null {
  const n = typeof value === "string" ? parseFloat(value) : (value as number);
  if (typeof n !== "number" || isNaN(n) || !isFinite(n) || n <= 0) return null;
  return n;
}

export async function POST(req: Request) {
  let body: CheckInBody;
  try {
    body = (await req.json()) as CheckInBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const phone = normalizePhone(body.phone ?? "");
  if (phone.length < 10) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid 10-digit phone number." },
      { status: 400 },
    );
  }

  const values: Partial<Record<MetricKey, number>> = {};
  for (const m of METRICS) {
    const parsed = parseMetric(body[m.key]);
    if (parsed === null) {
      return NextResponse.json(
        { ok: false, error: `Please enter a valid ${m.label} (${m.unit}).` },
        { status: 400 },
      );
    }
    values[m.key] = parsed;
  }

  const entry: AthleteEntry = {
    submittedAt: new Date().toISOString(),
    phone,
    name: (body.name ?? "").trim().slice(0, 60),
    armVelo: values.armVelo!,
    exitVelo: values.exitVelo!,
    sixtyYard: values.sixtyYard!,
    fiveTenFive: values.fiveTenFive!,
  };

  try {
    await addEntry(entry);
    const history = await getHistory(phone);
    return NextResponse.json({ ok: true, history });
  } catch (err) {
    console.error("[checkin] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not save your check-in. Please try again." },
      { status: 500 },
    );
  }
}
