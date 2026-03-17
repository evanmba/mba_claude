import { NextResponse } from "next/server";
import { getFacebookPage, getFacebookPosts, getFacebookPageInsights, isFacebookConnected } from "@/lib/social/facebook";

export async function GET() {
  if (!isFacebookConnected()) {
    return NextResponse.json({ connected: false, page: null, posts: [], insights: [] });
  }

  const [page, posts, insights] = await Promise.all([
    getFacebookPage(),
    getFacebookPosts(10),
    getFacebookPageInsights(),
  ]);

  return NextResponse.json({ connected: true, page, posts, insights });
}
