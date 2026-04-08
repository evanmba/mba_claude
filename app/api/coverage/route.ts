import { NextResponse } from "next/server";

// Upstash Redis — set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in Vercel env vars.
// Connect via: Vercel → Storage → Upstash → Create Redis DB → auto-injects both vars.

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL   ?? "";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
const REDIS_KEY   = "mba:coverage";

async function redisGet(): Promise<unknown[]> {
  const res = await fetch(`${REDIS_URL}/get/${REDIS_KEY}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis GET ${res.status}`);
  const { result } = await res.json();
  return result ? JSON.parse(result) : [];
}

async function redisSet(blocks: unknown): Promise<void> {
  const res = await fetch(`${REDIS_URL}/set/${REDIS_KEY}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value: JSON.stringify(blocks) }),
  });
  if (!res.ok) throw new Error(`Redis SET ${res.status}`);
}

export async function GET() {
  try {
    const data = await redisGet();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[coverage] GET failed:", err);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const blocks = await req.json();
    await redisSet(blocks);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[coverage] POST failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
