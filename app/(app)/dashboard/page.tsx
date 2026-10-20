import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { SEVERITY_ORDER, type Severity } from "@/lib/security-checks";
import { SeverityBadge, Stat, StatusText } from "@/components/ui";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { supabase } = await requireUser();
  const { t } = await getDict();

  // All numbers come from the database; RLS limits every query to this user's rows.
  const [{ count: targetCount }, { data: scans }] = await Promise.all([
    supabase.from("targets").select("id", { count: "exact", head: true }),
    supabase.from("scans").select("id, target_id, status, started_at, targets(name)").order("started_at", { ascending: false }),
  ]);
  const allScans = scans ?? [];

  // Count failed findings in the latest completed scan of each target.
  const latestPerTarget = new Map<string, string>();
  for (const s of allScans) {
    if (s.status === "completed" && !latestPerTarget.has(s.target_id)) latestPerTarget.set(s.target_id, s.id);
  }
  const bySeverity: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  if (latestPerTarget.size > 0) {
    const { data: findings } = await supabase.from("findings").select("severity").eq("status", "failed").in("scan_id", [...latestPerTarget.values()]);
    for (const f of findings ?? []) bySeverity[f.severity as Severity]++;
  }
  const maxCount = Math.max(1, ...Object.values(bySeverity));

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">{t.dashboard.title}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t.dashboard.targets} value={targetCount ?? 0} />
        <Stat label={t.dashboard.scans} value={allScans.length} />
        <Stat label={t.dashboard.completed} value={allScans.filter((s) => s.status === "completed").length} />
        <Stat label={t.dashboard.failed} value={allScans.filter((s) => s.status === "failed").length} />
      </div>

      <section className="card">
        <h2 className="mb-4 font-semibold">{t.dashboard.bySeverity}</h2>
        <div className="space-y-2">
          {SEVERITY_ORDER.filter((s) => s !== "info").map((sev) => (
            <div key={sev} className="flex items-center gap-3">
              <div className="w-28"><SeverityBadge severity={sev} label={t.severity[sev]} /></div>
              <div className="h-3 flex-1 rounded bg-navy-800">
                <div className="h-3 rounded bg-teal" style={{ width: `${(bySeverity[sev] / maxCount) * 100}%` }} />
              </div>
              <span className="w-8 text-end tabular-nums">{bySeverity[sev]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-4 font-semibold">{t.dashboard.recent}</h2>
        {allScans.length === 0 ? (
          <p className="text-muted">{t.dashboard.none} <Link className="link" href="/targets">{t.targets.add}</Link></p>
        ) : (
          <table className="table">
            <thead><tr><th>{t.targets.name}</th><th>{t.scans.status}</th><th>{t.scans.started}</th></tr></thead>
            <tbody>
              {allScans.slice(0, 5).map((s) => (
                <tr key={s.id}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <td><Link className="link" href={`/scans/${s.id}`}>{(s.targets as any)?.name}</Link></td>
                  <td><StatusText status={s.status} label={t.status[s.status as keyof typeof t.status]} /></td>
                  <td>{new Date(s.started_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
