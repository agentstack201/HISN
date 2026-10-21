/**
 * Supabase client for server code (Server Components, Server Actions, Route Handlers).
 * It uses the public anon key + the user's session cookie, so every query runs
 * AS THE LOGGED-IN USER and Row Level Security applies. No service-role key is used.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component where cookies are read-only; middleware refreshes them.
        }
      },
    },
  });
}

/** Returns the client and the verified user, or redirects to /login. */
export async function requireUser() {
  if (!supabaseConfigured) redirect("/setup");
  const supabase = await createClient();
  // getUser() verifies the token with Supabase Auth (getSession() would trust the cookie).
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}
