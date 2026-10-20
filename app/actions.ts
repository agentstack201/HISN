"use server";
/**
 * Server Actions: every form in HISN posts to one of these functions.
 * They run only on the server. Each one validates input with Zod and uses the
 * user's own Supabase session, so Row Level Security enforces data ownership
 * in the database as a second line of defence.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { credentialsSchema, profileSchema, targetSchema, uuidSchema } from "@/lib/validation";
import { runScan } from "@/lib/scanner";

export interface FormState {
  error?: string;
  message?: string;
}

// ---------- Authentication ----------

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Same message for unknown email and wrong password (no account enumeration).
  if (error) return { error: "Invalid email or password" };
  redirect("/dashboard");
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) return { error: error.message };
  if (data.session) redirect("/dashboard"); // email confirmation disabled
  return { message: "check-email" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ---------- Settings ----------

export async function setLanguage(form: FormData) {
  const lang = form.get("lang") === "en" ? "en" : "ar";
  (await cookies()).set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: "Could not save settings" };
  (await cookies()).set("lang", parsed.data.preferred_language, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { message: "saved" };
}

// ---------- Targets ----------

export async function createTarget(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const parsed = targetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase.from("targets").insert({ user_id: user.id, name: parsed.data.name, url: parsed.data.url });
  if (error) return { error: error.code === "23505" ? "You already saved this URL" : "Could not save target" };
  revalidatePath("/targets");
  return { message: "saved" };
}

export async function updateTarget(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const id = uuidSchema.safeParse(form.get("id"));
  const parsed = targetSchema.safeParse(Object.fromEntries(form));
  if (!id.success) return { error: "Invalid target" };
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  // The user_id filter means another user's target id simply matches nothing.
  const { data, error } = await supabase
    .from("targets")
    .update({ name: parsed.data.name, url: parsed.data.url })
    .eq("id", id.data)
    .eq("user_id", user.id)
    .select("id");
  if (error || !data?.length) return { error: "Could not update target" };
  revalidatePath(`/targets/${id.data}`);
  return { message: "saved" };
}

export async function deleteTarget(form: FormData) {
  const { supabase, user } = await requireUser();
  const id = uuidSchema.safeParse(form.get("id"));
  if (id.success) await supabase.from("targets").delete().eq("id", id.data).eq("user_id", user.id);
  revalidatePath("/targets");
  redirect("/targets");
}

// ---------- Scans ----------

const MAX_SCANS_PER_WINDOW = 5;
const WINDOW_MINUTES = 10;
const MAX_CONCURRENT_SCANS = 3; // per server process
let runningScans = 0;

export async function startScan(_prev: FormState, form: FormData): Promise<FormState> {
  // Live scanning must be switched on explicitly after the network protections are verified.
  if (process.env.LIVE_SCANNING_ENABLED !== "true") {
    return { error: "Live scanning is disabled on this deployment (LIVE_SCANNING_ENABLED is not true)." };
  }
  const { supabase, user } = await requireUser();
  const id = uuidSchema.safeParse(form.get("target_id"));
  if (!id.success) return { error: "Invalid target" };

  // Never trust the target id from the browser: load it with an ownership filter.
  const { data: target } = await supabase.from("targets").select("id, url").eq("id", id.data).eq("user_id", user.id).single();
  if (!target) return { error: "Target not found" };

  // Rate limit: a few scans per user per time window, one running scan per target.
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count } = await supabase.from("scans").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("started_at", since);
  if ((count ?? 0) >= MAX_SCANS_PER_WINDOW) {
    return { error: `Limit reached: ${MAX_SCANS_PER_WINDOW} scans per ${WINDOW_MINUTES} minutes. Please wait.` };
  }
  const { count: running } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("target_id", target.id)
    .eq("status", "running")
    .gte("started_at", new Date(Date.now() - 2 * 60_000).toISOString());
  if ((running ?? 0) > 0) return { error: "A scan for this target is already running" };
  if (runningScans >= MAX_CONCURRENT_SCANS) return { error: "The server is busy. Try again in a moment." };

  const { data: scan, error } = await supabase.from("scans").insert({ user_id: user.id, target_id: target.id }).select("id").single();
  if (error || !scan) return { error: "Could not start scan" };

  runningScans++;
  let result;
  try {
    result = await runScan(target.url);
  } finally {
    runningScans--;
  }

  if (result.findings.length > 0) {
    const { error: insertError } = await supabase.from("findings").insert(result.findings.map((f) => ({ ...f, scan_id: scan.id })));
    if (insertError) result = { status: "failed" as const, findings: [], error: "Could not save findings" };
  }
  await supabase
    .from("scans")
    .update({ status: result.status, completed_at: new Date().toISOString(), error_message: result.error })
    .eq("id", scan.id);

  redirect(`/scans/${scan.id}`);
}
