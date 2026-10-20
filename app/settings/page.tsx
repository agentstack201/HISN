import { requireUser } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { updateProfile } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const { t } = await getDict();
  const { data: profile } = await supabase.from("profiles").select("display_name, preferred_language").eq("id", user.id).single();

  return (
    <div className="mx-auto max-w-md card">
      <h1 className="mb-1 text-2xl font-semibold">{t.settings.title}</h1>
      <p className="mb-5 text-sm text-muted" dir="ltr">{user.email}</p>
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
        <SubmitButton>{t.settings.save}</SubmitButton>
      </ActionForm>
    </div>
  );
}
