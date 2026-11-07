import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";
import { costOf, type Cost } from "./pricing";

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

/** Food photos: vision model. The image is already resized to JPEG by prepareImage(). */
export async function photoReply(
  system: string,
  history: ChatTurn[],
  jpegBase64: string,
  instructions: string,
): Promise<AiReply> {
  const env = getEnv();
  const model = env.CLAUDE_VISION_MODEL;
  const withFallback = FALLBACK_MODELS.has(model);
  const res = await anthropic().beta.messages.create({
    model,
    max_tokens: 3000,
    output_config: { effort: env.CLAUDE_VISION_EFFORT },
    ...(withFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    system,
    messages: [
      ...history,
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpegBase64 } },
          { type: "text", text: instructions },
        ],
      },
    ],
  });
  return { text: textOf(res.content), model: res.model, refused: res.stop_reason === "refusal", cost: costOf(res.model, res.usage) };
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
