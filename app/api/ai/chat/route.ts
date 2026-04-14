import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchMainCreativeSpend } from "@/lib/attribution";
import { fetchLandingPageData } from "@/lib/landingPage";
import { fetchSheetValues, FUNNEL_SHEET_ID, getCurrentMonthTab, parseMonthly } from "@/lib/funnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

// ─── Data aggregator ───────────────────────────────────────────────────────────

async function buildContext(window: "7d" | "14d" | "month"): Promise<string> {
  const apiKey = process.env.SHEETS_API_KEY ?? process.env.GOOGLE_SHEETS_API_KEY ?? process.env.GOOGLE_MASTER_SHEETS_API_KEY ?? "";

  const [adsResult, lpData, monthlyRows] = await Promise.allSettled([
    fetchMainCreativeSpend(window),
    fetchLandingPageData(),
    fetchSheetValues(FUNNEL_SHEET_ID, getCurrentMonthTab(), apiKey),
  ]);

  const sections: string[] = [];

  // ── Ad Creative Attribution ─────────────────────────────────────────────────
  if (adsResult.status === "fulfilled") {
    const { cards } = adsResult.value;
    const windowLabel = window === "7d" ? "last 7 days" : window === "14d" ? "last 14 days" : "last 30 days";
    const adLines = cards.map((c) => {
      const cpl  = c.leads       > 0 ? `$${(c.spend / c.leads).toFixed(0)}`       : "n/a";
      const cpb  = c.bookedCalls > 0 ? `$${(c.spend / c.bookedCalls).toFixed(0)}` : "n/a";
      const cpt  = c.takenCalls  > 0 ? `$${(c.spend / c.takenCalls).toFixed(0)}`  : "n/a";
      const cpd  = c.deals       > 0 ? `$${(c.spend / c.deals).toFixed(0)}`       : "n/a";
      const l2b  = c.leads > 0 && c.bookedCalls > 0 ? `${((c.bookedCalls / c.leads) * 100).toFixed(1)}%` : "n/a";
      const b2t  = c.bookedCalls > 0 ? `${((c.takenCalls / c.bookedCalls) * 100).toFixed(1)}%`           : "n/a";
      const t2d  = c.takenCalls  > 0 ? `${((c.deals / c.takenCalls) * 100).toFixed(1)}%`                 : "n/a";
      return `  ${c.label}: spend=$${c.spend.toFixed(0)} leads=${c.leads}(${cpl}/ea) booked=${c.bookedCalls}(${cpb}/ea) taken=${c.takenCalls}(${cpt}/ea) deals=${c.deals}(${cpd}/ea) lead→book=${l2b} book→take=${b2t} take→deal=${t2d}`;
    });
    sections.push(`AD CREATIVE ATTRIBUTION (${windowLabel}):\n${adLines.join("\n")}`);
  }

  // ── Funnel / Monthly sheet ──────────────────────────────────────────────────
  if (monthlyRows.status === "fulfilled") {
    try {
      const { monthly, salesDashboard } = parseMonthly(monthlyRows.value);
      const monthLabel = getCurrentMonthTab();
      // Find the "30 Days" or last row as the summary
      const summary = monthly.find((r) => r.period === "30 Days") ?? monthly[monthly.length - 1];
      if (summary) {
        sections.push(
          `FUNNEL DASHBOARD (${monthLabel}):\n` +
          `  Spend=$${summary.amountSpent.toFixed(0)} Leads=${summary.leads} Apps=${summary.apps} BookedCalls=${summary.bookedCalls} TakenCalls=${summary.takenCalls} Deals=${summary.dealsClosed}\n` +
          `  CPL=$${summary.costPerLead.toFixed(0)} CPA=$${summary.costPerApp.toFixed(0)} CPBooked=$${summary.costPerBooked.toFixed(0)} CPTaken=$${summary.costPerTaken.toFixed(0)}\n` +
          `  ShowRate=${summary.showUpRate.toFixed(1)}% CloseRate=${summary.closeRate.toFixed(1)}% LeadConv=${summary.leadConv.toFixed(1)}%\n` +
          `  Cash=$${summary.cash.toFixed(0)} Revenue=$${summary.revenue.toFixed(0)} CashROAS=${summary.cashROAS.toFixed(2)} RevROAS=${summary.revenueROAS.toFixed(2)}`
        );
      }
      if (salesDashboard) {
        sections.push(
          `SALES TEAM (${monthLabel}):\n` +
          `  FrontEndRevenue=$${salesDashboard.frontEndRevenue.toFixed(0)} NewCash=$${salesDashboard.newCash.toFixed(0)}\n` +
          `  TotalCallsBooked=${salesDashboard.totalCallsBooked} TotalCallsTaken=${salesDashboard.totalCallsTaken} TotalCloses=${salesDashboard.totalCloses}\n` +
          `  ShowRate=${salesDashboard.showRate.toFixed(1)}% CloseRate=${salesDashboard.closeRate.toFixed(1)}%\n` +
          `  CashPerCall=$${salesDashboard.cashPerCall.toFixed(0)} RevenuePerCall=$${salesDashboard.revenuePerCall.toFixed(0)}`
        );
      }
    } catch {
      // silently skip if parse fails
    }
  }

  // ── Landing Page Split Test ─────────────────────────────────────────────────
  if (lpData.status === "fulfilled") {
    const d = lpData.value;
    const winner = d.quality.winner;
    sections.push(
      `LANDING PAGE SPLIT TEST:\n` +
      `  Overall: leads=${d.overall.totalLeads} callsShown=${d.overall.callsShown} closed=${d.overall.totalClosed} showRate=${d.overall.showRate.toFixed(1)}% closeRate=${d.overall.closeRate.toFixed(1)}% cash=$${d.overall.totalCash.toFixed(0)}\n` +
      `  Page 1: bookings=${d.page1.bookings} showRate=${d.page1.showRate.toFixed(1)}% closeRate=${d.page1.closeRate.toFixed(1)}% qualityScore=${d.quality.page1Score.toFixed(1)}%\n` +
      `  Page 2: bookings=${d.page2.bookings} showRate=${d.page2.showRate.toFixed(1)}% closeRate=${d.page2.closeRate.toFixed(1)}% qualityScore=${d.quality.page2Score.toFixed(1)}%\n` +
      `  Current winner: ${winner} | Decision reliable: ${d.overall.totalLeads >= 100 ? "YES" : "NO — need 100+ leads"}`
    );
  }

  return sections.join("\n\n");
}

// ─── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(context: string, window: string): string {
  return `You are an AI assistant for Mendoza Baseball Academy, an online baseball coaching business. You have access to live performance data across the full dashboard.

The data below covers: ad creative attribution (${window === "7d" ? "7 days" : window === "14d" ? "14 days" : "30 days"} window), monthly funnel, sales team, and landing page split test.

${context}

Guidelines:
- Be concise and direct. This is a chat interface, not a report.
- Reference specific numbers when answering questions about performance.
- If a metric isn't in the data above, say so clearly.
- You can reason across sections — e.g. connecting ad spend to funnel outcomes.
- The business sells baseball coaching programs. Context: leads → applications → booked calls → taken calls → closed deals.`;
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  let body: { messages: { role: "user" | "assistant"; content: string }[]; window?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  const window = (body.window ?? "7d") as "7d" | "14d" | "month";
  const context = await buildContext(window);
  const system  = buildSystemPrompt(context, window);

  const encoder = new TextEncoder();
  const stream  = new ReadableStream({
    async start(controller) {
      try {
        const s = await client.messages.stream({
          model:      "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system,
          messages,
        });
        for await (const chunk of s) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (e) {
        controller.enqueue(encoder.encode(`\n\n[Error: ${e instanceof Error ? e.message : String(e)}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
