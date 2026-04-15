// Meta Marketing API — ad spend by campaign / ad set / ad
// Docs: https://developers.facebook.com/docs/marketing-api/insights

export type MetaLevel = "campaign" | "adset" | "ad";

export interface MetaInsightRow {
  id: string;
  name: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;
  reach: number;
  status: string;
}

export interface MetaSpendData {
  rows: MetaInsightRow[];
  level: MetaLevel;
  datePreset: string;
  error?: string;
}

const GRAPH = "https://graph.facebook.com/v21.0";

// Cached fetch (5 min) — used by the legacy fetchMetaSpend
async function fetchAll(url: string): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let next: string | null = url;
  while (next) {
    const res = await fetch(next, { next: { revalidate: 300 } } as RequestInit);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error((err?.error as Record<string, unknown>)?.message as string ?? `HTTP ${res.status}`);
    }
    const json = await res.json() as { data: Record<string, unknown>[]; paging?: { next?: string } };
    all.push(...(json.data ?? []));
    next = json.paging?.next ?? null;
  }
  return all;
}

// Fresh fetch — no caching so spend always matches Meta Ads Manager
async function fetchAllFresh(url: string): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let next: string | null = url;
  while (next) {
    const res = await fetch(next, { cache: "no-store" } as RequestInit);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error((err?.error as Record<string, unknown>)?.message as string ?? `HTTP ${res.status}`);
    }
    const json = await res.json() as { data: Record<string, unknown>[]; paging?: { next?: string } };
    all.push(...(json.data ?? []));
    next = json.paging?.next ?? null;
  }
  return all;
}

export async function fetchMetaSpend(
  level: MetaLevel = "adset",
  datePreset = "this_month",
): Promise<MetaSpendData> {
  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  if (!token || !accountId) {
    return { rows: [], level, datePreset, error: "META_ADS_ACCESS_TOKEN or META_ADS_ACCOUNT_ID not set" };
  }
  const acct      = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const nameField = level === "campaign" ? "campaign_name" : level === "adset" ? "adset_name" : "ad_name";
  const idField   = level === "campaign" ? "campaign_id"   : level === "adset" ? "adset_id"   : "ad_id";
  const fields    = [idField, nameField, "campaign_name", "spend", "impressions", "reach", "clicks", "cpm", "cpc", "ctr"].join(",");
  const url       = `${GRAPH}/${acct}/insights?level=${level}&date_preset=${datePreset}&fields=${fields}&limit=500&access_token=${token}`;
  try {
    const raw = await fetchAll(url);
    let statusMap = new Map<string, string>();
    try {
      const endpoint  = level === "campaign" ? "campaigns" : level === "adset" ? "adsets" : "ads";
      const statusUrl = `${GRAPH}/${acct}/${endpoint}?fields=id,name,status,effective_status&limit=500&access_token=${token}`;
      const statusRows = await fetchAll(statusUrl);
      statusMap = new Map(statusRows.map((r) => [r.id as string, (r.effective_status ?? r.status ?? "") as string]));
    } catch { /* optional */ }
    const rows: MetaInsightRow[] = raw.map((r) => ({
      id:           (r[idField]   ?? "") as string,
      name:         (r[nameField] ?? "") as string,
      campaignName: (r["campaign_name"] ?? "") as string,
      spend:        parseFloat((r["spend"] as string) ?? "0"),
      impressions:  parseInt((r["impressions"] as string) ?? "0", 10),
      reach:        parseInt((r["reach"] as string) ?? "0", 10),
      clicks:       parseInt((r["clicks"] as string) ?? "0", 10),
      cpm:          parseFloat((r["cpm"] as string) ?? "0"),
      cpc:          parseFloat((r["cpc"] as string) ?? "0"),
      ctr:          parseFloat((r["ctr"] as string) ?? "0"),
      status:       statusMap.get((r[idField] as string) ?? "") ?? "UNKNOWN",
    })).filter((r) => r.name);
    return { rows, level, datePreset };
  } catch (err) {
    return { rows: [], level, datePreset, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Hierarchy fetchers (for Grade Breakdown drill-down) ─────────────────────

export interface MetaAdSetRow {
  id: string;
  name: string;
  spend: number;
  campaignId: string;
  campaignName: string;
}

export interface MetaAdRow {
  id: string;
  name: string;
  spend: number;
  adSetId: string;
  adSetName: string;
  campaignId: string;
  campaignName: string;
}

export async function fetchCampaignsWithSpend(window: AdWindow): Promise<MetaInsightRow[]> {
  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  if (!token || !accountId) return [];
  const acct     = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const datePart = windowToDateParam(window);
  const url      = `${GRAPH}/${acct}/insights?level=campaign&${datePart}&fields=campaign_id,campaign_name,spend&limit=500&access_token=${token}`;
  try {
    const raw = await fetchAllFresh(url);
    return raw
      .filter((r) => parseFloat((r["spend"] as string) ?? "0") > 0)
      .map((r) => ({
        id:           (r["campaign_id"]   as string) ?? "",
        name:         (r["campaign_name"] as string) ?? "",
        campaignName: (r["campaign_name"] as string) ?? "",
        spend:        parseFloat((r["spend"] as string) ?? "0"),
        impressions: 0, reach: 0, clicks: 0, cpm: 0, cpc: 0, ctr: 0, status: "",
      }))
      .filter((r) => r.name);
  } catch { return []; }
}

export async function fetchAdSetsForCampaign(
  campaignId: string,
  window: AdWindow,
): Promise<MetaAdSetRow[]> {
  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  if (!token || !accountId) return [];
  const acct      = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const datePart  = windowToDateParam(window);
  const filtering = encodeURIComponent(JSON.stringify([{ field: "campaign.id", operator: "EQUAL", value: campaignId }]));
  const url       = `${GRAPH}/${acct}/insights?level=adset&${datePart}&fields=adset_id,adset_name,campaign_id,campaign_name,spend&filtering=${filtering}&limit=500&access_token=${token}`;
  try {
    const raw = await fetchAllFresh(url);
    return raw
      .filter((r) => parseFloat((r["spend"] as string) ?? "0") > 0)
      .map((r) => ({
        id:           (r["adset_id"]     as string) ?? "",
        name:         (r["adset_name"]   as string) ?? "",
        campaignId:   (r["campaign_id"]  as string) ?? "",
        campaignName: (r["campaign_name"]as string) ?? "",
        spend:        parseFloat((r["spend"] as string) ?? "0"),
      }))
      .filter((r) => r.name);
  } catch { return []; }
}

/**
 * Returns a map of adSetId → effective_status for all ad sets in a campaign.
 * effective_status accounts for parent campaign status (e.g. CAMPAIGN_PAUSED).
 */
export async function fetchAdSetEffectiveStatuses(
  campaignId: string,
): Promise<Map<string, string>> {
  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  if (!token || !accountId) return new Map();
  const acct = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const url  = `${GRAPH}/${campaignId}/adsets?fields=id,effective_status&limit=500&access_token=${token}`;
  try {
    const raw = await fetchAllFresh(url);
    return new Map(raw.map((r) => [r["id"] as string, (r["effective_status"] ?? "UNKNOWN") as string]));
  } catch { return new Map(); }
}

export async function fetchAdsForAdSet(
  adSetId: string,
  window: AdWindow,
): Promise<MetaAdRow[]> {
  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  if (!token || !accountId) return [];
  const acct      = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const datePart  = windowToDateParam(window);
  const filtering = encodeURIComponent(JSON.stringify([{ field: "adset.id", operator: "EQUAL", value: adSetId }]));
  const url       = `${GRAPH}/${acct}/insights?level=ad&${datePart}&fields=ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,spend&filtering=${filtering}&limit=500&access_token=${token}`;
  try {
    const raw = await fetchAllFresh(url);
    return mapAdRows(raw);
  } catch { return []; }
}

/** All ads in a single campaign that had spend in the window. */
export async function fetchAdsForCampaign(
  campaignId: string,
  window: AdWindow,
): Promise<MetaAdRow[]> {
  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  if (!token || !accountId) return [];
  const acct      = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const datePart  = windowToDateParam(window);
  const filtering = encodeURIComponent(JSON.stringify([{ field: "campaign.id", operator: "EQUAL", value: campaignId }]));
  const url       = `${GRAPH}/${acct}/insights?level=ad&${datePart}&fields=ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,spend&filtering=${filtering}&limit=500&access_token=${token}`;
  try {
    const raw = await fetchAllFresh(url);
    return mapAdRows(raw);
  } catch { return []; }
}

/** All ads across all campaigns that had spend in the window. */
export async function fetchAllAdsWithSpend(window: AdWindow): Promise<MetaAdRow[]> {
  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  if (!token || !accountId) return [];
  const acct     = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const datePart = windowToDateParam(window);
  const url      = `${GRAPH}/${acct}/insights?level=ad&${datePart}&fields=ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,spend&limit=500&access_token=${token}`;
  try {
    const raw = await fetchAllFresh(url);
    return mapAdRows(raw);
  } catch { return []; }
}

function mapAdRows(raw: Record<string, unknown>[]): MetaAdRow[] {
  return raw
    .filter((r) => parseFloat((r["spend"] as string) ?? "0") > 0)
    .map((r) => ({
      id:           (r["ad_id"]         as string) ?? "",
      name:         (r["ad_name"]       as string) ?? "",
      adSetId:      (r["adset_id"]      as string) ?? "",
      adSetName:    (r["adset_name"]    as string) ?? "",
      campaignId:   (r["campaign_id"]   as string) ?? "",
      campaignName: (r["campaign_name"] as string) ?? "",
      spend:        parseFloat((r["spend"] as string) ?? "0"),
    }))
    .filter((r) => r.name);
}

export type AdWindow = "4d" | "7d" | "14d" | "month";

function windowToDateParam(window: AdWindow): string {
  if (window === "7d")    return "date_preset=last_7d";
  if (window === "14d")   return "date_preset=last_14d";
  if (window === "month") return "date_preset=last_30d";
  // 4d: 3 days ago → today = 4 days inclusive
  const fmt   = (d: Date) => d.toISOString().slice(0, 10);
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - 3);
  return `time_range=${encodeURIComponent(JSON.stringify({ since: fmt(since), until: fmt(until) }))}`;
}

// ─── Ad Library helpers ───────────────────────────────────────────────────────

export interface AdThumbnailInfo {
  adId:        string;
  adName:      string;
  adSetId:     string;
  thumbnailUrl: string;
}

/** All ad sets across all campaigns that had spend in the window. */
export async function fetchAllAdSetsWithSpend(window: AdWindow): Promise<MetaAdSetRow[]> {
  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  if (!token || !accountId) return [];
  const acct     = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const datePart = windowToDateParam(window);
  const url      = `${GRAPH}/${acct}/insights?level=adset&${datePart}&fields=adset_id,adset_name,campaign_id,campaign_name,spend&limit=500&access_token=${token}`;
  try {
    const raw = await fetchAllFresh(url);
    return raw
      .filter((r) => parseFloat((r["spend"] as string) ?? "0") > 0)
      .map((r) => ({
        id:           (r["adset_id"]      as string) ?? "",
        name:         (r["adset_name"]    as string) ?? "",
        campaignId:   (r["campaign_id"]   as string) ?? "",
        campaignName: (r["campaign_name"] as string) ?? "",
        spend:        parseFloat((r["spend"] as string) ?? "0"),
      }))
      .filter((r) => r.name)
      .sort((a, b) => b.spend - a.spend);
  } catch { return []; }
}

/**
 * For a list of ad set IDs, fetches all ads (creative thumbnail + name).
 * Used to build the adset library (thumbnail per adset, count per adset).
 */
export async function fetchAdThumbnailsForAdSets(adSetIds: string[]): Promise<AdThumbnailInfo[]> {
  if (!adSetIds.length) return [];
  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  if (!token || !accountId) return [];
  const acct      = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const filtering = encodeURIComponent(JSON.stringify([{ field: "adset.id", operator: "IN", value: adSetIds }]));
  const url       = `${GRAPH}/${acct}/ads?fields=id,name,adset_id,creative%7Bthumbnail_url%2Cimage_url%7D&filtering=${filtering}&limit=1000&access_token=${token}`;
  try {
    const raw = await fetchAllFresh(url);
    return raw.map((r) => {
      const creative = (r["creative"] ?? {}) as Record<string, string>;
      return {
        adId:         (r["id"]       as string) ?? "",
        adName:       (r["name"]     as string) ?? "",
        adSetId:      (r["adset_id"] as string) ?? "",
        thumbnailUrl: creative["thumbnail_url"] ?? creative["image_url"] ?? "",
      };
    }).filter((r) => r.adId && r.adSetId);
  } catch { return []; }
}

/**
 * For a single ad set, returns Map<adId, thumbnailUrl>.
 *
 * Two-step approach because creative{thumbnail_url} via the ads list endpoint
 * often returns empty for video ads:
 *   Step 1 — get each ad's creative ID
 *   Step 2 — call /{creativeId}?fields=thumbnail_url,image_url&thumbnail_width=300&thumbnail_height=200
 *            which reliably returns the video cover / image thumbnail
 */
export async function fetchAdThumbnailsForAdSet(adSetId: string): Promise<Map<string, string>> {
  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  if (!token || !accountId) return new Map();
  const acct      = accountId.startsWith("act_") ? accountId : `act_${accountId}`;

  // Step 1: get all ads in this adset → just need id + creative.id
  const filtering = encodeURIComponent(JSON.stringify([{ field: "adset.id", operator: "EQUAL", value: adSetId }]));
  const adsUrl    = `${GRAPH}/${acct}/ads?fields=id,creative&filtering=${filtering}&limit=500&access_token=${token}`;

  let adRows: Record<string, unknown>[] = [];
  try { adRows = await fetchAllFresh(adsUrl); } catch { return new Map(); }

  // Step 2: for each ad, resolve the creative thumbnail in parallel
  const map = new Map<string, string>();
  await Promise.all(adRows.map(async (r) => {
    const adId      = (r["id"] as string) ?? "";
    const creative  = (r["creative"] ?? {}) as Record<string, string>;
    const creativeId = creative["id"] ?? "";
    if (!adId || !creativeId) return;

    try {
      const thumbUrl = `${GRAPH}/${creativeId}?fields=thumbnail_url,image_url&thumbnail_width=300&thumbnail_height=200&access_token=${token}`;
      const res  = await fetch(thumbUrl, { cache: "no-store" } as RequestInit);
      const json = await res.json() as Record<string, string>;
      const thumb = json["thumbnail_url"] ?? json["image_url"] ?? "";
      if (thumb) map.set(adId, thumb);
    } catch { /* skip this creative */ }
  }));

  return map;
}

export async function fetchAdSpendByIds(
  adIds: string[],
  window: AdWindow,
): Promise<{ adId: string; adName: string; spend: number }[]> {
  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  if (!token || !accountId || adIds.length === 0) return [];

  const acct      = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const datePart  = windowToDateParam(window);
  const filtering = encodeURIComponent(JSON.stringify([{ field: "ad.id", operator: "IN", value: adIds }]));
  const url       = `${GRAPH}/${acct}/insights?level=ad&${datePart}&fields=ad_id,ad_name,spend&filtering=${filtering}&limit=500&access_token=${token}`;

  const raw = await fetchAllFresh(url);
  return raw.map((r) => ({
    adId:   (r["ad_id"]   as string) ?? "",
    adName: (r["ad_name"] as string) ?? "",
    spend:  parseFloat((r["spend"]  as string) ?? "0"),
  }));
}
