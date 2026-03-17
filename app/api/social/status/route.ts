import { NextResponse } from "next/server";
import { isInstagramConnected } from "@/lib/social/instagram";
import { isYouTubeConnected } from "@/lib/social/youtube";
import { isFacebookConnected } from "@/lib/social/facebook";
import { isTikTokConnected } from "@/lib/social/tiktok";

export async function GET() {
  return NextResponse.json({
    instagram: isInstagramConnected(),
    youtube: isYouTubeConnected(),
    facebook: isFacebookConnected(),
    tiktok: isTikTokConnected(),
  });
}
