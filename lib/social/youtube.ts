const BASE = "https://www.googleapis.com/youtube/v3";
const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID ?? "UCjfSfoqQxbCLU6P6BKr8CdA";

export function isYouTubeConnected() {
  return !!API_KEY;
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  customUrl: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
}

export async function getYouTubeChannel(): Promise<YouTubeChannel | null> {
  if (!isYouTubeConnected()) return null;
  try {
    const res = await fetch(
      `${BASE}/channels?part=snippet,statistics&id=${CHANNEL_ID}&key=${API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;
    return {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      customUrl: item.snippet.customUrl,
      thumbnailUrl: item.snippet.thumbnails?.high?.url ?? "",
      subscriberCount: parseInt(item.statistics.subscriberCount ?? "0", 10),
      videoCount: parseInt(item.statistics.videoCount ?? "0", 10),
      viewCount: parseInt(item.statistics.viewCount ?? "0", 10),
    };
  } catch {
    return null;
  }
}

export async function getYouTubeVideos(limit = 10): Promise<YouTubeVideo[]> {
  if (!isYouTubeConnected()) return [];
  try {
    // First, get video IDs from search
    const searchRes = await fetch(
      `${BASE}/search?part=snippet&channelId=${CHANNEL_ID}&order=date&maxResults=${limit}&type=video&key=${API_KEY}`,
      { next: { revalidate: 900 } }
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const ids: string[] = (searchData.items ?? []).map((i: { id: { videoId: string } }) => i.id.videoId);
    if (ids.length === 0) return [];

    // Fetch detailed stats
    const videosRes = await fetch(
      `${BASE}/videos?part=snippet,statistics,contentDetails&id=${ids.join(",")}&key=${API_KEY}`,
      { next: { revalidate: 900 } }
    );
    if (!videosRes.ok) return [];
    const videosData = await videosRes.json();

    return (videosData.items ?? []).map((item: {
      id: string;
      snippet: { title: string; description: string; thumbnails: { high?: { url: string }; medium?: { url: string } }; publishedAt: string };
      statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
      contentDetails: { duration: string };
    }) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.medium?.url ?? "",
      publishedAt: item.snippet.publishedAt,
      viewCount: parseInt(item.statistics.viewCount ?? "0", 10),
      likeCount: parseInt(item.statistics.likeCount ?? "0", 10),
      commentCount: parseInt(item.statistics.commentCount ?? "0", 10),
      duration: item.contentDetails.duration, // ISO 8601 e.g. PT4M13S
    }));
  } catch {
    return [];
  }
}

/** Convert ISO 8601 duration (PT4M13S) to readable string (4:13) */
export function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const h = parseInt(match[1] ?? "0", 10);
  const m = parseInt(match[2] ?? "0", 10);
  const s = parseInt(match[3] ?? "0", 10);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Format large numbers (1200000 → 1.2M) */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
