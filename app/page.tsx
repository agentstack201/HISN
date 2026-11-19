/**
 * Homepage. Server component: only the video (components/HeroVideo.tsx) runs
 * in the browser. The dashboard preview uses clearly labelled sample data.
 */
import Link from "next/link";
import { getDict } from "@/lib/i18n";
import HeroVideo from "@/components/HeroVideo";
import Reveal from "@/components/Reveal";
import { SeverityBadge } from "@/components/ui";

// Simple line icons (24×24, stroke = currentColor) for the capability strip.
const icons = [
  <path key="0" d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Zm-3.5 9 2.5 2.5 4.5-5" />,
  <path key="1" d="M10.3 4.3a2 2 0 0 1 3.4 0l7.4 12.8A2 2 0 0 1 19.4 20H4.6a2 2 0 0 1-1.7-2.9L10.3 4.3ZM12 9v4m0 3.5v.01" />,
  <path key="2" d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6M9 17h4" />,
  <path key="3" d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.6 17.4a1.4 1.4 0 0 0 2 2l5.7-5.7a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-.6-.6-2 2.6-2Z" />,
];

// Illustrative numbers for the preview only (labelled as demonstration data).
const sampleSeverity = [
  ["high", 1],
  ["medium", 3],
  ["low", 4],
] as const;
const sampleScans = [
  ["example.com", "completed"],
  ["demo-site.test", "completed"],
  ["shop.test", "failed"],
] as const;

export default async function Home() {
  const { lang, t } = await getDict();
  const h = t.home;
  const arrow = lang === "ar" ? "←" : "→";

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden bg-navy-950 lg:min-h-[100svh]">
        {/* Video: full width on mobile (top), left ~70% on desktop so the fortress sits beside the text. */}
        <div className="relative aspect-[4/5] w-full sm:aspect-[1010/658] lg:absolute lg:inset-y-0 lg:end-0 lg:aspect-auto lg:w-[72%]">
          <HeroVideo pauseLabel={h.videoPause} playLabel={h.videoPlay} />
          {/* Light overlays only: blend video edges into the navy page and keep the header readable. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950 via-transparent to-navy-950/40 lg:via-navy-950/10" />
          <div aria-hidden className="pointer-events-none absolute inset-0 hidden bg-gradient-to-l from-navy-950 via-navy-950/30 to-transparent lg:block rtl:bg-gradient-to-l ltr:bg-gradient-to-r" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-7xl px-4 pb-14 sm:px-6 lg:min-h-[100svh] lg:items-center lg:pb-40 lg:pt-28">
          <div className="-mt-10 max-w-xl space-y-6 lg:mt-0">
            {/* Above the fold: a short staggered entrance instead of scroll reveal. */}
            <p className="eyebrow animate-[rise_var(--duration-slow)_var(--ease-out-soft)_both]">{h.eyebrow}</p>
            <h1 className="animate-[rise_var(--duration-slow)_var(--ease-out-soft)_both] text-4xl font-bold leading-[1.25] [animation-delay:90ms] sm:text-5xl xl:text-6xl">
              <span className="block text-ink">{h.title1}</span>
              <span className="block text-cyan">{h.title2}</span>
            </h1>
            <p className="animate-[rise_var(--duration-slow)_var(--ease-out-soft)_both] text-lg leading-relaxed text-ink/80 [animation-delay:180ms]">{h.intro}</p>
            <div className="flex animate-[rise_var(--duration-slow)_var(--ease-out-soft)_both] flex-col gap-3 [animation-delay:270ms] sm:flex-row">
              <Link href="/targets" className="btn-hero">{h.ctaPrimary} <span aria-hidden>{arrow}</span></Link>
              <Link href="#how" className="btn-hero-ghost">{h.ctaSecondary}</Link>
            </div>
          </div>
        </div>

        {/* ---------- Capability strip (real features, no statistics) ---------- */}
        <div id="features" className="relative z-10 mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:absolute lg:inset-x-0 lg:bottom-8 lg:pb-0">
          <ul className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {h.capabilities.map(([title, text], i) => (
              <li key={title} className="group flex gap-4 bg-navy-950/85 p-5 transition-colors hover:bg-navy-900/90">
                <svg aria-hidden className="mt-0.5 size-7 shrink-0 text-cyan transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{icons[i]}</svg>
                <div>
                  <h2 className="font-semibold text-ink">{title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Dashboard preview ---------- */}
      <Reveal as="section" className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-4">
          <p className="eyebrow">{h.previewEyebrow}</p>
          <h2 className="text-3xl font-bold sm:text-4xl">{h.previewTitle}</h2>
          <p className="text-lg text-muted">{h.previewText}</p>
        </div>

        <figure aria-label={h.sampleBadge} className="rounded-2xl border border-navy-700 bg-navy-900 p-4 shadow-glow sm:p-6">
          <figcaption className="mb-5 inline-flex rounded-full border border-warm/40 bg-warm/10 px-3 py-1 text-xs font-semibold text-warm">{h.sampleBadge}</figcaption>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-navy-950 p-4">
              <p className="text-sm text-muted">{h.previewSummary}</p>
              <div className="mt-3 flex gap-6">
                <p><span className="block text-3xl font-bold text-ink">8</span><span className="text-xs text-muted">{h.previewIssues}</span></p>
                <p><span className="block text-3xl font-bold text-cyan">5</span><span className="text-xs text-muted">{h.previewPassed}</span></p>
              </div>
            </div>
            <div className="rounded-xl bg-navy-950 p-4">
              <p className="mb-3 text-sm text-muted">{h.previewSeverity}</p>
              <div className="space-y-2">
                {sampleSeverity.map(([sev, n]) => (
                  <div key={sev} className="flex items-center gap-3 text-sm">
                    <span className="w-24"><SeverityBadge severity={sev} label={t.severity[sev]} /></span>
                    <span className="h-2 flex-1 rounded bg-navy-800"><span className="block h-2 rounded bg-cyan" style={{ width: `${n * 25}%` }} /></span>
                    <span className="w-4 tabular-nums">{n}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-navy-950 p-4">
              <p className="mb-2 text-sm text-muted">{h.previewRecent}</p>
              <ul className="divide-y divide-navy-800 text-sm">
                {sampleScans.map(([site, status]) => (
                  <li key={site} className="flex items-center justify-between py-2">
                    <span dir="ltr">{site}</span>
                    <span className={status === "completed" ? "text-teal-strong" : "text-red-300"}>{t.status[status]}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-cyan/20 bg-navy-950 p-4">
              <p className="text-sm text-muted">{h.previewFix}</p>
              <p className="mt-2 font-semibold text-ink">{h.previewFixTitle}</p>
              <p className="mt-1 text-sm text-muted">{h.previewFixText}</p>
            </div>
          </div>
        </figure>
      </Reveal>

      {/* ---------- How it works ---------- */}
      <section id="how" className="border-y border-navy-800 bg-navy-900/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <Reveal>
            <p className="eyebrow">{h.howEyebrow}</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{h.howTitle}</h2>
          </Reveal>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {h.steps.map(([title, text], i) => (
              <Reveal as="li" key={title} delay={i * 90} className="card card-hover group rounded-2xl bg-navy-950 p-6">
                <span className="flex size-10 items-center justify-center rounded-full bg-cyan text-lg font-bold text-navy-950 transition-transform duration-200 group-hover:scale-110">{i + 1}</span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- About + final CTA ---------- */}
      <Reveal as="section" id="about" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-navy-700 p-8">
            <h2 className="text-2xl font-bold">{h.aboutTitle}</h2>
            <p className="mt-3 leading-relaxed text-muted">{h.aboutText}</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-cyan/30 bg-navy-900 p-8">
            <div aria-hidden className="absolute -top-24 end-0 size-64 rounded-full bg-cyan/10 blur-3xl" />
            <h2 className="relative text-2xl font-bold">{h.finalTitle}</h2>
            <p className="relative mt-3 text-muted">{h.finalText}</p>
            <div className="relative mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="btn-hero">{t.nav.start} <span aria-hidden>{arrow}</span></Link>
              <Link href="/login" className="btn-hero-ghost">{t.nav.login}</Link>
            </div>
          </div>
        </div>
      </Reveal>
    </>
  );
}
