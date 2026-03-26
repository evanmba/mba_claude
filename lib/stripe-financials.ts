import Stripe from "stripe";
import { unstable_cache } from "next/cache";

// ---------------------------------------------------------------------------
// Payment plan label mapping (amount in cents → human label)
// ---------------------------------------------------------------------------
const PLAN_LABELS: Record<number, string> = {
  33300:  "$333/mo (11-month plan)",
  333300: "$3,333 down payment",
  75000:  "$750/mo (10-month plan)",
  100000: "$1,000/mo (4-month plan)",
  200000: "$2,000 (2-payment plan)",
};

function planLabel(amountCents: number): string {
  return PLAN_LABELS[amountCents] ?? `$${(amountCents / 100).toLocaleString()}/payment`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface UpcomingPayment {
  id: string;
  customerName: string;
  customerEmail: string;
  amount: number;          // cents
  nextPaymentDate: number; // unix timestamp
  planLabel: string;
}

export interface FinancialsData {
  monthly2026: number[];        // index 0=Jan … 11=Dec, cents, succeeded charges
  collectedByMonth: number[];   // [month0, month1, month2] — matches toggle tabs
  monthLabels: string[];        // ["March 2026", "April 2026", "May 2026"]
  activeSubscriptions: number;
  upcomingPayments: UpcomingPayment[];
  stripeError?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getCustomerName(cust: Stripe.Customer | Stripe.DeletedCustomer | string | null): string {
  if (!cust || typeof cust === "string") return "Unknown";
  if ((cust as Stripe.DeletedCustomer).deleted) return cust.id;
  return (cust as Stripe.Customer).name || (cust as Stripe.Customer).email || cust.id;
}

function getCustomerEmail(cust: Stripe.Customer | Stripe.DeletedCustomer | string | null): string {
  if (!cust || typeof cust === "string") return "";
  if ((cust as Stripe.DeletedCustomer).deleted) return "";
  return (cust as Stripe.Customer).email ?? "";
}

// Advance billing_cycle_anchor by the subscription interval until it's in the future
function nextChargeDate(anchorUnix: number, interval: string, intervalCount: number): number {
  const now = Math.floor(Date.now() / 1000);
  let next = anchorUnix;
  while (next <= now) {
    const d = new Date(next * 1000);
    if (interval === "month") {
      d.setMonth(d.getMonth() + intervalCount);
    } else if (interval === "year") {
      d.setFullYear(d.getFullYear() + intervalCount);
    } else if (interval === "week") {
      next += intervalCount * 7 * 86400;
      continue;
    } else {
      next += intervalCount * 86400;
      continue;
    }
    next = Math.floor(d.getTime() / 1000);
  }
  return next;
}

async function listAll<T extends { id: string }>(
  fn: (p: { limit: number; starting_after?: string }) => Promise<Stripe.ApiList<T>>
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  while (true) {
    const page = await fn({ limit: 100, starting_after: cursor });
    all.push(...page.data);
    if (!page.has_more) break;
    cursor = page.data[page.data.length - 1].id;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Main fetch (inner — not exported directly)
// ---------------------------------------------------------------------------
async function _fetchFinancialsData(resolvedKey: string): Promise<FinancialsData> {
  let stripe: Stripe;
  try {
    stripe = new Stripe(resolvedKey);
  } catch {
    return empty("Failed to initialize Stripe client");
  }

  try {
    const now = new Date();
    const jan2026 = Math.floor(new Date(2026, 0, 1).getTime() / 1000);

    // Run charges and subscriptions fetches in parallel
    const [charges, subscriptions] = await Promise.all([
      listAll<Stripe.Charge>((p) =>
        stripe.charges.list({ ...p, created: { gte: jan2026 } })
      ),
      listAll<Stripe.Subscription>((p) =>
        stripe.subscriptions.list({ ...p, status: "active", expand: ["data.customer"] })
      ),
    ]);

    // ── Cash collected ───────────────────────────────────────────────────────
    const succeeded = charges.filter((c) => c.status === "succeeded");

    const monthly2026 = Array<number>(12).fill(0);
    for (const c of succeeded) {
      const m = new Date((c.created ?? 0) * 1000).getMonth();
      monthly2026[m] += c.amount;
    }

    const monthWindows = [0, 1, 2].map((offset) => {
      const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
      return {
        start: Math.floor(start.getTime() / 1000),
        end:   Math.floor(end.getTime() / 1000),
        label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      };
    });

    const collectedByMonth = monthWindows.map(({ start, end }) =>
      succeeded
        .filter((c) => (c.created ?? 0) >= start && (c.created ?? 0) < end)
        .reduce((sum, c) => sum + c.amount, 0)
    );
    const monthLabels = monthWindows.map((w) => w.label);

    // ── Upcoming payments ────────────────────────────────────────────────────
    const nowUnix = Math.floor(Date.now() / 1000);
    const in3Months = nowUnix + 92 * 24 * 60 * 60;

    const upcomingPayments: UpcomingPayment[] = subscriptions
      .map((sub) => {
        const item = sub.items.data[0];
        const amountCents = item?.price?.unit_amount ?? 0;
        const interval = item?.price?.recurring?.interval ?? "month";
        const intervalCount = item?.price?.recurring?.interval_count ?? 1;
        const nextDate = nextChargeDate(sub.billing_cycle_anchor, interval, intervalCount);
        return {
          id: sub.id,
          customerName: getCustomerName(sub.customer as Stripe.Customer | Stripe.DeletedCustomer | string | null),
          customerEmail: getCustomerEmail(sub.customer as Stripe.Customer | Stripe.DeletedCustomer | string | null),
          amount: amountCents,
          nextPaymentDate: nextDate,
          planLabel: planLabel(amountCents),
        };
      })
      .filter((p) => p.nextPaymentDate >= nowUnix && p.nextPaymentDate <= in3Months)
      .sort((a, b) => a.nextPaymentDate - b.nextPaymentDate);

    return { monthly2026, collectedByMonth, monthLabels, activeSubscriptions: subscriptions.length, upcomingPayments };
  } catch (err) {
    return empty(err instanceof Error ? err.message : String(err));
  }
}

// ---------------------------------------------------------------------------
// Exported — cached for 5 minutes so repeated page visits don't re-hit Stripe
// ---------------------------------------------------------------------------
const _cachedFetch = unstable_cache(
  _fetchFinancialsData,
  ["financials-stripe"],
  { revalidate: 300 }
);

export async function fetchFinancialsData(key?: string): Promise<FinancialsData> {
  const resolvedKey = key ?? process.env.STRIPE_SECRET_KEY;
  if (!resolvedKey) return empty("STRIPE_SECRET_KEY is not set");
  return _cachedFetch(resolvedKey);
}

function empty(stripeError: string): FinancialsData {
  return {
    monthly2026: Array(12).fill(0),
    collectedByMonth: [0, 0, 0],
    monthLabels: ["", "", ""],
    activeSubscriptions: 0,
    upcomingPayments: [],
    stripeError,
  };
}
