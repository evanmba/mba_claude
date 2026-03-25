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
  collectedThisMonth: number;
  collectedThisMonthLabel: string;          // e.g. "March 2026"
  activeSubscriptions: number;
  upcomingPayments: UpcomingPayment[]; // next 3 months, filtered client-side by month
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
    // 1. Cash collected this calendar month
    // -----------------------------------------------------------------------
    const now = new Date();
    const monthStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
    const collectedThisMonthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const thisMonthInvoices = await listAll<Stripe.Invoice>((p) =>
      stripe.invoices.list({ ...p, status: "paid", created: { gte: monthStart } })
    );
    const collectedThisMonth = thisMonthInvoices.reduce((sum, inv) => sum + (inv.amount_paid ?? 0), 0);

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
      collectedThisMonth,
      collectedThisMonthLabel,
      activeSubscriptions: subscriptions.length,
      upcomingPayments,
    };
  } catch (err) {
    return empty(err instanceof Error ? err.message : String(err));
  }
}

function empty(stripeError: string): FinancialsData {
  return {
    collectedThisMonth: 0,
    collectedThisMonthLabel: "",
    activeSubscriptions: 0,
    upcomingPayments: [],
    stripeError,
  };
}
