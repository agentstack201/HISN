/**
 * Site-wide header. It floats over the homepage video and gains a solid
 * backdrop once the page is scrolled (see ScrollState).
 * Inner pages add top padding for it in app/(app)/layout.tsx.
 */
import Link from "next/link";
import { setLanguage, signOut } from "@/app/actions";
import type { Lang } from "@/lib/i18n";
import ClickSound from "./ClickSound";
import MobileMenu from "./MobileMenu";
import ScrollState from "./ScrollState";

interface Props {
  lang: Lang;
  loggedIn: boolean;
  t: Record<
    "home" | "features" | "how" | "resources" | "about" | "start" | "menu" | "dashboard" | "targets" | "scans" | "settings" | "login" | "logout" | "soundOn" | "soundOff",
    string
  >;
  appName: string;
}

export default function SiteHeader({ lang, loggedIn, t, appName }: Props) {
  const links = loggedIn
    ? [
        ["/dashboard", t.dashboard],
        ["/targets", t.targets],
        ["/scans", t.scans],
        ["/settings", t.settings],
        ["/help", t.resources],
      ]
    : [
        ["/", t.home],
        ["/#features", t.features],
        ["/#how", t.how],
        ["/help", t.resources],
        ["/#about", t.about],
      ];

  const languageSwitch = (
    <form action={setLanguage}>
      <input type="hidden" name="lang" value={lang === "ar" ? "en" : "ar"} />
      <button
        className="flex min-h-10 items-center rounded-full border border-white/10 px-3 text-sm text-muted transition hover:border-cyan hover:text-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        aria-label="Switch language"
      >
        {lang === "ar" ? "EN" : "عربي"}
      </button>
    </form>
  );
  const account = loggedIn ? (
    <form action={signOut}>
      <button className="btn-ghost rounded-full">{t.logout}</button>
    </form>
  ) : (
    <>
      <Link href="/login" className="btn-ghost rounded-full">
        {t.login}
      </Link>
      <Link href="/register" className="btn-hero min-h-10 px-5 py-2 text-sm">
        {t.start}
      </Link>
    </>
  );

  return (
    <header
      data-site-header
      className="fixed inset-x-0 top-0 z-40 border-b border-transparent bg-gradient-to-b from-navy-950/95 via-navy-950/60 to-transparent transition-[background-color,border-color,backdrop-filter] duration-300 data-[scrolled=true]:border-navy-800 data-[scrolled=true]:bg-navy-950/85 data-[scrolled=true]:backdrop-blur-md"
    >
      <ScrollState />
      <nav aria-label="Main" className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan" aria-label={appName}>
          {/* eslint-disable-next-line @next/next/no-img-element -- small static logo; "lighten" hides its dark background */}
          <img src="/images/hisn-mark.jpg" alt="" width={48} height={40} className="h-10 w-auto mix-blend-lighten transition-transform duration-300 hover:scale-105" />
          <span className="leading-none">
            <span className="block text-2xl font-bold text-ink">حصن</span>
            <span className="block text-[0.65rem] tracking-[0.4em] text-stone">HISN</span>
          </span>
        </Link>

        <ul className="hidden flex-1 items-center justify-center gap-7 text-[0.95rem] lg:flex">
          {links.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="nav-link">
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-3 lg:flex">
          {languageSwitch}
          {account}
        </div>

        <div className="ms-auto lg:ms-0">
          <ClickSound onLabel={t.soundOn} offLabel={t.soundOff} />
        </div>

        <MobileMenu label={t.menu}>
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="block rounded-lg px-3 py-2.5 text-ink transition hover:bg-navy-800">
              {label}
            </Link>
          ))}
          <div className="flex flex-wrap items-center gap-2 border-t border-navy-700 pt-3">
            {languageSwitch}
            {account}
          </div>
        </MobileMenu>
      </nav>
    </header>
  );
}
