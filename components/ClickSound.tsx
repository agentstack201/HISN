"use client";
/**
 * Optional click sound for buttons and links, plus an on/off switch.
 * The sound file (public/sounds/click.mp3, 0.36 s) is downloaded and decoded
 * once, then played through the Web Audio API so rapid clicks never lag.
 * The choice is remembered in localStorage on this device only.
 * Sounds only play after a user click, so browsers never block them.
 */
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "hisn-sound";
const SOUND_URL = "/sounds/click.mp3";
const VOLUME = 0.6;

export default function ClickSound({ onLabel, offLabel }: { onLabel: string; offLabel: string }) {
  const [enabled, setEnabled] = useState(true);
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<Promise<AudioBuffer> | null>(null);

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
      const ctx = (ctxRef.current ??= new AudioContext());
      // Load and decode the file on the first click only; later clicks reuse it.
      bufferRef.current ??= fetch(SOUND_URL)
        .then((res) => res.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data));
      bufferRef.current
        .then((buffer) => {
          const source = ctx.createBufferSource();
          const gain = ctx.createGain();
          source.buffer = buffer;
          gain.gain.value = VOLUME;
          source.connect(gain).connect(ctx.destination);
          source.start();
        })
        .catch(() => {
          bufferRef.current = null; // try again on the next click
        });
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
