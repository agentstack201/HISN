import { requireUser } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { updateProfile } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const { t } = await getDict();
  const { data: profile } = await supabase.from("profiles").select("display_name, preferred_language").eq("id", user.id).single();

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />
      <div className="card">
      <p className="mb-5 flex items-center gap-2 text-sm text-muted">
        <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-navy-800 text-cyan">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
        </span>
        <bdi dir="ltr">{user.email}</bdi>
      </p>
      <ActionForm action={updateProfile} messages={{ saved: t.settings.saved }}>
        <div>
          <label className="label" htmlFor="display_name">{t.settings.displayName}</label>
          <input className="input" id="display_name" name="display_name" maxLength={60} defaultValue={profile?.display_name ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="lang">{t.settings.language}</label>
          {/* "preferred_language" is saved to the profile; "lang" sets the interface cookie. */}
          <select className="input" id="lang" name="preferred_language" defaultValue={profile?.preferred_language ?? "en"}>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </div>
        <SubmitButton pendingLabel={t.ui.saving}>{t.settings.save}</SubmitButton>
      </ActionForm>
      </div>
    </div>
  );
}
