import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages";
import * as fs from "fs";
import * as path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

const ROOT = process.cwd();

// ─── Security check ──────────────────────────────────────────────────────────

function safePath(rel: string): { ok: true; abs: string } | { ok: false; error: string } {
  // Resolve relative to cwd
  const abs = path.resolve(ROOT, rel);

  // Must stay within root
  if (!abs.startsWith(ROOT + path.sep) && abs !== ROOT) {
    return { ok: false, error: `Path '${rel}' is outside the project root.` };
  }

  // Block node_modules, .next
  const rel2 = path.relative(ROOT, abs);
  const parts = rel2.split(path.sep);
  if (parts[0] === "node_modules" || parts[0] === ".next") {
    return { ok: false, error: `Path '${rel}' is not allowed (node_modules / .next).` };
  }

  // Block .env files
  const base = path.basename(abs);
  if (base.startsWith(".env")) {
    return { ok: false, error: `Path '${rel}' is not allowed (.env files are protected).` };
  }

  return { ok: true, abs };
}

// ─── Tools ───────────────────────────────────────────────────────────────────

function toolReadFile(filePath: string): string {
  const checked = safePath(filePath);
  if (!checked.ok) return checked.error;
  try {
    return fs.readFileSync(checked.abs, "utf-8");
  } catch (e) {
    return `Error reading file: ${e instanceof Error ? e.message : String(e)}`;
  }
}

function toolListDirectory(dirPath: string): string {
  const checked = safePath(dirPath);
  if (!checked.ok) return checked.error;
  try {
    const entries = fs.readdirSync(checked.abs, { withFileTypes: true });
    return entries
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .join("\n");
  } catch (e) {
    return `Error listing directory: ${e instanceof Error ? e.message : String(e)}`;
  }
}

function toolWriteFile(filePath: string, content: string): string {
  const checked = safePath(filePath);
  if (!checked.ok) return checked.error;
  try {
    const dir = path.dirname(checked.abs);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(checked.abs, content, "utf-8");
    return `Successfully wrote ${filePath}`;
  } catch (e) {
    return `Error writing file: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read the full contents of a source file. Always read a file before modifying it.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Relative path from project root, e.g. components/ads/GradeBreakdownView.tsx" },
      },
      required: ["path"],
    },
  },
  {
    name: "list_directory",
    description: "List all entries in a directory (files and subdirectories).",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Relative path from project root, e.g. components/ads" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Overwrite a file completely with new content. Must provide the COMPLETE file contents, not diffs or partials.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Relative path from project root" },
        content: { type: "string", description: "Complete new file contents" },
      },
      required: ["path", "content"],
    },
  },
];

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI coding assistant embedded in the Mendoza Baseball Academy dashboard — a Next.js 15 (App Router) TypeScript app.

Tech stack: TypeScript, Tailwind CSS v4, inline styles for CSS variable values, dark theme only, Lucide React icons.

Key directories:
- app/           → Next.js pages + API routes
- components/    → React components (components/ads/ for ad attribution)
- lib/           → Data fetching (meta.ts, gradeLeads.ts, callSourceLeads.ts, funnel.ts)

Rules:
1. Always read a file before modifying it
2. When writing a file, provide COMPLETE file contents (not diffs/partials)
3. Make minimal targeted changes
4. Never touch: .env files, node_modules/, .next/, package-lock.json
5. After changes, briefly explain what you did`;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  let body: { message: string; history?: MessageParam[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, history = [] } = body;
  if (!message?.trim()) {
    return Response.json({ error: "message required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(obj: object) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      }

      // Build initial messages from history + new user message
      const messages: MessageParam[] = [
        ...history,
        { role: "user", content: message },
      ];

      const filesChanged: string[] = [];
      let iteration = 0;
      const MAX_ITERATIONS = 15;

      try {
        while (iteration < MAX_ITERATIONS) {
          iteration++;

          const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 8192,
            system: SYSTEM_PROMPT,
            tools: TOOLS,
            messages,
          });

          // Add assistant response to message history
          messages.push({ role: "assistant", content: response.content });

          if (response.stop_reason === "tool_use") {
            // Execute all tool calls
            const toolResults: ToolResultBlockParam[] = [];

            for (const block of response.content) {
              if (block.type !== "tool_use") continue;

              const toolName = block.name;
              const toolInput = block.input as Record<string, string>;
              let result = "";

              if (toolName === "read_file") {
                emit({ type: "status", text: `Reading ${toolInput.path}` });
                result = toolReadFile(toolInput.path);
              } else if (toolName === "list_directory") {
                emit({ type: "status", text: `Listing ${toolInput.path}` });
                result = toolListDirectory(toolInput.path);
              } else if (toolName === "write_file") {
                emit({ type: "status", text: `Writing ${toolInput.path}` });
                result = toolWriteFile(toolInput.path, toolInput.content);
                if (!result.startsWith("Error")) {
                  if (!filesChanged.includes(toolInput.path)) {
                    filesChanged.push(toolInput.path);
                  }
                }
              } else {
                result = `Unknown tool: ${toolName}`;
              }

              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: result,
              });
            }

            // Add tool results to messages and continue loop
            messages.push({ role: "user", content: toolResults });
            continue;
          }

          // end_turn or other stop reason — emit final text
          if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
            for (const block of response.content) {
              if (block.type === "text") {
                // Split by words and emit as delta events
                const words = block.text.split(/(\s+)/);
                for (const chunk of words) {
                  if (chunk) {
                    emit({ type: "delta", text: chunk });
                  }
                }
              }
            }
            break;
          }

          // Unexpected stop reason — break out
          break;
        }

        emit({ type: "done", filesChanged });
      } catch (e) {
        emit({ type: "delta", text: `\n\nError: ${e instanceof Error ? e.message : String(e)}` });
        emit({ type: "done", filesChanged });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
