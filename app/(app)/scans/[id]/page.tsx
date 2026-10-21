import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { loadScan, securityScore } from "@/lib/reports";
import { localizeFinding } from "@/lib/finding-text";
import { SEVERITY_ORDER, type Severity } from "@/lib/security-checks";
import { uuidSchema } from "@/lib/validation";
import { PageHeader, ScoreRing, SeverityBadge, StatusText } from "@/components/ui";
import CopyButton from "@/components/CopyButton";
import Reveal from "@/components/Reveal";

export const metadata = { title: "Scan details" };

export default async function ScanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ severity?: string }> }) {
  const { id } = await params;
  const { severity } = await searchParams;
  if (!uuidSchema.safeParse(id).success) notFound();
  const { supabase } = await requireUser();
  const { lang, t } = await getDict();
  const scan = await loadScan(supabase, id);
  if (!scan) notFound();

  const filter = SEVERITY_ORDER.includes(severity as Severity) ? (severity as Severity) : null;
  const shown = filter ? scan.findings.filter((f) => f.severity === filter) : scan.findings;
  const issues = scan.findings.filter((f) => f.status === "failed").length;
  const score = securityScore(scan.findings);

  return (
    <div className="space-y-6">
      <PageHeader title={scan.target.name} subtitle={scan.target.url}>
        <a className="btn" href={`/scans/${scan.id}/report`}>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          {t.scans.report}
        </a>
      </PageHeader>

      <p className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <StatusText status={scan.status} label={t.status[scan.status]} />
        <span className="text-muted">
          {t.scans.started}: {new Date(scan.started_at).toLocaleString()}
          {scan.completed_at && <> · {t.scans.completed}: {new Date(scan.completed_at).toLocaleString()}</>}
        </span>
      </p>

      {scan.status === "failed" && (
        <div role="alert" className="card border-red-400/40 bg-red-400/5">
          <p className="font-semibold text-red-300">{t.scans.failedNote}</p>
          <p className="mt-1 break-all font-mono text-sm text-muted" dir="ltr">
            {scan.error_message}
          </p>
        </div>
      )}

      {scan.status === "completed" && (
        <>
          <Reveal className="card">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <ScoreRing score={score.score} grade={score.grade} label={t.ui.score} caption={t.ui.scoreCaption} size={116} />
              <p className="max-w-sm text-sm text-muted">{t.scans.summary.replace("{issues}", String(issues)).replace("{total}", String(scan.findings.length))}</p>
            </div>
          </Reveal>

          {/* Severity filter as a segmented control; each option carries its count. */}
          <nav aria-label={t.scans.filter} className="flex flex-wrap gap-1.5 rounded-xl border border-navy-700 bg-navy-900/60 p-1.5 text-sm">
            <Link
              aria-current={filter ? undefined : "page"}
              className={`rounded-lg px-3 py-2 font-medium transition ${filter ? "text-muted hover:bg-navy-800 hover:text-ink" : "bg-cyan text-navy-950"}`}
              href={`/scans/${scan.id}`}
            >
              {t.scans.all} ({scan.findings.length})
            </Link>
            {SEVERITY_ORDER.map((s) => {
              const n = scan.findings.filter((f) => f.severity === s).length;
              const active = filter === s;
              return (
                <Link
                  key={s}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 font-medium transition ${active ? "bg-cyan text-navy-950" : n === 0 ? "text-muted/50 hover:bg-navy-800" : "text-muted hover:bg-navy-800 hover:text-ink"}`}
                  href={`/scans/${scan.id}?severity=${s}`}
                >
                  {t.severity[s]} ({n})
                </Link>
              );
            })}
          </nav>

          <div className="space-y-3">
            {shown.map((finding, i) => {
              const f = { ...finding, ...localizeFinding(finding, lang) };
              const sevBar: Record<Severity, string> = {
                critical: "bg-red-600",
                high: "bg-orange-500",
                medium: "bg-amber-300",
                low: "bg-sky-300",
                info: "bg-navy-700",
              };
              return (
                <Reveal as="article" key={f.check_key + finding.title} delay={Math.min(i, 6) * 50}>
                  <div className="card card-hover relative space-y-3 overflow-hidden ps-6">
                    {/* Severity bar on the inline start edge (correct in RTL and LTR). */}
                    <span aria-hidden className={`absolute inset-y-0 start-0 w-1.5 ${sevBar[f.severity]}`} />
                    <div className="flex flex-wrap items-center gap-3">
                      <SeverityBadge severity={f.severity} label={t.severity[f.severity]} />
                      <StatusText status={f.status} label={t.status[f.status]} />
                      <h2 className="font-semibold">{f.title}</h2>
                    </div>
                    <p className="text-muted">{f.description}</p>
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t.scans.evidence}</span>
                        <CopyButton value={f.evidence} label={t.ui.copy} copiedLabel={t.ui.copied} />
                      </div>
                      {/* bdi keeps English evidence readable inside Arabic text. */}
                      <bdi dir="ltr" className="block break-all rounded-lg bg-navy-950 px-3 py-2 font-mono text-xs text-teal-strong">
                        {f.evidence}
                      </bdi>
                    </div>
                    <p className="text-sm">
                      <b className="text-ink">{t.scans.remediation}:</b> <span className="text-muted">{f.remediation}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {t.scans.confidence}: {f.confidence} · <bdi dir="ltr">{f.check_key}</bdi>
                    </p>
                  </div>
                </Reveal>
              );
            })}
            {shown.length === 0 && <p className="rounded-xl border border-dashed border-navy-700 px-4 py-8 text-center text-muted">—</p>}
          </div>
        </>
      )}
    </div>
  );
}
