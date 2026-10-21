import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { loadScan } from "@/lib/reports";
import { localizeFinding } from "@/lib/finding-text";
import { SEVERITY_ORDER, type Severity } from "@/lib/security-checks";
import { uuidSchema } from "@/lib/validation";
import { SeverityBadge, StatusText } from "@/components/ui";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{scan.target.name}</h1>
          <p dir="ltr" className="break-all text-muted">{scan.target.url}</p>
          <p className="mt-2 text-sm">
            <StatusText status={scan.status} label={t.status[scan.status]} /> · {t.scans.started}: {new Date(scan.started_at).toLocaleString()}
            {scan.completed_at && <> · {t.scans.completed}: {new Date(scan.completed_at).toLocaleString()}</>}
          </p>
        </div>
        <a className="btn" href={`/scans/${scan.id}/report`}>{t.scans.report}</a>
      </div>

      {scan.status === "failed" && (
        <div role="alert" className="card border-red-400/40">
          <p className="font-semibold text-red-300">The scan failed — this is not a security finding.</p>
          <p className="text-muted" dir="ltr">{scan.error_message}</p>
        </div>
      )}

      {scan.status === "completed" && (
        <>
          <p className="text-muted">
            {issues} issue(s) found in {scan.findings.length} results. These checks are limited; no issues does not mean the site is completely secure.
          </p>
          <nav aria-label={t.scans.filter} className="flex flex-wrap gap-2 text-sm">
            <Link className={filter ? "btn-ghost" : "btn"} href={`/scans/${scan.id}`}>{t.scans.all}</Link>
            {SEVERITY_ORDER.map((s) => (
              <Link key={s} className={filter === s ? "btn" : "btn-ghost"} href={`/scans/${scan.id}?severity=${s}`}>
                {t.severity[s]} ({scan.findings.filter((f) => f.severity === s).length})
              </Link>
            ))}
          </nav>
          <div className="space-y-3">
            {shown.map((finding) => {
              const f = { ...finding, ...localizeFinding(finding, lang) };
              return (
              <article key={f.check_key + finding.title} className="card space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <SeverityBadge severity={f.severity} label={t.severity[f.severity]} />
                  <StatusText status={f.status} label={t.status[f.status]} />
                  <h2 className="font-semibold">{f.title}</h2>
                </div>
                <p className="text-muted">{f.description}</p>
                <p className="text-sm"><b>{t.scans.evidence}:</b> <code dir="ltr" className="break-all text-teal-strong">{f.evidence}</code></p>
                <p className="text-sm"><b>{t.scans.remediation}:</b> {f.remediation}</p>
                <p className="text-xs text-muted">{t.scans.confidence}: {f.confidence} · {f.check_key}</p>
              </article>
              );
            })}
            {shown.length === 0 && <p className="text-muted">—</p>}
          </div>
        </>
      )}
    </div>
  );
}
