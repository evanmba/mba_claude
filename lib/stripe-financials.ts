import Stripe from "stripe";

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
  collectedByMonth: number[];   // [month0, month1, month2] in cents — matches toggle tabs
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
// Main fetch
// ---------------------------------------------------------------------------
export async function fetchFinancialsData(key?: string): Promise<FinancialsData> {
  const resolvedKey = key ?? process.env.STRIPE_SECRET_KEY;
  if (!resolvedKey) return empty("STRIPE_SECRET_KEY is not set");

  let stripe: Stripe;
  try {
    stripe = new Stripe(resolvedKey);
  } catch {
    return empty("Failed to initialize Stripe client");
  }

  try {
    // -----------------------------------------------------------------------
    // 1. Cash collected — bucketed into 3 month windows (current + 2 ahead)
    //    Future months will naturally be $0 (no paid invoices yet)
    // -----------------------------------------------------------------------
    const now = new Date();
    const monthWindows = [0, 1, 2].map((offset) => {
      const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
      return {
        start: Math.floor(start.getTime() / 1000),
        end:   Math.floor(end.getTime() / 1000),
        label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      };
    });

    // Only need to query from start of current month — future months have no charges
    const charges = await listAll<Stripe.Charge>((p) =>
      stripe.charges.list({ ...p, created: { gte: monthWindows[0].start } })
    );

    const collectedByMonth = monthWindows.map(({ start, end }) =>
      charges
        .filter((c) => c.status === "succeeded" && (c.created ?? 0) >= start && (c.created ?? 0) < end)
        .reduce((sum, c) => sum + c.amount, 0)
    );
    const monthLabels = monthWindows.map((w) => w.label);

    // -----------------------------------------------------------------------
    // 2. Active subscriptions — calculate next charge date from billing_cycle_anchor
    //    (latest_invoice.period_end == anchor in clover API, so we advance by interval)
    // -----------------------------------------------------------------------
    const subscriptions = await listAll<Stripe.Subscription>((p) =>
      stripe.subscriptions.list({
        ...p,
        status: "active",
        expand: ["data.customer"],
      })
    );

    const nowUnix = Math.floor(Date.now() / 1000);
    // Collect next 3 calendar months worth of payments — client filters by selected month
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

    return {
      collectedByMonth,
      monthLabels,
      activeSubscriptions: subscriptions.length,
      upcomingPayments,
    };
  } catch (err) {
    return empty(err instanceof Error ? err.message : String(err));
  }
}

function empty(stripeError: string): FinancialsData {
  return {
    collectedByMonth: [0, 0, 0],
    monthLabels: ["", "", ""],
    activeSubscriptions: 0,
    upcomingPayments: [],
    stripeError,
  };
}
