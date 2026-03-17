const BASE = "https://graph.facebook.com/v19.0";
const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

export function isInstagramConnected() {
  return !!(TOKEN && IG_ID);
}

export interface InstagramProfile {
  id: string;
  name: string;
  username: string;
  biography: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url: string;
  website: string;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  permalink: string;
}

export interface InstagramInsightMetric {
  name: string;
  period: string;
  values: { value: number; end_time: string }[];
}

export async function getInstagramProfile(): Promise<InstagramProfile | null> {
  if (!isInstagramConnected()) return null;
  try {
    const res = await fetch(
      `${BASE}/${IG_ID}?fields=id,name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token=${TOKEN}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getInstagramMedia(limit = 12): Promise<InstagramMedia[]> {
  if (!isInstagramConnected()) return [];
  try {
    const res = await fetch(
      `${BASE}/${IG_ID}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=${limit}&access_token=${TOKEN}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function getInstagramInsights(): Promise<InstagramInsightMetric[]> {
  if (!isInstagramConnected()) return [];
  try {
    const res = await fetch(
      `${BASE}/${IG_ID}/insights?metric=reach,impressions,follower_count&period=day&since=${Math.floor(Date.now() / 1000) - 7 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${TOKEN}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}
