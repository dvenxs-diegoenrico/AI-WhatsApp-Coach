/**
 * Claude prices in US$ per million tokens (Claude API, November 2026).
 * Used only to log what each reply cost; update if Anthropic changes prices.
 * Thinking tokens are billed as output and are already included in output_tokens.
 */
const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
};

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export interface Cost {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export function costOf(model: string, usage: Usage): Cost {
  const p = PRICES[model] ?? PRICES[Object.keys(PRICES).find((k) => model.startsWith(k)) ?? ""];
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const inputTokens = usage.input_tokens + cacheRead + cacheWrite;
  const costUsd = p
    ? (usage.input_tokens * p.input + cacheRead * p.cacheRead + cacheWrite * p.cacheWrite + usage.output_tokens * p.output) / 1e6
    : 0;
  return { inputTokens, outputTokens: usage.output_tokens, costUsd: Math.round(costUsd * 1e6) / 1e6 };
}

export function addCosts(a: Cost | null, b: Cost | null): Cost | null {
  if (!a) return b;
  if (!b) return a;
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    costUsd: Math.round((a.costUsd + b.costUsd) * 1e6) / 1e6,
  };
}
