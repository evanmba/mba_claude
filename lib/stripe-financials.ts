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
  totalCollected: number;         // cents — all paid invoices ever
  dueThisMonth: number;           // cents — sum of upcoming charges in next 30 days
  activeSubscriptions: number;
  upcomingPayments: UpcomingPayment[]; // only those due within 30 days
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
    // 1. Total cash collected — sum all paid invoices
    // -----------------------------------------------------------------------
    const invoices = await listAll<Stripe.Invoice>((p) =>
      stripe.invoices.list({ ...p, status: "paid" })
    );

    const totalCollected = invoices.reduce((sum, inv) => sum + (inv.amount_paid ?? 0), 0);

    // -----------------------------------------------------------------------
    // 2. Active subscriptions with latest_invoice expanded
    //    latest_invoice.period_end = the end of the current period = next charge date
    // -----------------------------------------------------------------------
    const subscriptions = await listAll<Stripe.Subscription>((p) =>
      stripe.subscriptions.list({
        ...p,
        status: "active",
        expand: ["data.customer", "data.latest_invoice"],
      })
    );

    const now = Math.floor(Date.now() / 1000);
    const in30days = now + 30 * 24 * 60 * 60;

    const upcomingPayments: UpcomingPayment[] = subscriptions
      .map((sub) => {
        const item = sub.items.data[0];
        const amountCents = item?.price?.unit_amount ?? 0;

        // Use latest_invoice.period_end as the next charge date.
        // It equals the end of the current period (= when the next charge fires).
        const latestInvoice = sub.latest_invoice as Stripe.Invoice | string | null;
        const nextDate =
          typeof latestInvoice === "object" && latestInvoice !== null
            ? (latestInvoice.period_end ?? sub.billing_cycle_anchor)
            : sub.billing_cycle_anchor;

        return {
          id: sub.id,
          customerName: getCustomerName(sub.customer as Stripe.Customer | Stripe.DeletedCustomer | string | null),
          customerEmail: getCustomerEmail(sub.customer as Stripe.Customer | Stripe.DeletedCustomer | string | null),
          amount: amountCents,
          nextPaymentDate: nextDate,
          planLabel: planLabel(amountCents),
        };
      })
      // Only keep payments due within the next 30 days
      .filter((p) => p.nextPaymentDate >= now && p.nextPaymentDate <= in30days)
      .sort((a, b) => a.nextPaymentDate - b.nextPaymentDate);

    const dueThisMonth = upcomingPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalCollected,
      dueThisMonth,
      activeSubscriptions: subscriptions.length,
      upcomingPayments,
    };
  } catch (err) {
    return empty(err instanceof Error ? err.message : String(err));
  }
}

function empty(stripeError: string): FinancialsData {
  return {
    totalCollected: 0,
    dueThisMonth: 0,
    activeSubscriptions: 0,
    upcomingPayments: [],
    stripeError,
  };
}
