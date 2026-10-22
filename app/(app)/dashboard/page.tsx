import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { SEVERITY_ORDER, type Severity } from "@/lib/security-checks";
import { securityScore } from "@/lib/reports";
import { EmptyState, PageHeader, ScoreRing, SeverityBadge, Stat, StatusText } from "@/components/ui";
import Reveal from "@/components/Reveal";

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

  // The latest completed scan of each target decides the current issue counts.
  const latestPerTarget = new Map<string, string>();
  for (const s of allScans) {
    if (s.status === "completed" && !latestPerTarget.has(s.target_id)) latestPerTarget.set(s.target_id, s.id);
  }
  const bySeverity: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let latestFindings: { severity: Severity; status: string }[] = [];
  if (latestPerTarget.size > 0) {
    const { data: findings } = await supabase.from("findings").select("severity, status").in("scan_id", [...latestPerTarget.values()]);
    latestFindings = (findings ?? []) as typeof latestFindings;
    for (const f of latestFindings) if (f.status === "failed") bySeverity[f.severity]++;
  }
  const maxCount = Math.max(1, ...Object.values(bySeverity));
  // Average score across the latest scan of every target (same rule as the PDF report).
  const score = latestFindings.length ? securityScore(latestFindings as never) : null;

  return (
    <div className="space-y-8">
      <PageHeader title={t.dashboard.title} subtitle={t.scans.networkNote} />

      {allScans.length === 0 && targetCount === 0 ? (
        <EmptyState title={t.ui.emptyDashTitle} text={t.ui.emptyDashText}>
          <Link href="/targets" className="btn mt-2">
            {t.targets.add}
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t.dashboard.targets} value={targetCount ?? 0} accent="cyan" />
            <Stat label={t.dashboard.scans} value={allScans.length} accent="muted" />
            <Stat label={t.dashboard.completed} value={allScans.filter((s) => s.status === "completed").length} accent="teal" />
            <Stat label={t.dashboard.failed} value={allScans.filter((s) => s.status === "failed").length} accent="red" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Reveal as="section" className="card">
              <h2 className="mb-4 font-semibold">{t.ui.score}</h2>
              {score ? (
                <ScoreRing score={score.score} grade={score.grade} label={t.ui.score} caption={t.ui.scoreCaption} />
              ) : (
                <p className="text-muted">{t.ui.scoreNone}</p>
              )}
            </Reveal>

            <Reveal as="section" delay={80} className="card">
              <h2 className="mb-4 font-semibold">{t.dashboard.bySeverity}</h2>
              <div className="space-y-2.5">
                {SEVERITY_ORDER.filter((s) => s !== "info").map((sev, i) => (
                  <div key={sev} className="flex items-center gap-3">
                    <div className="w-24 shrink-0">
                      <SeverityBadge severity={sev} label={t.severity[sev]} />
                    </div>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-navy-800">
                      {/* The bar grows from the inline start when the card appears. */}
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal to-cyan"
                        style={{
                          width: `${(bySeverity[sev] / maxCount) * 100}%`,
                          animation: `grow-x var(--duration-slow) var(--ease-out-soft) ${i * 70}ms both`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-end tabular-nums">{bySeverity[sev]}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal as="section" className="card overflow-x-auto">
            <h2 className="mb-4 font-semibold">{t.dashboard.recent}</h2>
            {allScans.length === 0 ? (
              <p className="text-muted">
                {t.dashboard.none}{" "}
                <Link className="link" href="/targets">
                  {t.targets.add}
                </Link>
              </p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t.targets.name}</th>
                    <th>{t.scans.status}</th>
                    <th>{t.scans.started}</th>
                  </tr>
                </thead>
                <tbody>
                  {allScans.slice(0, 5).map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link className="link" href={`/scans/${s.id}`}>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {(s.targets as any)?.name}
                        </Link>
                      </td>
                      <td>
                        <StatusText status={s.status} label={t.status[s.status as keyof typeof t.status]} />
                      </td>
                      <td className="text-muted">{new Date(s.started_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Reveal>
        </>
      )}
    </div>
  );
}
