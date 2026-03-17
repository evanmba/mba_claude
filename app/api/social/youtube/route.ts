import { NextResponse } from "next/server";
import { getYouTubeChannel, getYouTubeVideos, isYouTubeConnected } from "@/lib/social/youtube";

export async function GET() {
  if (!isYouTubeConnected()) {
    return NextResponse.json({ connected: false, channel: null, videos: [] });
  }

  const [channel, videos] = await Promise.all([
    getYouTubeChannel(),
    getYouTubeVideos(10),
  ]);

  return NextResponse.json({ connected: true, channel, videos });
}
