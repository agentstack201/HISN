"use client";
/**
 * Silent, looping fortress video for the homepage hero.
 * - Always muted and playsInline so mobile browsers allow autoplay.
 * - The poster image is shown if the video cannot play.
 * - Respects "prefers-reduced-motion" (does not autoplay) and offers a
 *   pause/play button, because moving content longer than 5 s should be pausable.
 */
import { useEffect, useRef, useState } from "react";

export default function HeroVideo({ pauseLabel, playLabel }: { pauseLabel: string; playLabel: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // play() can be rejected (e.g. power saving); the poster then stays visible.
    el.play().catch(() => setPlaying(false));
  }, []);

  function toggle() {
    const el = video.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => undefined);
    else el.pause();
  }

  return (
    <>
      <video
        ref={video}
        className="h-full w-full object-cover object-center"
        poster="/images/hisn-fortress-poster.jpg"
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        {/* WebM (VP9) first: smaller and supported by Chromium builds without H.264; MP4 for Safari/iOS. */}
        <source src="/videos/hisn-fortress.webm" type="video/webm" />
        <source src="/videos/hisn-fortress.mp4" type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? pauseLabel : playLabel}
        className="absolute top-20 end-4 z-20 lg:top-24 flex size-10 items-center justify-center rounded-full border border-white/20 bg-navy-950/60 text-ink hover:border-cyan focus-visible:outline-2 focus-visible:outline-cyan"
      >
        {playing ? (
          <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="1" width="3.5" height="12" rx="1" /><rect x="8.5" y="1" width="3.5" height="12" rx="1" /></svg>
        ) : (
          <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1.5v11l9-5.5z" /></svg>
        )}
      </button>
    </>
  );
}
