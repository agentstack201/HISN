import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { formatDateTime, getDict } from "@/lib/i18n";
import { uuidSchema } from "@/lib/validation";
import { localizeFinding } from "@/lib/finding-text";
import { EmptyState, PageHeader, StatusText } from "@/components/ui";

export const metadata = { title: "Scan history" };

export default async function ScansPage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { supabase } = await requireUser();
  const { lang, t } = await getDict();
  const { a, b } = await searchParams;
  const { data: scans } = await supabase.from("scans").select("id, status, started_at, target_id, targets(name)").order("started_at", { ascending: false }).limit(100);

  // Comparison: show each check's status side by side for two selected scans.
  type Row = { key: string; title: string; a?: string; b?: string };
  let comparison: Row[] | null = null;
  if (uuidSchema.safeParse(a).success && uuidSchema.safeParse(b).success) {
    const { data: rows } = await supabase.from("findings").select("scan_id, check_key, title, status").in("scan_id", [a, b]);
    const byKey = new Map<string, Row>();
    for (const r of rows ?? []) {
      const entry: Row = byKey.get(r.check_key) ?? { key: r.check_key, title: r.title };
      if (r.scan_id === a) entry.a = r.status;
      else entry.b = r.status;
      entry.title = localizeFinding(r, lang).title;
      byKey.set(r.check_key, entry);
    }
    comparison = [...byKey.values()].sort((x, y) => x.key.localeCompare(y.key));
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t.scans.title} subtitle={t.scans.networkNote} />
      {!scans?.length ? (
        <EmptyState title={t.ui.emptyScansTitle} text={t.ui.emptyScansText} />
      ) : (
        <form className="card overflow-x-auto" method="get">
          <table className="table">
            <thead><tr><th>A</th><th>B</th><th>{t.targets.name}</th><th>{t.scans.status}</th><th>{t.scans.started}</th></tr></thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id}>
                  <td><input type="radio" name="a" value={s.id} defaultChecked={s.id === a} aria-label="Compare as A" disabled={s.status !== "completed"} /></td>
                  <td><input type="radio" name="b" value={s.id} defaultChecked={s.id === b} aria-label="Compare as B" disabled={s.status !== "completed"} /></td>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <td><Link className="link" href={`/scans/${s.id}`}>{(s.targets as any)?.name}</Link></td>
                  <td><StatusText status={s.status} label={t.status[s.status as keyof typeof t.status]} /></td>
                  <td>{formatDateTime(s.started_at, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn mt-4">
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 7h12m0 0-3-3m3 3-3 3M16 17H4m0 0 3-3m-3 3 3 3" /></svg>
            {t.scans.compare}
          </button>
        </form>
      )}

      {comparison && (
        <section className="card overflow-x-auto">
          <h2 className="mb-4 font-semibold">{t.scans.compare}</h2>
          <table className="table">
            <thead><tr><th>Check</th><th>A</th><th>B</th></tr></thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.key} className={row.a !== row.b ? "bg-cyan/5" : ""}>
                  <td>{row.title}<div className="text-xs text-muted">{row.key}</div></td>
                  <td>{row.a ? <StatusText status={row.a} label={t.status[row.a as keyof typeof t.status]} /> : "—"}</td>
                  <td>{row.b ? <StatusText status={row.b} label={t.status[row.b as keyof typeof t.status]} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
