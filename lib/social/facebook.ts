const BASE = "https://graph.facebook.com/v19.0";
const TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const PAGE_ID = process.env.FACEBOOK_PAGE_ID;

export function isFacebookConnected() {
  return !!(TOKEN && PAGE_ID);
}

export interface FacebookPage {
  id: string;
  name: string;
  fan_count: number;
  followers_count: number;
  picture: { data: { url: string } };
  about?: string;
  website?: string;
}

export interface FacebookPost {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  full_picture?: string;
  permalink_url: string;
  likes: { summary: { total_count: number } };
  comments: { summary: { total_count: number } };
  shares?: { count: number };
}

export async function getFacebookPage(): Promise<FacebookPage | null> {
  if (!isFacebookConnected()) return null;
  try {
    const res = await fetch(
      `${BASE}/${PAGE_ID}?fields=id,name,fan_count,followers_count,picture,about,website&access_token=${TOKEN}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getFacebookPosts(limit = 10): Promise<FacebookPost[]> {
  if (!isFacebookConnected()) return [];
  try {
    const res = await fetch(
      `${BASE}/${PAGE_ID}/posts?fields=id,message,story,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares&limit=${limit}&access_token=${TOKEN}`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function getFacebookPageInsights(): Promise<{ metric: string; value: number }[]> {
  if (!isFacebookConnected()) return [];
  try {
    const res = await fetch(
      `${BASE}/${PAGE_ID}/insights?metric=page_impressions_unique,page_post_engagements,page_fans&period=week&access_token=${TOKEN}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []).map((item: { name: string; values: { value: number }[] }) => ({
      metric: item.name,
      value: item.values?.[item.values.length - 1]?.value ?? 0,
    }));
  } catch {
    return [];
  }
}
