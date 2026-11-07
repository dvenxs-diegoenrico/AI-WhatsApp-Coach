import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";

let client: Anthropic | undefined;
function anthropic(): Anthropic {
  client ??= new Anthropic({ apiKey: getEnv().ANTHROPIC_API_KEY, maxRetries: 2, timeout: 45_000 });
  return client;
}

export interface AiReply {
  text: string;
  model: string;
  refused: boolean;
}

function textOf(content: Array<{ type: string }>): string {
  return content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Normal chat: fast model, low effort (short WhatsApp answers). */
export async function chatReply(system: string, messages: Anthropic.MessageParam[]): Promise<AiReply> {
  const model = getEnv().CLAUDE_CHAT_MODEL;
  const res = await anthropic().messages.create({
    model,
    max_tokens: 2048,
    output_config: { effort: "low" },
    system,
    messages,
  });
  return { text: textOf(res.content), model: res.model, refused: res.stop_reason === "refusal" };
}

// Models that accept server-side refusal fallbacks (a false-positive safety decline gets retried automatically).
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1"]);

export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/** Food photos: stronger vision model. */
export async function photoReply(
  system: string,
  history: Anthropic.Beta.BetaMessageParam[],
  image: { base64: string; mediaType: ImageMediaType },
  instructions: string,
): Promise<AiReply> {
  const model = getEnv().CLAUDE_VISION_MODEL;
  const withFallback = FALLBACK_MODELS.has(model);
  const res = await anthropic().beta.messages.create({
    model,
    max_tokens: 4096,
    output_config: { effort: "medium" },
    ...(withFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    system,
    messages: [
      ...history,
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
          { type: "text", text: instructions },
        ],
      },
    ],
  });
  return { text: textOf(res.content), model: res.model, refused: res.stop_reason === "refusal" };
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
