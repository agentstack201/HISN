export const metadata = { title: "Setup required" };

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-2xl card space-y-3">
      <h1 className="text-2xl font-semibold">Supabase is not configured</h1>
      <p className="text-muted">
        Accounts, targets and scans are stored in Supabase. Copy <code>.env.example</code> to <code>.env.local</code>, fill in
        <code> NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, apply the SQL in
        <code> supabase/migrations/</code>, then restart the server. See README.md.
      </p>
    </div>
  );
}
