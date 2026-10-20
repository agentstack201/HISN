import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { uuidSchema } from "@/lib/validation";
import { deleteTarget, startScan, updateTarget } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import TargetFields from "@/components/TargetFields";
import { StatusText } from "@/components/ui";

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{target.name}</h1>
          <p dir="ltr" className="break-all text-muted">{target.url}</p>
        </div>
        <ActionForm action={startScan} className="flex flex-col items-end gap-2">
          <input type="hidden" name="target_id" value={target.id} />
          <SubmitButton>{t.targets.scan}</SubmitButton>
          {!scanningEnabled && <p className="text-xs text-amber-300">Live scanning is disabled on this deployment.</p>}
        </ActionForm>
      </div>
      <p className="text-sm text-muted">{t.scans.networkNote}</p>

      <section className="card overflow-x-auto">
        <h2 className="mb-4 font-semibold">{t.targets.history}</h2>
        {!scans?.length ? (
          <p className="text-muted">{t.scans.none}</p>
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
        <ActionForm action={updateTarget} messages={{ saved: "✓" }}>
          <input type="hidden" name="id" value={target.id} />
          <TargetFields t={t.targets} name={target.name} url={target.url} />
          <SubmitButton>{t.targets.save}</SubmitButton>
        </ActionForm>
        <form action={deleteTarget} className="mt-6 border-t border-navy-800 pt-4">
          <input type="hidden" name="id" value={target.id} />
          <SubmitButton className="btn-danger">{t.targets.delete}</SubmitButton>
          <p className="mt-2 text-xs text-muted">Deleting a target also deletes its scans and findings.</p>
        </form>
      </section>
    </div>
  );
}
