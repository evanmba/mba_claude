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

// ─── Spend for specific ad IDs across a time window ───────────────────────────

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
