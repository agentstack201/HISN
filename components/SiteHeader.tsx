/**
 * Site-wide header. It floats over the homepage video (absolute + gradient)
 * and inner pages add top padding for it in app/(app)/layout.tsx.
 * The mobile menu uses <details>, so it works without any client JavaScript.
 */
import Link from "next/link";
import { setLanguage, signOut } from "@/app/actions";
import type { Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  loggedIn: boolean;
  t: Record<"home" | "features" | "how" | "resources" | "about" | "start" | "menu" | "dashboard" | "targets" | "scans" | "settings" | "login" | "logout", string>;
  appName: string;
}

export default function SiteHeader({ lang, loggedIn, t, appName }: Props) {
  const links = loggedIn
    ? [["/dashboard", t.dashboard], ["/targets", t.targets], ["/scans", t.scans], ["/settings", t.settings], ["/help", t.resources]]
    : [["/", t.home], ["/#features", t.features], ["/#how", t.how], ["/help", t.resources], ["/#about", t.about]];

  const languageSwitch = (
    <form action={setLanguage}>
      <input type="hidden" name="lang" value={lang === "ar" ? "en" : "ar"} />
      <button className="rounded-full border border-white/10 px-3 py-2 text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-cyan" aria-label="Switch language">
        {lang === "ar" ? "EN" : "عربي"}
      </button>
    </form>
  );
  const account = loggedIn ? (
    <form action={signOut}><button className="btn-ghost rounded-full">{t.logout}</button></form>
  ) : (
    <>
      <Link href="/login" className="btn-ghost rounded-full">{t.login}</Link>
      <Link href="/register" className="btn-hero min-h-10 px-5 py-2 text-sm">{t.start}</Link>
    </>
  );

  return (
    <header className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-navy-950/95 via-navy-950/60 to-transparent">
      <nav aria-label="Main" className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-cyan" aria-label={appName}>
          {/* eslint-disable-next-line @next/next/no-img-element -- small static logo; "lighten" hides its dark background */}
          <img src="/images/hisn-mark.jpg" alt="" width={48} height={40} className="h-10 w-auto mix-blend-lighten" />
          <span className="leading-none">
            <span className="block text-2xl font-bold text-ink">حصن</span>
            <span className="block text-[0.65rem] tracking-[0.4em] text-stone">HISN</span>
          </span>
        </Link>

        <ul className="hidden flex-1 items-center justify-center gap-7 text-[0.95rem] lg:flex">
          {links.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="text-muted transition hover:text-cyan focus-visible:outline-2 focus-visible:outline-cyan">{label}</Link>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-3 lg:flex">{languageSwitch}{account}</div>

        {/* Mobile and tablet menu */}
        <details className="group relative ms-auto lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-white/15 bg-navy-950/60 px-4 text-sm focus-visible:outline-2 focus-visible:outline-cyan [&::-webkit-details-marker]:hidden">
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            {t.menu}
          </summary>
          <div className="absolute end-0 mt-2 w-64 space-y-1 rounded-xl border border-navy-700 bg-navy-900 p-3 shadow-2xl">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="block rounded-md px-3 py-2.5 text-ink hover:bg-navy-800">{label}</Link>
            ))}
            <div className="flex flex-wrap items-center gap-2 border-t border-navy-700 pt-3">{languageSwitch}{account}</div>
          </div>
        </details>
      </nav>
    </header>
  );
}
