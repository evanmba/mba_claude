/**
 * Meta Ads (Facebook Marketing API) integration.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/insights
 *
 * Required env vars:
 *   META_ADS_ACCESS_TOKEN   – System user or long-lived user token with
 *                             ads_read permission.
 *   META_ADS_ACCOUNT_ID     – Ad account ID without the "act_" prefix,
 *                             e.g. "1234567890498".
 */

const BASE = "https://graph.facebook.com/v19.0";
const TOKEN = process.env.META_ADS_ACCESS_TOKEN;
const RAW_ACCOUNT_ID = process.env.META_ADS_ACCOUNT_ID ?? "";

/** Canonical account identifier used in API calls (always includes "act_" prefix). */
export const ACCOUNT_ID = RAW_ACCOUNT_ID.startsWith("act_")
  ? RAW_ACCOUNT_ID
  : `act_${RAW_ACCOUNT_ID}`;

export function isMetaAdsConnected(): boolean {
  return !!(TOKEN && RAW_ACCOUNT_ID);
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** The metrics we care about, mapped 1-to-1 with the API field names. */
export interface MetaAdsInsights {
  date_start: string;           // YYYY-MM-DD (the "yesterday" date)
  date_stop: string;            // same as date_start for single-day pulls
  spend: number;                // Amount Spent ($)
  purchases: number;            // Purchases (actions: offsite_conversion.fb_pixel_purchase)
  cost_per_purchase: number;    // Cost Per Purchase
  link_clicks: number;          // Link Clicks (actions: link_click)
  impressions: number;          // Impressions
  reach: number;                // Reach
  frequency: number;            // Frequency
  cpm: number;                  // CPM (cost per 1000 impressions)
  ctr: number;                  // CTR (All) – clicks / impressions × 100
  unique_link_clicks: number;   // Unique Link Clicks
  cpc: number;                  // CPC (All) – spend / all clicks
  roas: number;                 // ROAS (purchase_roas)
  revenue: number;              // Revenue (conversion value of purchases)
  cost_per_acquisition: number; // Cost Per Acquisition (cost_per_action_type: offsite_conversion.fb_pixel_purchase)
}

/** Raw action object returned inside Meta's insights response. */
interface MetaAction {
  action_type: string;
  value: string;
}

/** Raw cost-per-action object returned inside Meta's insights response. */
interface MetaCostPerAction {
  action_type: string;
  value: string;
}

/** Raw purchase_roas object returned inside Meta's insights response. */
interface MetaRoas {
  action_type: string;
  value: string;
}

// ─── API fields requested from Meta ──────────────────────────────────────────

const FIELDS = [
  "spend",
  "impressions",
  "reach",
  "frequency",
  "cpm",
  "ctr",
  "cpc",
  "unique_clicks",        // unique_link_clicks comes from unique_actions
  "actions",             // contains link_click + purchase counts
  "cost_per_action_type",
  "purchase_roas",
  "action_values",       // contains revenue
].join(",");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findAction(actions: MetaAction[] | undefined, type: string): number {
  const match = (actions ?? []).find((a) => a.action_type === type);
  return match ? parseFloat(match.value) || 0 : 0;
}

function findCpa(cpa: MetaCostPerAction[] | undefined, type: string): number {
  const match = (cpa ?? []).find((a) => a.action_type === type);
  return match ? parseFloat(match.value) || 0 : 0;
}

function findRoas(roas: MetaRoas[] | undefined, type: string): number {
  const match = (roas ?? []).find((r) => r.action_type === type);
  return match ? parseFloat(match.value) || 0 : 0;
}

function n(val: string | undefined): number {
  return parseFloat(val ?? "0") || 0;
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

/**
 * Fetch account-level insights for a specific date (YYYY-MM-DD).
 * Aggregates across all campaigns in the account for that single day.
 */
export async function fetchMetaAdsInsights(
  date: string // YYYY-MM-DD
): Promise<MetaAdsInsights> {
  if (!isMetaAdsConnected()) {
    throw new Error("Meta Ads not configured: missing META_ADS_ACCESS_TOKEN or META_ADS_ACCOUNT_ID");
  }

  const params = new URLSearchParams({
    access_token: TOKEN!,
    fields: FIELDS,
    time_range: JSON.stringify({ since: date, until: date }),
    level: "account",
    limit: "1",
  });

  const url = `${BASE}/${ACCOUNT_ID}/insights?${params}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();

  if (!res.ok) {
    const msg = json?.error?.message ?? JSON.stringify(json);
    throw new Error(`Meta Ads API error: ${msg}`);
  }

  // The API returns a paginated list; we requested account-level so there
  // should be exactly one row (or zero if there was no spend that day).
  const row = (json.data ?? [])[0] ?? {};

  const actions: MetaAction[] = row.actions ?? [];
  const cpaList: MetaCostPerAction[] = row.cost_per_action_type ?? [];
  const roasList: MetaRoas[] = row.purchase_roas ?? [];
  const actionValues: MetaAction[] = row.action_values ?? [];

  const purchases = findAction(actions, "offsite_conversion.fb_pixel_purchase");
  const spend = n(row.spend);
  const cost_per_purchase = purchases > 0 ? spend / purchases : 0;

  return {
    date_start: row.date_start ?? date,
    date_stop: row.date_stop ?? date,
    spend,
    purchases,
    cost_per_purchase,
    link_clicks: findAction(actions, "link_click"),
    impressions: n(row.impressions),
    reach: n(row.reach),
    frequency: n(row.frequency),
    cpm: n(row.cpm),
    ctr: n(row.ctr),
    unique_link_clicks: findAction(row.unique_actions ?? [], "link_click"),
    cpc: n(row.cpc),
    roas: findRoas(roasList, "offsite_conversion.fb_pixel_purchase"),
    revenue: findAction(actionValues, "offsite_conversion.fb_pixel_purchase"),
    cost_per_acquisition: findCpa(cpaList, "offsite_conversion.fb_pixel_purchase"),
  };
}

/**
 * Returns yesterday's date (UTC) as a YYYY-MM-DD string.
 * Cron jobs typically run in UTC; adjust if your account timezone differs.
 */
export function getYesterdayDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
