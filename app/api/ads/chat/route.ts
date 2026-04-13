import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchMainCreativeSpend } from "@/lib/attribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

function buildSystemPrompt(cards: Awaited<ReturnType<typeof fetchMainCreativeSpend>>["cards"]): string {
  const lines = cards.map((c) => {
    const cpl = c.leads > 0 ? (c.spend / c.leads).toFixed(2) : "n/a";
    const cpb = c.bookedCalls > 0 ? (c.spend / c.bookedCalls).toFixed(2) : "n/a";
    const cpt = c.takenCalls > 0 ? (c.spend / c.takenCalls).toFixed(2) : "n/a";
    const cpd = c.deals > 0 ? (c.spend / c.deals).toFixed(2) : "n/a";
    const leadToBook = c.leads > 0 && c.bookedCalls > 0
      ? ((c.bookedCalls / c.leads) * 100).toFixed(1) + "%"
      : "n/a";
    const bookToTake = c.bookedCalls > 0
      ? ((c.takenCalls / c.bookedCalls) * 100).toFixed(1) + "%"
      : "n/a";
    const takeToDeal = c.takenCalls > 0
      ? ((c.deals / c.takenCalls) * 100).toFixed(1) + "%"
      : "n/a";
    return `
Ad Creative: ${c.label}
  Spend:         $${c.spend.toFixed(2)}
  Leads:         ${c.leads}   (cost/lead: $${cpl})
  Booked Calls:  ${c.bookedCalls}   (cost/booked: $${cpb})
  Taken Calls:   ${c.takenCalls}   (cost/taken: $${cpt})
  Deals:         ${c.deals}   (cost/deal: $${cpd})
  Lead→Book:     ${leadToBook}
  Book→Take:     ${bookToTake}
  Take→Deal:     ${takeToDeal}`.trim();
  });

  return `You are a performance marketing analyst assistant for an online business.
You have access to the following ad creative data (last selected window):

${lines.join("\n\n")}

Answer questions concisely. Use numbers from the data above when relevant.
Do not make up data not shown above. If asked about something outside this dataset, say so.
Keep responses short and direct — this is a chat interface, not a report.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
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

  // Fetch fresh data for context
  const window = (body.window ?? "7d") as "7d" | "14d" | "month";
  const { cards } = await fetchMainCreativeSpend(window).catch(() => ({ cards: [] }));
  const system = buildSystemPrompt(cards);

  // Stream back the response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system,
          messages,
        });

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
