import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";
import { addCosts, costOf, type Cost } from "./pricing";

let client: Anthropic | undefined;
function anthropic(): Anthropic {
  client ??= new Anthropic({ apiKey: getEnv().ANTHROPIC_API_KEY, maxRetries: 2, timeout: 45_000 });
  return client;
}

export interface AiReply {
  text: string;
  model: string;
  refused: boolean;
  cost: Cost;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

function textOf(content: Array<{ type: string }>): string {
  return content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/**
 * Normal chat: fast, cheap model at low effort (short WhatsApp answers).
 * Prompt caching is deliberately not used: on this model the whole request costs a
 * fraction of a cent, and the history window changes every turn, so the cache would rarely hit.
 */
export async function chatReply(system: string, messages: ChatTurn[]): Promise<AiReply> {
  const model = getEnv().CLAUDE_CHAT_MODEL;
  const res = await anthropic().messages.create({
    model,
    max_tokens: 1500,
    output_config: { effort: "low" },
    system,
    messages,
  });
  return { text: textOf(res.content), model: res.model, refused: res.stop_reason === "refusal", cost: costOf(res.model, res.usage) };
}

// Models that accept server-side refusal fallbacks (a false-positive safety decline is retried automatically).
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1"]);

export type ToolRunner = (name: string, input: unknown) => Promise<{ result: string; isError: boolean }>;

/**
 * The coach: Claude with tools (log meals, weight, workouts, profile, progress).
 * Loops while the model calls tools, at most `maxRounds` times; the last round has tools
 * disabled so it always ends with a written reply.
 * The stable instructions (+ tool definitions, which come before them) are marked for prompt
 * caching; the per-user context is a second, uncached block.
 */
export async function coachReply(opts: {
  kind: "chat" | "photo";
  systemCore: string;
  systemUser: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  tools: Anthropic.Tool[];
  runTool: ToolRunner;
  maxRounds?: number;
}): Promise<AiReply & { toolsUsed: string[] }> {
  const env = getEnv();
  const model = opts.kind === "photo" ? env.CLAUDE_VISION_MODEL : env.CLAUDE_CHAT_MODEL;
  const withFallback = FALLBACK_MODELS.has(model);
  const messages = [...opts.messages];
  const maxRounds = opts.maxRounds ?? 4;
  const toolsUsed: string[] = [];
  let cost: Cost | null = null;

  for (let round = 1; ; round++) {
    const last = round >= maxRounds;
    const res = await anthropic().beta.messages.create({
      model,
      max_tokens: opts.kind === "photo" ? 3000 : 2000,
      output_config: { effort: opts.kind === "photo" ? env.CLAUDE_VISION_EFFORT : "low" },
      ...(withFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      system: [
        { type: "text", text: opts.systemCore, cache_control: { type: "ephemeral" } },
        { type: "text", text: opts.systemUser },
      ],
      tools: opts.tools as Anthropic.Beta.BetaTool[],
      ...(last ? { tool_choice: { type: "none" as const } } : {}),
      messages: withCacheBreakpoint(messages),
    });
    cost = addCosts(cost, costOf(res.model, res.usage));

    if (res.stop_reason === "refusal") return { text: "", model: res.model, refused: true, cost: cost!, toolsUsed };
    const calls = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || calls.length === 0) {
      return { text: textOf(res.content), model: res.model, refused: false, cost: cost!, toolsUsed };
    }

    messages.push({ role: "assistant", content: res.content as Anthropic.Beta.BetaContentBlockParam[] });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const call of calls) {
      // Sequential on purpose: tools update the same user (e.g. profile, then targets).
      const { result, isError } = await opts.runTool(call.name, call.input);
      toolsUsed.push(call.name);
      results.push({ type: "tool_result", tool_use_id: call.id, content: result, ...(isError ? { is_error: true } : {}) });
    }
    messages.push({ role: "user", content: results });
  }
}

/**
 * Marks the end of the conversation for prompt caching, so the next tool round (which re-sends
 * everything, including a photo) reads it from cache at ~10 % of the price. Returns a copy.
 */
function withCacheBreakpoint(messages: Anthropic.Beta.BetaMessageParam[]): Anthropic.Beta.BetaMessageParam[] {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || (lastMsg.role !== "user" && lastMsg.role !== "assistant") || !lastMsg.content) return messages;
  const blocks = (typeof lastMsg.content === "string" ? [{ type: "text", text: lastMsg.content }] : [...lastMsg.content]) as Array<Record<string, unknown>>;
  blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], cache_control: { type: "ephemeral" } };
  return [...messages.slice(0, -1), { ...lastMsg, content: blocks } as unknown as Anthropic.Beta.BetaMessageParam];
}

/**
 * Voice notes → text. Not connected yet (later milestone: pick a speech-to-text provider).
 * When it returns a transcript, the handler treats it exactly like a typed message.
 * `load` downloads the audio from WhatsApp only when needed.
 * The coach always answers in text; it never sends voice notes.
 */
export async function transcribeAudio(
  _load: () => Promise<{ data: Buffer; mimeType: string }>,
): Promise<string | null> {
  return null;
}
