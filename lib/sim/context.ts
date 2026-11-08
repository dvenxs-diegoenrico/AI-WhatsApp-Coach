import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Conversation simulator (QA). While a simulation runs, WhatsApp messages are captured
 * in `outbox` instead of being sent, and "downloaded" photos come from `images`.
 * Only used by /api/dev/simulate, which is protected by SIMULATOR_SECRET and fake 999… numbers.
 */
export interface SimContext {
  outbox: string[];
  images: Map<string, { data: Buffer; mimeType: string }>;
}

const storage = new AsyncLocalStorage<SimContext>();

export const simulation = {
  run<T>(ctx: SimContext, fn: () => Promise<T>): Promise<T> {
    return storage.run(ctx, fn);
  },
  current(): SimContext | undefined {
    return storage.getStore();
  },
};

/** Fake WhatsApp ids used by the simulator: 999 + 6–12 digits. Never real phone numbers. */
export const SIM_WA_ID = /^999\d{6,12}$/;
