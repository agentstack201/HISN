import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { getDict } from "@/lib/i18n";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";
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
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded focus:bg-navy-900 focus:p-2">Skip to content</a>
        <SiteHeader lang={lang} loggedIn={loggedIn} t={t.nav} appName={t.appName} />
        <main id="main" className="flex-1">{children}</main>
        <footer className="border-t border-navy-800 bg-navy-950">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div className="max-w-sm space-y-2">
              <p className="text-lg font-bold">حصن <span className="text-sm font-normal tracking-[0.3em] text-stone">HISN</span></p>
              <p className="text-sm text-muted">{t.footer}</p>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <li><Link className="hover:text-cyan" href="/#features">{t.nav.features}</Link></li>
              <li><Link className="hover:text-cyan" href="/#how">{t.nav.how}</Link></li>
              <li><Link className="hover:text-cyan" href="/help">{t.nav.resources}</Link></li>
              <li><Link className="hover:text-cyan" href="/#about">{t.nav.about}</Link></li>
              <li><Link className="hover:text-cyan" href="/login">{t.nav.login}</Link></li>
            </ul>
          </div>
        </footer>
        <ServiceWorker />
      </body>
    </html>
  );
}
