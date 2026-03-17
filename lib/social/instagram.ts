const BASE = "https://graph.facebook.com/v19.0";
const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

// Cache the resolved IG user ID for the process lifetime
let cachedIgId: string | null | undefined = undefined;

export function isInstagramConnected() {
  return !!TOKEN;
}

async function getIgUserId(): Promise<string | null> {
  if (cachedIgId !== undefined) return cachedIgId;
  // Prefer explicit env var, fall back to /me lookup
  if (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
    cachedIgId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    return cachedIgId;
  }
  try {
    const res = await fetch(`${BASE}/me?fields=id&access_token=${TOKEN}`);
    const data = await res.json();
    if (!res.ok) {
      console.error("[Instagram] /me error:", JSON.stringify(data));
      cachedIgId = null;
      return null;
    }
    cachedIgId = data.id ?? null;
    return cachedIgId as string | null;
  } catch (e) {
    console.error("[Instagram] /me fetch failed:", e);
    cachedIgId = null;
    return null;
  }
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
  const igId = await getIgUserId();
  if (!igId) return null;
  try {
    const res = await fetch(
      `${BASE}/${igId}?fields=id,name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token=${TOKEN}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!res.ok) { console.error("[Instagram] profile error:", JSON.stringify(data)); return null; }
    return data;
  } catch (e) {
    console.error("[Instagram] profile fetch failed:", e);
    return null;
  }
}

export async function getInstagramMedia(limit = 12): Promise<InstagramMedia[]> {
  if (!isInstagramConnected()) return [];
  const igId = await getIgUserId();
  if (!igId) return [];
  try {
    const res = await fetch(
      `${BASE}/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=${limit}&access_token=${TOKEN}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!res.ok) { console.error("[Instagram] media error:", JSON.stringify(data)); return []; }
    return data.data ?? [];
  } catch (e) {
    console.error("[Instagram] media fetch failed:", e);
    return [];
  }
}

export async function getInstagramInsights(): Promise<InstagramInsightMetric[]> {
  if (!isInstagramConnected()) return [];
  const igId = await getIgUserId();
  if (!igId) return [];
  try {
    const res = await fetch(
      `${BASE}/${igId}/insights?metric=reach,impressions,follower_count&period=day&since=${Math.floor(Date.now() / 1000) - 7 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${TOKEN}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}
