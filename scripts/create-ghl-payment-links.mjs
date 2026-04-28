#!/usr/bin/env node
// Create GHL products + prices for the Triple Play payment plans, then emit
// a CSV of payment-link URLs.
//
// Usage:
//   node scripts/create-ghl-payment-links.mjs            # dry run (no API calls)
//   node scripts/create-ghl-payment-links.mjs --live     # actually create in GHL
//
// Reads GHL_PIT and GHL_LOCATION_ID from .env.local.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------- env loading ----------
const envPath = resolve(ROOT, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const PIT = process.env.GHL_PIT;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
if (!PIT || !LOCATION_ID) {
  console.error("Missing GHL_PIT or GHL_LOCATION_ID in .env.local");
  process.exit(1);
}

const LIVE = process.argv.includes("--live");
const BASE = "https://services.leadconnectorhq.com";
const VERSION = "2021-07-28";

// ---------- the 17 plans ----------
// Plan kinds:
//   one_time:                amount paid once
//   split:                   2 charges N days apart (uses recurring with day interval, totalCycles=2)
//   down_plus_monthly:       setup fee today + N monthly recurring charges
//   monthly_only:            N monthly recurring charges, no setup fee
const plans = [
  // 12-month
  { name: "Triple Play 12mo - PIF $6,000", kind: "one_time", amount: 6000, total: 6000 },
  { name: "Triple Play 12mo - SPLIT 2x $3,000 / 90 days", kind: "split", amount: 3000, intervalDays: 90, cycles: 2, total: 6000 },
  { name: "Triple Play 12mo - $3,500 down + $300x10 mo", kind: "down_plus_monthly", setupFee: 3500, amount: 300, cycles: 10, total: 6500 },
  { name: "Triple Play 12mo - $3,500 down + $600x5 mo",  kind: "down_plus_monthly", setupFee: 3500, amount: 600, cycles: 5,  total: 6500 },
  { name: "Triple Play 12mo - $3,000 down + $350x10 mo", kind: "down_plus_monthly", setupFee: 3000, amount: 350, cycles: 10, total: 6500 },
  { name: "Triple Play 12mo - $3,000 down + $700x5 mo",  kind: "down_plus_monthly", setupFee: 3000, amount: 700, cycles: 5,  total: 6500 },
  { name: "Triple Play 12mo - $2,500 down + $400x10 mo", kind: "down_plus_monthly", setupFee: 2500, amount: 400, cycles: 10, total: 6500 },
  { name: "Triple Play 12mo - $2,500 down + $800x5 mo",  kind: "down_plus_monthly", setupFee: 2500, amount: 800, cycles: 5,  total: 6500 },
  { name: "Triple Play 12mo - $2,000 down + $450x10 mo", kind: "down_plus_monthly", setupFee: 2000, amount: 450, cycles: 10, total: 6500 },
  { name: "Triple Play 12mo - $2,000 down + $900x5 mo",  kind: "down_plus_monthly", setupFee: 2000, amount: 900, cycles: 5,  total: 6500 },
  { name: "Triple Play 12mo - $1,500 down + $500x10 mo", kind: "down_plus_monthly", setupFee: 1500, amount: 500, cycles: 10, total: 6500 },
  { name: "Triple Play 12mo - $1,500 down + $1,000x5 mo",kind: "down_plus_monthly", setupFee: 1500, amount: 1000, cycles: 5, total: 6500 },
  // 6-month
  { name: "Triple Play 6mo - PIF $4,000", kind: "one_time", amount: 4000, total: 4000 },
  { name: "Triple Play 6mo - SPLIT 2x $2,000 / 60 days", kind: "split", amount: 2000, intervalDays: 60, cycles: 2, total: 4000 },
  { name: "Triple Play 6mo - $750x6 mo", kind: "monthly_only", amount: 750, cycles: 6, total: 4500 },
  // 3-month
  { name: "Triple Play 3mo - PIF $2,500", kind: "one_time", amount: 2500, total: 2500 },
  { name: "Triple Play 3mo - SPLIT 2x $1,250 / 30 days", kind: "split", amount: 1250, intervalDays: 30, cycles: 2, total: 2500 },
];

// ---------- HTTP helper ----------
async function ghl(method, path, body) {
  const url = `${BASE}${path}`;
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${PIT}`,
      Version: VERSION,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`GHL ${method} ${path} ${res.status}: ${text}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

// ---------- builders ----------
function priceBodyFor(plan) {
  const base = {
    name: plan.name,
    locationId: LOCATION_ID,
    currency: "USD",
  };
  switch (plan.kind) {
    case "one_time":
      return { ...base, type: "one_time", amount: plan.amount };
    case "split":
      return {
        ...base,
        type: "recurring",
        amount: plan.amount,
        recurring: { interval: "day", intervalCount: plan.intervalDays },
        totalCycles: plan.cycles,
      };
    case "down_plus_monthly":
      return {
        ...base,
        type: "recurring",
        amount: plan.amount,
        recurring: { interval: "month", intervalCount: 1 },
        totalCycles: plan.cycles,
        setupFee: plan.setupFee,
      };
    case "monthly_only":
      return {
        ...base,
        type: "recurring",
        amount: plan.amount,
        recurring: { interval: "month", intervalCount: 1 },
        totalCycles: plan.cycles,
      };
    default:
      throw new Error(`unknown plan kind: ${plan.kind}`);
  }
}

async function createOne(plan) {
  // 1. product
  const product = await ghl("POST", "/products/", {
    name: plan.name,
    locationId: LOCATION_ID,
    productType: "SERVICE",
    description: `Auto-created. Total contract value: $${plan.total}.`,
    availableInStore: true,
  });
  const productId = product?.id || product?._id || product?.product?._id;
  if (!productId) throw new Error(`no productId in: ${JSON.stringify(product)}`);

  // 2. price
  const price = await ghl("POST", `/products/${productId}/price`, priceBodyFor(plan));
  const priceId = price?.id || price?._id;

  // 3. payment link
  let paymentLinkUrl = null;
  let paymentLinkId = null;
  try {
    const link = await ghl("POST", "/payments/payment-links", {
      altId: LOCATION_ID,
      altType: "location",
      name: plan.name,
      products: [{ productId, priceId, quantity: 1 }],
    });
    paymentLinkUrl = link?.url || link?.paymentLink?.url || link?.data?.url || null;
    paymentLinkId = link?.id || link?._id || link?.paymentLink?._id || null;
  } catch (e) {
    paymentLinkUrl = `[payment-link API failed: ${e.status} ${e.message.slice(0, 200)}]`;
  }

  return { plan: plan.name, productId, priceId, paymentLinkId, paymentLinkUrl };
}

// ---------- main ----------
async function main() {
  console.log(`\nMode: ${LIVE ? "LIVE" : "DRY RUN"}  |  ${plans.length} plans queued`);
  console.log(`Location: ${LOCATION_ID}\n`);

  if (!LIVE) {
    plans.forEach((p, i) => {
      console.log(`${String(i + 1).padStart(2)}. ${p.name}`);
      console.log(`     -> ${JSON.stringify(priceBodyFor(p))}`);
    });
    console.log("\nThis was a dry run. Re-run with --live to create them.");
    return;
  }

  const results = [];
  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    process.stdout.write(`[${i + 1}/${plans.length}] ${p.name} ... `);
    try {
      const r = await createOne(p);
      console.log("OK");
      results.push(r);
    } catch (e) {
      console.log("FAILED");
      console.error(`   ${e.message}`);
      results.push({ plan: p.name, error: e.message });
    }
  }

  // CSV out
  const csvPath = resolve(ROOT, "scripts/payment-links.csv");
  const header = "plan,productId,priceId,paymentLinkId,paymentLinkUrl,error";
  const rows = results.map((r) =>
    [r.plan, r.productId, r.priceId, r.paymentLinkId, r.paymentLinkUrl, r.error]
      .map((v) => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`))
      .join(",")
  );
  writeFileSync(csvPath, [header, ...rows].join("\n"));
  console.log(`\nResults saved to ${csvPath}`);
  console.log(`Successes: ${results.filter((r) => !r.error).length} / ${plans.length}`);
}

main().catch((e) => {
  console.error("\nFatal:", e);
  process.exit(1);
});
