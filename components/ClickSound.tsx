"use client";
/**
 * Optional "digital" click sound for buttons and links, plus an on/off switch.
 * The sound is generated with the Web Audio API (no audio files to download).
 * The choice is remembered in localStorage on this device only.
 * Sounds only play after a user click, so browsers never block them.
 */
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "hisn-sound";

// Two very short rising tones: a light "terminal / script" chirp.
function playChirp(ctx: AudioContext) {
  const now = ctx.currentTime;
  for (const [start, from, to] of [[0, 1400, 2600], [0.05, 2000, 3200]]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(from, now + start);
    osc.frequency.exponentialRampToValueAtTime(to, now + start + 0.04);
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.06, now + start + 0.005); // quiet on purpose
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + 0.06);
  }
}

export default function ClickSound({ onLabel, offLabel }: { onLabel: string; offLabel: string }) {
  const [enabled, setEnabled] = useState(true);
  const ctxRef = useRef<AudioContext | null>(null);

  // Read the saved choice once (storage can be blocked, e.g. private mode).
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "off") setEnabled(false);
    } catch {}
  }, []);

  // One listener for the whole page: any button, link or menu toggle clicked.
  useEffect(() => {
    if (!enabled) return;
    function onClick(e: MouseEvent) {
      if (!(e.target as Element).closest("button, a, summary")) return;
      ctxRef.current ??= new AudioContext();
      playChirp(ctxRef.current);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [enabled]);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? offLabel : onLabel}
      title={enabled ? offLabel : onLabel}
      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-muted hover:text-cyan focus-visible:outline-2 focus-visible:outline-cyan"
    >
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        {enabled ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 6 6m0-6-6 6" />}
      </svg>
    </button>
  );
}
