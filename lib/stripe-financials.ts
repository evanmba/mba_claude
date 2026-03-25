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
  nextPaymentDate: number; // unix timestamp (current_period_end of first item)
  planLabel: string;
}

export interface FinancialsData {
  totalInstallmentCollected: number; // cents — paid invoices from subscriptions
  totalPayInFull: number;            // cents — paid invoices NOT from subscriptions
  totalRevenue: number;              // cents — all of the above combined
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

// Auto-paginate through all records
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
export async function fetchFinancialsData(): Promise<FinancialsData> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return empty("STRIPE_SECRET_KEY is not set");

  let stripe: Stripe;
  try {
    // Use the version bundled with the installed package
    stripe = new Stripe(key);
  } catch {
    return empty("Failed to initialize Stripe client");
  }

  try {
    // -----------------------------------------------------------------------
    // 1. Revenue totals via paid invoices
    //    Subscription invoices → installment revenue
    //    Non-subscription invoices → pay-in-full revenue
    // -----------------------------------------------------------------------
    const invoices = await listAll<Stripe.Invoice>((p) =>
      stripe.invoices.list({ ...p, status: "paid" })
    );

    let totalInstallmentCollected = 0;
    let totalPayInFull = 0;

    for (const inv of invoices) {
      const amt = inv.amount_paid ?? 0;
      // billing_reason starting with "subscription" → installment charge
      const isSubscriptionInvoice = (inv.billing_reason ?? "").startsWith("subscription");
      if (isSubscriptionInvoice) {
        totalInstallmentCollected += amt;
      } else {
        totalPayInFull += amt;
      }
    }

    const totalRevenue = totalInstallmentCollected + totalPayInFull;

    // -----------------------------------------------------------------------
    // 2. Active subscriptions — upcoming payments
    //    current_period_end lives on each SubscriptionItem in the clover API
    // -----------------------------------------------------------------------
    const subscriptions = await listAll<Stripe.Subscription>((p) =>
      stripe.subscriptions.list({
        ...p,
        status: "active",
        expand: ["data.customer"],
      })
    );

    const upcomingPayments: UpcomingPayment[] = subscriptions.map((sub) => {
      const item = sub.items.data[0];
      const amountCents = item?.price?.unit_amount ?? 0;
      // current_period_end is on SubscriptionItem in the clover API
      const nextDate = (item as Stripe.SubscriptionItem & { current_period_end?: number }).current_period_end
        ?? sub.billing_cycle_anchor;

      return {
        id: sub.id,
        customerName: getCustomerName(sub.customer as Stripe.Customer | Stripe.DeletedCustomer | string | null),
        customerEmail: getCustomerEmail(sub.customer as Stripe.Customer | Stripe.DeletedCustomer | string | null),
        amount: amountCents,
        nextPaymentDate: nextDate,
        planLabel: planLabel(amountCents),
      };
    }).sort((a, b) => a.nextPaymentDate - b.nextPaymentDate);

    return {
      totalInstallmentCollected,
      totalPayInFull,
      totalRevenue,
      activeSubscriptions: subscriptions.length,
      upcomingPayments,
    };
  } catch (err) {
    return empty(err instanceof Error ? err.message : String(err));
  }
}

function empty(stripeError: string): FinancialsData {
  return {
    totalInstallmentCollected: 0,
    totalPayInFull: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    upcomingPayments: [],
    stripeError,
  };
}
