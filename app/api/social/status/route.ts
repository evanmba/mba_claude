import { NextResponse } from "next/server";
import { isInstagramConnected } from "@/lib/social/instagram";
import { isYouTubeConnected } from "@/lib/social/youtube";

export async function GET() {
  return NextResponse.json({
    instagram: isInstagramConnected(),
    youtube: isYouTubeConnected(),
  });
}
