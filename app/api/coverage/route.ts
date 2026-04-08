import { NextResponse } from "next/server";
import fs from "fs";

// ─── Upstash Redis (primary — shared across all instances/devices) ────────────
// Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in your env vars.
// Free tier at console.upstash.com is more than sufficient.

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

// ─── Filesystem fallback (single-server deployments without Redis) ────────────

const FILE = "/tmp/mba-coverage.json";

function fsGet(): unknown[] {
  try {
    if (!fs.existsSync(FILE)) return [];
    return JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch { return []; }
}

function fsSet(blocks: unknown): void {
  fs.writeFileSync(FILE, JSON.stringify(blocks), "utf-8");
}

// ─── Route handlers ───────────────────────────────────────────────────────────

const useRedis = !!(REDIS_URL && REDIS_TOKEN);

export async function GET() {
  try {
    const data = useRedis ? await redisGet() : fsGet();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[coverage] GET failed:", err);
    return NextResponse.json(fsGet()); // Redis failed → local fallback
  }
}

export async function POST(req: Request) {
  try {
    const blocks = await req.json();
    if (useRedis) {
      await redisSet(blocks);
    } else {
      fsSet(blocks);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[coverage] POST failed:", err);
    // Try filesystem as last resort
    try { fsSet(await req.clone().json()); } catch {}
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
