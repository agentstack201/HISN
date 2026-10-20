import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { createTarget } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import TargetFields from "@/components/TargetFields";

export const metadata = { title: "Targets" };

export default async function TargetsPage() {
  const { supabase } = await requireUser();
  const { t } = await getDict();
  const { data: targets } = await supabase.from("targets").select("id, name, url, created_at").order("created_at", { ascending: false });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="card lg:col-span-2 overflow-x-auto">
        <h1 className="mb-4 text-2xl font-semibold">{t.targets.title}</h1>
        {!targets?.length ? (
          <p className="text-muted">{t.targets.none}</p>
        ) : (
          <table className="table">
            <thead><tr><th>{t.targets.name}</th><th>{t.targets.url}</th></tr></thead>
            <tbody>
              {targets.map((target) => (
                <tr key={target.id}>
                  <td><Link className="link" href={`/targets/${target.id}`}>{target.name}</Link></td>
                  <td dir="ltr" className="break-all text-muted">{target.url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">{t.targets.add}</h2>
        <ActionForm action={createTarget} messages={{ saved: "✓" }}>
          <TargetFields t={t.targets} />
          <SubmitButton>{t.targets.save}</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
