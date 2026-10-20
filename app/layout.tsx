import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getDict } from "@/lib/i18n";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { setLanguage, signOut } from "./actions";
import ServiceWorker from "@/components/ServiceWorker";

// One font family that supports both Latin and Arabic script.
const plex = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" });

export const metadata: Metadata = {
  title: { default: "HISN — Web Security Assessment", template: "%s · HISN" },
  description: "Assess websites you own for common security weaknesses and learn how to fix them.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#070d1a" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getDict();
  let loggedIn = false;
  if (supabaseConfigured) {
    const { data } = await (await createClient()).auth.getUser();
    loggedIn = Boolean(data.user);
  }

  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className={plex.variable}>
      <body className="flex min-h-screen flex-col antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:p-2">Skip to content</a>
        <header className="border-b border-navy-800 bg-navy-900/80">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-ink">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG logo */}
              <img src="/icons/icon.svg" alt="" width={28} height={28} />
              {t.appName}
            </Link>
            <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
              {loggedIn && (
                <>
                  <Link className="text-muted hover:text-ink" href="/dashboard">{t.nav.dashboard}</Link>
                  <Link className="text-muted hover:text-ink" href="/targets">{t.nav.targets}</Link>
                  <Link className="text-muted hover:text-ink" href="/scans">{t.nav.scans}</Link>
                  <Link className="text-muted hover:text-ink" href="/settings">{t.nav.settings}</Link>
                </>
              )}
              <Link className="text-muted hover:text-ink" href="/help">{t.nav.help}</Link>
            </div>
            <form action={setLanguage}>
              <input type="hidden" name="lang" value={lang === "ar" ? "en" : "ar"} />
              <button className="text-muted hover:text-ink" aria-label="Switch language">{lang === "ar" ? "English" : "العربية"}</button>
            </form>
            {loggedIn ? (
              <form action={signOut}><button className="btn-ghost">{t.nav.logout}</button></form>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">{t.nav.login}</Link>
                <Link href="/register" className="btn">{t.nav.register}</Link>
              </>
            )}
          </nav>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-navy-800 px-4 py-6 text-center text-xs text-muted">{t.footer}</footer>
        <ServiceWorker />
      </body>
    </html>
  );
}
