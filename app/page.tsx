import Link from "next/link";
import { getDict } from "@/lib/i18n";

export default async function Home() {
  const { t } = await getDict();
  return (
    <div className="space-y-14">
      <section className="max-w-3xl space-y-5 pt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-strong">{t.tagline}</p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{t.landing.title}</h1>
        <p className="text-lg text-muted">{t.landing.intro}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/register" className="btn">{t.landing.start}</Link>
          <Link href="/help" className="btn-ghost">{t.nav.help}</Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">{t.landing.featuresTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.landing.features.map(([title, text]) => (
            <div key={title} className="card">
              <h3 className="mb-2 font-semibold text-teal-strong">{title}</h3>
              <p className="text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-xl font-semibold">{t.landing.howTitle}</h2>
          <ol className="list-decimal space-y-2 ps-5 text-muted">
            {t.landing.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </div>
        <div className="card border-amber-300/30">
          <h2 className="mb-4 text-xl font-semibold">{t.landing.limitsTitle}</h2>
          <p className="text-muted">{t.landing.limits}</p>
        </div>
      </section>
    </div>
  );
}
