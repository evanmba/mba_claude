// TikTok Content Posting API v2
// Note: Requires TikTok for Developers app + business verification + app review.
// See: https://developers.tiktok.com/doc/overview

const ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;
const OPEN_ID = process.env.TIKTOK_OPEN_ID;

export function isTikTokConnected() {
  return !!(ACCESS_TOKEN && OPEN_ID);
}

export interface TikTokUser {
  open_id: string;
  display_name: string;
  avatar_url: string;
  follower_count: number;
  following_count: number;
  likes_count: number;
  video_count: number;
  profile_deep_link: string;
}

export interface TikTokVideo {
  id: string;
  title: string;
  cover_image_url: string;
  share_url: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  create_time: number; // unix timestamp
  duration: number; // seconds
}

export async function getTikTokUser(): Promise<TikTokUser | null> {
  if (!isTikTokConnected()) return null;
  try {
    const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count,profile_deep_link", {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.user ?? null;
  } catch {
    return null;
  }
}

export async function getTikTokVideos(limit = 10): Promise<TikTokVideo[]> {
  if (!isTikTokConnected()) return [];
  try {
    const res = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,share_url,view_count,like_count,comment_count,share_count,create_time,duration", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: limit }),
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.videos ?? [];
  } catch {
    return [];
  }
}
