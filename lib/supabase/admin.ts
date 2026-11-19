/**
 * Server-only Supabase client with the secret key. It bypasses Row Level Security,
 * so it is used for one thing only: creating accounts that are already confirmed.
 * Never import this from a client component, and never prefix the key with NEXT_PUBLIC_.
 */
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
