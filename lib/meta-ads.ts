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

/**
 * All metrics fetched from the Meta Marketing API for a single day.
 * Columns map 1-to-1 with the "MAR 2026" sheet (B through I).
 */
export interface MetaAdsInsights {
  date_start: string;              // YYYY-MM-DD
  date_stop: string;
  spend: number;                   // B – Amount Spent
  frequency: number;               // C – Frequency
  reach: number;                   // D – Reach
  impressions: number;             // E – Impressions
  cpm: number;                     // F – CPM
  unique_link_clicks: number;      // G – Unique Link Clicks
  unique_link_clicks_ctr: number;  // H – Unique Link Click-Through Rate (%)
  cost_per_unique_link_click: number; // I – Cost Per Unique Link Click

  // Additional metrics (used in dashboard / other derived columns)
  link_clicks: number;
  ctr: number;
  cpc: number;
  purchases: number;
  cost_per_purchase: number;
  roas: number;
  revenue: number;
  cost_per_acquisition: number;
}

// ─── Internal raw API types ───────────────────────────────────────────────────

interface MetaAction {
  action_type: string;
  value: string;
}

// ─── API fields ───────────────────────────────────────────────────────────────

const FIELDS = [
  "spend",
  "impressions",
  "reach",
  "frequency",
  "cpm",
  "ctr",
  "cpc",
  "unique_link_clicks_ctr",        // H – Unique Link CTR
  "unique_actions",                // G – unique link clicks (action_type: link_click)
  "cost_per_unique_action_type",   // I – cost per unique link click
  "actions",                       // purchases + link clicks
  "cost_per_action_type",          // cost per purchase / CPA
  "purchase_roas",
  "action_values",                 // revenue
].join(",");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findAction(actions: MetaAction[] | undefined, type: string): number {
  return parseFloat((actions ?? []).find((a) => a.action_type === type)?.value ?? "0") || 0;
}

function n(val: string | undefined): number {
  return parseFloat(val ?? "0") || 0;
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

/**
 * Fetch account-level insights for a specific date (YYYY-MM-DD).
 * Aggregates across all active campaigns for that single day.
 */
export async function fetchMetaAdsInsights(date: string): Promise<MetaAdsInsights> {
  if (!isMetaAdsConnected()) {
    throw new Error(
      "Meta Ads not configured: missing META_ADS_ACCESS_TOKEN or META_ADS_ACCOUNT_ID"
    );
  }

  const params = new URLSearchParams({
    access_token: TOKEN!,
    fields: FIELDS,
    time_range: JSON.stringify({ since: date, until: date }),
    level: "account",
    limit: "1",
  });

  const res = await fetch(`${BASE}/${ACCOUNT_ID}/insights?${params}`, {
    cache: "no-store",
  });
  const json = await res.json();

  if (!res.ok) {
    throw new Error(`Meta Ads API error: ${json?.error?.message ?? JSON.stringify(json)}`);
  }

  const row = (json.data ?? [])[0] ?? {};

  const actions: MetaAction[] = row.actions ?? [];
  const uniqueActions: MetaAction[] = row.unique_actions ?? [];
  const cpaList: MetaAction[] = row.cost_per_action_type ?? [];
  const uniqueCpaList: MetaAction[] = row.cost_per_unique_action_type ?? [];
  const roasList: MetaAction[] = row.purchase_roas ?? [];
  const actionValues: MetaAction[] = row.action_values ?? [];

  const purchases = findAction(actions, "offsite_conversion.fb_pixel_purchase");
  const spend = n(row.spend);

  return {
    date_start: row.date_start ?? date,
    date_stop: row.date_stop ?? date,

    // Sheet columns B–I
    spend,
    frequency: n(row.frequency),
    reach: n(row.reach),
    impressions: n(row.impressions),
    cpm: n(row.cpm),
    unique_link_clicks: findAction(uniqueActions, "link_click"),
    unique_link_clicks_ctr: n(row.unique_link_clicks_ctr),
    cost_per_unique_link_click: findAction(uniqueCpaList, "link_click"),

    // Additional
    link_clicks: findAction(actions, "link_click"),
    ctr: n(row.ctr),
    cpc: n(row.cpc),
    purchases,
    cost_per_purchase: purchases > 0 ? spend / purchases : 0,
    roas: findAction(roasList, "offsite_conversion.fb_pixel_purchase"),
    revenue: findAction(actionValues, "offsite_conversion.fb_pixel_purchase"),
    cost_per_acquisition: findAction(cpaList, "offsite_conversion.fb_pixel_purchase"),
  };
}

/** Returns yesterday's date in UTC as YYYY-MM-DD. */
export function getYesterdayDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the Google Sheet tab name for a given date.
 * e.g. 2026-03-26 → "MAR 2026"
 */
export function getSheetTabName(date: string): string {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
                  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const d = new Date(date + "T12:00:00Z");
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
