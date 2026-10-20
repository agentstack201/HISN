import Link from "next/link";
import { ActionForm, SubmitButton } from "./forms";
import { signIn, signUp } from "@/app/actions";
import { getDict } from "@/lib/i18n";
import { supabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** Login and registration share one form; `mode` chooses the server action. */
export default async function AuthForm({ mode }: { mode: "login" | "register" }) {
  if (!supabaseConfigured) redirect("/setup");
  const { t } = await getDict();
  const isLogin = mode === "login";
  return (
    <div className="mx-auto max-w-sm card">
      <h1 className="mb-5 text-2xl font-semibold">{isLogin ? t.auth.loginTitle : t.auth.registerTitle}</h1>
      <ActionForm action={isLogin ? signIn : signUp} messages={{ "check-email": t.auth.checkEmail }}>
        <div>
          <label className="label" htmlFor="email">{t.auth.email}</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">{t.auth.password}</label>
          <input className="input" id="password" name="password" type="password" minLength={8} autoComplete={isLogin ? "current-password" : "new-password"} required />
        </div>
        <SubmitButton className="btn w-full">{isLogin ? t.auth.submitLogin : t.auth.submitRegister}</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-sm text-muted">
        {isLogin ? t.auth.noAccount : t.auth.haveAccount}{" "}
        <Link className="link" href={isLogin ? "/register" : "/login"}>{isLogin ? t.nav.register : t.nav.login}</Link>
      </p>
    </div>
  );
}
