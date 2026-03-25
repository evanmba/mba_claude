import Stripe from "stripe";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) return NextResponse.json({ error: "no key" });

  const stripe = new Stripe(key);
  const subs = await stripe.subscriptions.list({
    limit: 5,
    status: "active",
    expand: ["data.customer", "data.latest_invoice"],
  });

  const now = Math.floor(Date.now() / 1000);
  const in30 = now + 30 * 86400;

  const rows = subs.data.map((sub) => {
    const inv = sub.latest_invoice as Stripe.Invoice | null | string;
    const periodEnd = typeof inv === "object" && inv ? inv.period_end : null;
    const item = sub.items.data[0];
    return {
      id: sub.id,
      customer: typeof sub.customer === "object" && sub.customer && !("deleted" in sub.customer)
        ? (sub.customer as Stripe.Customer).name || (sub.customer as Stripe.Customer).email
        : sub.customer,
      amount_cents: item?.price?.unit_amount,
      billing_cycle_anchor: sub.billing_cycle_anchor,
      latest_invoice_period_end: periodEnd,
      period_end_date: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      days_until: periodEnd ? Math.round((periodEnd - now) / 86400) : null,
      in_30_day_window: periodEnd ? periodEnd >= now && periodEnd <= in30 : false,
    };
  });

  return NextResponse.json({ now_date: new Date(now * 1000).toISOString(), rows });
}
