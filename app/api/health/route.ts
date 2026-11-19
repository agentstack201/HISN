/** Reports whether the server can reach Supabase. Shows no secrets: only the public host and yes/no flags. */
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  let supabaseHost = "missing";
  try {
    if (url) supabaseHost = new URL(url).host;
  } catch {
    supabaseHost = "invalid URL";
  }

  const report: Record<string, unknown> = {
    supabaseHost,
    anonKeySet: anon.length > 0,
    secretKeySet: Boolean(process.env.SUPABASE_SECRET_KEY),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    region: process.env.VERCEL_REGION ?? null,
  };

  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anon }, cache: "no-store" });
    report.authHealth = res.status;
  } catch (e) {
    const cause = (e as { cause?: { code?: string; message?: string } }).cause;
    report.authHealth = "unreachable";
    report.error = e instanceof Error ? e.message : String(e);
    report.cause = cause?.code ?? cause?.message ?? null;
  }

  return Response.json(report, { headers: { "Cache-Control": "no-store" } });
}
