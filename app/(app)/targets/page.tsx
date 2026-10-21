import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { createTarget } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import TargetFields from "@/components/TargetFields";
import { EmptyState, PageHeader } from "@/components/ui";
import Reveal from "@/components/Reveal";

export const metadata = { title: "Targets" };

export default async function TargetsPage() {
  const { supabase } = await requireUser();
  const { t } = await getDict();
  const { data: targets } = await supabase.from("targets").select("id, name, url, created_at").order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title={t.targets.title} subtitle={t.scans.networkNote} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          {!targets?.length ? (
            <EmptyState title={t.ui.emptyTargetsTitle} text={t.ui.emptyTargetsText} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {targets.map((target, i) => (
                <Reveal as="li" key={target.id} delay={Math.min(i, 6) * 60}>
                  <Link href={`/targets/${target.id}`} className="card card-hover group flex h-full items-start gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">
                    <span aria-hidden className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-cyan transition-colors group-hover:bg-cyan group-hover:text-navy-950">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{target.name}</span>
                      <bdi dir="ltr" className="mt-0.5 block truncate text-sm text-muted">{target.url}</bdi>
                    </span>
                    <span aria-hidden className="text-muted transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="rtl:rotate-180">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </ul>
          )}
        </section>
        <section className="card h-fit">
          <h2 className="mb-4 text-lg font-semibold">{t.targets.add}</h2>
          <ActionForm action={createTarget} messages={{ saved: t.ui.targetSaved }}>
            <TargetFields t={t.targets} />
            <SubmitButton className="btn w-full" pendingLabel={t.ui.saving}>{t.targets.save}</SubmitButton>
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
