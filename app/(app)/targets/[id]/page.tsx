import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { uuidSchema } from "@/lib/validation";
import { deleteTarget, startScan, updateTarget } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import TargetFields from "@/components/TargetFields";
import { EmptyState, PageHeader, StatusText } from "@/components/ui";
import Reveal from "@/components/Reveal";

export const metadata = { title: "Target" };

export default async function TargetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const { supabase } = await requireUser();
  const { t } = await getDict();

  const { data: target } = await supabase.from("targets").select("id, name, url").eq("id", id).single();
  if (!target) notFound(); // RLS hides other users' targets, so this also covers "not yours"
  const { data: scans } = await supabase.from("scans").select("id, status, started_at, completed_at").eq("target_id", id).order("started_at", { ascending: false });
  const scanningEnabled = process.env.LIVE_SCANNING_ENABLED === "true";

  return (
    <div className="space-y-6">
      <PageHeader title={target.name} subtitle={target.url}>
        <ActionForm action={startScan} className="flex flex-col items-end gap-2">
          <input type="hidden" name="target_id" value={target.id} />
          <SubmitButton className="btn-hero min-h-11 px-6 py-2 text-sm" pendingLabel={t.ui.scanning}>
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            {t.targets.scan}
          </SubmitButton>
          {!scanningEnabled && <p className="text-xs text-warm">Live scanning is disabled on this deployment.</p>}
        </ActionForm>
      </PageHeader>
      <p className="-mt-2 text-sm text-muted">{t.scans.networkNote} {t.ui.scanRunning}</p>

      <section className="card overflow-x-auto">
        <h2 className="mb-4 font-semibold">{t.targets.history}</h2>
        {!scans?.length ? (
          <EmptyState title={t.ui.emptyScansTitle} text={t.ui.emptyScansText} />
        ) : (
          <table className="table">
            <thead><tr><th>{t.scans.started}</th><th>{t.scans.status}</th><th></th></tr></thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.started_at).toLocaleString()}</td>
                  <td><StatusText status={s.status} label={t.status[s.status as keyof typeof t.status]} /></td>
                  <td><Link className="link" href={`/scans/${s.id}`}>→</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card max-w-xl">
        <h2 className="mb-4 font-semibold">{t.targets.edit}</h2>
        <ActionForm action={updateTarget} messages={{ saved: t.ui.targetSaved }}>
          <input type="hidden" name="id" value={target.id} />
          <TargetFields t={t.targets} name={target.name} url={target.url} />
          <SubmitButton pendingLabel={t.ui.saving}>{t.targets.save}</SubmitButton>
        </ActionForm>
        <form action={deleteTarget} className="mt-6 border-t border-navy-800 pt-4">
          <input type="hidden" name="id" value={target.id} />
          <SubmitButton className="btn-danger" pendingLabel={t.ui.saving}>{t.targets.delete}</SubmitButton>
          <p className="mt-2 text-xs text-muted">Deleting a target also deletes its scans and findings.</p>
        </form>
      </section>
    </div>
  );
}
