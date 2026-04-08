import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const BLOB_PATH = "mba-coverage.json";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: BLOB_PATH });
    if (blobs.length === 0) return NextResponse.json([]);
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json([]);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error("[coverage] GET failed:", err);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const blocks = await req.json();
    await put(BLOB_PATH, JSON.stringify(blocks), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[coverage] POST failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
