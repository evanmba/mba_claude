// Meta Marketing API — ad spend by campaign / ad set / ad
// Docs: https://developers.facebook.com/docs/marketing-api/insights

export type MetaLevel = "campaign" | "adset" | "ad";

export interface MetaInsightRow {
  id: string;
  name: string;           // campaign / adset / ad name
  campaignName: string;   // always campaign name for context
  spend: number;          // dollars (converted from string)
  impressions: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;            // %
  reach: number;
  status: string;         // ACTIVE | PAUSED | ARCHIVED etc.
}

export interface MetaSpendData {
  rows: MetaInsightRow[];
  level: MetaLevel;
  datePreset: string;
  error?: string;
}

const GRAPH = "https://graph.facebook.com/v21.0";

// Fetch all pages of results
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

export async function fetchMetaSpend(
  level: MetaLevel = "adset",
  datePreset = "this_month",
): Promise<MetaSpendData> {
  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;  // with or without "act_" prefix

  if (!token || !accountId) {
    return { rows: [], level, datePreset, error: "META_ADS_ACCESS_TOKEN or META_ADS_ACCOUNT_ID not set" };
  }

  const acct = accountId.startsWith("act_") ? accountId : `act_${accountId}`;

  // Fields vary slightly by level
  const nameField  = level === "campaign" ? "campaign_name" : level === "adset" ? "adset_name" : "ad_name";
  const idField    = level === "campaign" ? "campaign_id"   : level === "adset" ? "adset_id"   : "ad_id";
  const fields = [
    idField, nameField, "campaign_name",
    "spend", "impressions", "reach", "clicks", "cpm", "cpc", "ctr",
  ].join(",");

  const insightUrl =
    `${GRAPH}/${acct}/insights?level=${level}&date_preset=${datePreset}` +
    `&fields=${fields}&limit=500&access_token=${token}`;

  try {
    const raw = await fetchAll(insightUrl);

    // Also fetch ad set / campaign status so we can flag paused/inactive
    let statusMap = new Map<string, string>();
    try {
      const statusFields = level === "campaign" ? "id,name,status,effective_status" : "id,name,status,effective_status";
      const endpoint     = level === "campaign" ? "campaigns" : level === "adset" ? "adsets" : "ads";
      const statusUrl =
        `${GRAPH}/${acct}/${endpoint}?fields=${statusFields}&limit=500&access_token=${token}`;
      const statusRows = await fetchAll(statusUrl);
      statusMap = new Map(statusRows.map((r) => [r.id as string, (r.effective_status ?? r.status ?? "") as string]));
    } catch { /* status is optional */ }

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
    return {
      rows: [], level, datePreset,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── CBO Winners ad-level spend for a given time window ───────────────────────
// Returns spend per ad creative filtered to campaign names containing "cbo".

export type AdWindow = "4d" | "7d" | "14d" | "month";

function windowToDateParam(window: AdWindow): string {
  if (window === "month") return "date_preset=this_month";
  const days = window === "4d" ? 4 : window === "7d" ? 7 : 14;
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `time_range=${encodeURIComponent(JSON.stringify({ since: fmt(since), until: fmt(until) }))}`;
}

export async function fetchCBOAdSpend(
  window: AdWindow,
): Promise<{ adName: string; spend: number }[]> {
  const token     = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  if (!token || !accountId) return [];

  const acct      = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const datePart  = windowToDateParam(window);
  const fields    = "ad_id,ad_name,campaign_name,spend";
  const url       = `${GRAPH}/${acct}/insights?level=ad&${datePart}&fields=${fields}&limit=500&access_token=${token}`;

  try {
    const raw = await fetchAll(url);
    return raw
      .filter((r) =>
        ((r["campaign_name"] as string) ?? "").toLowerCase().includes("cbo") &&
        parseFloat((r["spend"] as string) ?? "0") > 0
      )
      .map((r) => ({
        adName: (r["ad_name"] as string) ?? "",
        spend:  parseFloat((r["spend"] as string) ?? "0"),
      }))
      .sort((a, b) => b.spend - a.spend);
  } catch {
    return [];
  }
}

