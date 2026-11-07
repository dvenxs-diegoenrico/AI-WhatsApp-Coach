import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

let client: SupabaseClient | undefined;

/**
 * Server-side Supabase client using the service role key (bypasses RLS).
 * Only used in API routes. The key has no NEXT_PUBLIC_ prefix, so Next.js never sends it to the browser.
 */
export function db(): SupabaseClient {
  if (client) return client;
  const env = getEnv();
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export const PHOTOS_BUCKET = "photos";
