import { NextResponse } from "next/server";
import { getTikTokUser, getTikTokVideos, isTikTokConnected } from "@/lib/social/tiktok";

export async function GET() {
  if (!isTikTokConnected()) {
    return NextResponse.json({ connected: false, user: null, videos: [] });
  }

  const [user, videos] = await Promise.all([
    getTikTokUser(),
    getTikTokVideos(10),
  ]);

  return NextResponse.json({ connected: true, user, videos });
}
