import { getDict } from "@/lib/i18n";

export const metadata = { title: "Help" };

export default async function HelpPage() {
  const { t } = await getDict();
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold">{t.nav.help}</h1>
      {/* Help text is English-only for now; mark it LTR so punctuation renders correctly in the Arabic layout. */}
      <div lang="en" dir="ltr" className="space-y-6 text-left">
      <section className="card space-y-2">
        <h2 className="text-lg font-semibold">What does a scan do?</h2>
        <p className="text-muted">
          HISN sends normal GET requests to the URL you saved (and to its http:// version), follows up to 5 redirects and reads the
          response headers, cookies and TLS certificate. It does not attack, log in, guess passwords, crawl, or scan ports.
        </p>
      </section>
      <section className="card space-y-2">
        <h2 className="text-lg font-semibold">Severity levels</h2>
        <ul className="list-disc space-y-1 ps-5 text-muted">
          <li><b>High</b> — no HTTPS or an untrusted certificate: traffic can be read or changed.</li>
          <li><b>Medium</b> — missing CSP/HSTS, no HTTPS redirect, insecure cookies, directory listing, risky CORS.</li>
          <li><b>Low</b> — hardening gaps such as missing nosniff, Referrer-Policy, version disclosure, framing.</li>
          <li><b>Informational</b> — observations and passed checks.</li>
        </ul>
        <p className="text-muted">The current checks never produce Critical findings: missing headers alone are not critical vulnerabilities.</p>
      </section>
      <section className="card space-y-2">
        <h2 className="text-lg font-semibold">Rules of use</h2>
        <p className="text-muted">Only add websites you own or have written permission to test. Private networks, localhost and cloud metadata addresses are blocked. Each account may run 5 scans per 10 minutes.</p>
        <p className="text-muted">{t.scans.networkNote}</p>
      </section>
      <section className="card space-y-2">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="text-muted">HISN is a diploma graduation project. For questions, contact the project team through your course supervisor.</p>
      </section>
      </div>
    </div>
  );
}
