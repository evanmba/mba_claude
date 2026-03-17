import { NextResponse } from "next/server";
import { getInstagramProfile, getInstagramMedia, getInstagramInsights, isInstagramConnected } from "@/lib/social/instagram";

export async function GET() {
  if (!isInstagramConnected()) {
    return NextResponse.json({ connected: false, profile: null, media: [], insights: [] });
  }

  const [profile, media, insights] = await Promise.all([
    getInstagramProfile(),
    getInstagramMedia(12),
    getInstagramInsights(),
  ]);

  return NextResponse.json({ connected: true, profile, media, insights });
}
