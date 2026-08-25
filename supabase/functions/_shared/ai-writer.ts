/**
 * Anthropic (Claude) writer with Lovable AI fallback.
 *
 * Claude is the primary model for narrative / writing tasks. Every helper here
 * throws on any Anthropic failure so the caller can fall back to its existing
 * Lovable AI request. If ANTHROPIC_API_KEY is not set, `hasAnthropic()` is false
 * and callers skip Claude entirely.
 *
 * All Anthropic calls stream so long generations never sit silent long enough to
 * hit the edge function request timeout. No abort timers are used anywhere.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-5";

export type Provider = "anthropic" | "lovable";

export function anthropicModel(): string {
  return Deno.env.get("ANTHROPIC_MODEL")?.trim() || DEFAULT_MODEL;
}

export function hasAnthropic(): boolean {
  return !!Deno.env.get("ANTHROPIC_API_KEY")?.trim();
}

function requireKey(): string {
  const key = Deno.env.get("ANTHROPIC_API_KEY")?.trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  return key;
}

async function postAnthropic(body: Record<string, unknown>): Promise<Response> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": requireKey(),
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    if (res.status === 400) {
      console.error(`[ai-writer] Anthropic 400 (request bug, falling back): ${detail}`);
    } else {
      console.warn(`[ai-writer] Anthropic ${res.status}, falling back: ${detail}`);
    }
    throw new Error(`Anthropic error ${res.status}`);
  }

  return res;
}

/** Iterates Anthropic SSE frames as parsed events. */
async function* anthropicEvents(res: Response): AsyncGenerator<any> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        yield JSON.parse(payload);
      } catch (_e) {
        // ignore keepalives / partial frames
      }
    }
  }
}

/** Plain text generation via Claude. Returns the accumulated text. */
export async function anthropicText(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await postAnthropic({
    model: anthropicModel(),
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });

  let text = "";
  for await (const evt of anthropicEvents(res)) {
    if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
      text += evt.delta.text ?? "";
    }
  }

  if (!text.trim()) throw new Error("Anthropic returned empty text");
  return text;
}

/**
 * Structured JSON via Claude. Uses a single forced tool call, Anthropic's
 * equivalent of structured output, so the caller's existing JSON schema and
 * downstream parsing stay unchanged.
 */
export async function anthropicJson<T = unknown>(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  toolName?: string;
  description?: string;
  maxTokens?: number;
}): Promise<T> {
  const name = opts.toolName ?? "emit_result";
  const res = await postAnthropic({
    model: anthropicModel(),
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    tools: [
      {
        name,
        description: opts.description ?? "Return the result in the required shape.",
        input_schema: opts.schema,
      },
    ],
    tool_choice: { type: "tool", name },
  });

  let jsonText = "";
  for await (const evt of anthropicEvents(res)) {
    if (evt.type === "content_block_delta" && evt.delta?.type === "input_json_delta") {
      jsonText += evt.delta.partial_json ?? "";
    }
  }

  if (!jsonText.trim()) throw new Error("Anthropic returned no structured output");
  return JSON.parse(jsonText) as T;
}

/**
 * Streams Claude text, re-emitting it as OpenAI-style chat SSE frames
 * (`data: {"choices":[{"delta":{"content":"..."}}]}`) so existing frontend
 * stream parsers work unchanged.
 */
export async function anthropicTextStreamAsOpenAI(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<ReadableStream<Uint8Array>> {
  const res = await postAnthropic({
    model: anthropicModel(),
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const evt of anthropicEvents(res)) {
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            const frame = {
              choices: [{ index: 0, delta: { content: evt.delta.text ?? "" } }],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        console.error("[ai-writer] Anthropic stream failed mid-flight:", e);
        controller.error(e);
      }
    },
  });
}

/**
 * Runs `primary` (Claude) and falls back to `fallback` (Lovable AI) on any
 * Anthropic failure. One Anthropic attempt per request, never retried.
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<{ result: T; provider: Provider }> {
  if (hasAnthropic()) {
    try {
      return { result: await primary(), provider: "anthropic" };
    } catch (e) {
      console.warn("[ai-writer] falling back to Lovable AI:", e instanceof Error ? e.message : e);
    }
  }
  return { result: await fallback(), provider: "lovable" };
}
