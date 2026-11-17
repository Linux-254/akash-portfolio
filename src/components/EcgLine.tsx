"use client";

import { useEffect, useRef } from "react";
import { useApp } from "./AppContext";

// Smooth flowing Bezier calligraphic oscillograph tracing "akash" across screen center
const HERO_CURSIVE_AKASH_PATH =
  "M 0 54 " +
  "C 120 54, 210 54, 290 54 " +
  "C 312 54, 326 40, 336 30 C 344 22, 352 54, 366 54 " +
  "C 386 54, 396 24, 412 24 C 424 24, 424 52, 412 54 C 402 55, 398 36, 420 50 " +
  "C 434 60, 444 12, 444 12 C 444 12, 444 54, 444 54 C 444 42, 464 22, 474 28 C 464 38, 456 42, 478 54 " +
  "C 496 60, 506 24, 522 24 C 534 24, 534 52, 522 54 C 512 55, 508 36, 530 50 " +
  "C 548 60, 558 22, 574 24 C 586 26, 566 38, 580 44 C 594 50, 582 62, 566 54 " +
  "C 596 54, 608 12, 608 12 C 608 12, 608 54, 608 54 C 610 34, 634 24, 636 54 " +
  "C 648 54, 668 44, 682 54 C 694 62, 706 18, 718 54 C 726 74, 738 44, 750 54 " +
  "C 860 54, 1020 54, 1200 54";

function buildSmoothPulsePath(scrollProgress: number, ampScale: number): string {
  const amp = Math.min(22, 8 + ampScale * 14);
  let d = "M 0 54";
  const cycles = 7;
  const span = 1200 / cycles;
  const phase = (scrollProgress * 2.8) % 1;
  for (let i = 0; i < cycles; i++) {
    const x = i * span + phase * 36 - 18;
    const pY = 54 - amp * 0.24;
    const qY = 54 + amp * 0.34;
    const rY = 54 - amp;
    const sY = 54 + amp * 0.48;
    const tY = 54 - amp * 0.28;
    d += ` C ${(x + span * 0.1).toFixed(1)} 54, ${(x + span * 0.18).toFixed(1)} 54, ${(x + span * 0.24).toFixed(1)} 54`;
    d += ` C ${(x + span * 0.28).toFixed(1)} ${pY.toFixed(1)}, ${(x + span * 0.32).toFixed(1)} ${pY.toFixed(1)}, ${(x + span * 0.36).toFixed(1)} 54`;
    d += ` C ${(x + span * 0.39).toFixed(1)} ${qY.toFixed(1)}, ${(x + span * 0.43).toFixed(1)} ${rY.toFixed(1)}, ${(x + span * 0.46).toFixed(1)} ${rY.toFixed(1)}`;
    d += ` C ${(x + span * 0.49).toFixed(1)} ${rY.toFixed(1)}, ${(x + span * 0.52).toFixed(1)} ${sY.toFixed(1)}, ${(x + span * 0.56).toFixed(1)} 54`;
    d += ` C ${(x + span * 0.64).toFixed(1)} ${tY.toFixed(1)}, ${(x + span * 0.74).toFixed(1)} ${tY.toFixed(1)}, ${(x + span * 0.84).toFixed(1)} 54`;
  }
  return d + " C 1160 54, 1185 54, 1200 54";
}

function playEcgTick() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(980, ctx.currentTime);
    gain.gain.setValueAtTime(0.015, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0004, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.055);
  } catch {
    // Web Audio awaiting user gesture
  }
}

export function EcgLine() {
  const { soundMuted, ecgBootProgress, ecgBootDone } = useApp();
  const pathRef = useRef<SVGPathElement | null>(null);
  const labelRef = useRef<SVGTextElement | null>(null);
  const bootProgressRef = useRef(ecgBootProgress);
  const bootDoneRef = useRef(ecgBootDone);
  const soundMutedRef = useRef(soundMuted);

  useEffect(() => {
    bootProgressRef.current = ecgBootProgress;
    bootDoneRef.current = ecgBootDone;
  }, [ecgBootProgress, ecgBootDone]);

  useEffect(() => {
    soundMutedRef.current = soundMuted;
  }, [soundMuted]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let lastY = window.scrollY;
    let lastTime = performance.now();
    let smoothedVel = 0;
    let lastTickMs = 0;
    let rafId = 0;

    const update = () => {
      const now = performance.now();
      const dt = Math.max((now - lastTime) / 1000, 0.016);
      const y = window.scrollY;
      const vel = Math.abs(y - lastY) / dt;
      smoothedVel += (vel - smoothedVel) * 0.24;
      lastY = y;
      lastTime = now;

      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const p = Math.min(Math.max(y / maxScroll, 0), 1);
      const inHero = p < 0.16;

      if (pathRef.current) {
        if (inHero) {
          pathRef.current.setAttribute("d", HERO_CURSIVE_AKASH_PATH);
          const len = pathRef.current.getTotalLength();
          const bootSweep = bootDoneRef.current ? 1 : bootProgressRef.current;
          const scrollSweep = Math.min(0.45 + (p / 0.16) * 0.55, 1);
          const drawP = Math.min(bootSweep * scrollSweep + (bootDoneRef.current ? 0.55 : 0), 1);
          pathRef.current.style.strokeDasharray = `${len}`;
          pathRef.current.style.strokeDashoffset = `${len * (1 - drawP)}`;
        } else {
          const d = buildSmoothPulsePath(p, Math.min(smoothedVel / 1100, 1));
          pathRef.current.setAttribute("d", d);
          const len = pathRef.current.getTotalLength();
          const sweep = 0.25 + p * 0.75;
          pathRef.current.style.strokeDasharray = `${len}`;
          pathRef.current.style.strokeDashoffset = `${len * (1 - sweep)}`;
        }
      }

      if (labelRef.current) {
        const bootVis = bootDoneRef.current ? 1 : bootProgressRef.current;
        labelRef.current.style.opacity = inHero
          ? `${(0.76 * bootVis).toFixed(3)}`
          : "0.42";
      }

      if (!soundMutedRef.current && smoothedVel > 220 && now - lastTickMs > 420) {
        lastTickMs = now;
        playEcgTick();
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, [ecgBootProgress, ecgBootDone]);

  return (
    <div className="ecg-center-watermark" aria-hidden="true">
      <svg viewBox="0 0 1200 124" preserveAspectRatio="none" className="ecg-svg">
        <defs>
          <linearGradient id="ecg-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--c-bold)" stopOpacity="0.18" />
            <stop offset="28%" stopColor="var(--c-bold)" stopOpacity="0.88" />
            <stop offset="72%" stopColor="var(--c-bold)" stopOpacity="0.92" />
            <stop offset="100%" stopColor="var(--c-bold)" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <path
          ref={pathRef}
          d={HERO_CURSIVE_AKASH_PATH}
          fill="none"
          stroke="url(#ecg-grad)"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          ref={labelRef}
          x="600"
          y="108"
          textAnchor="middle"
          className="ecg-watermark-word"
          fill="var(--c-bold)"
        >
          Akash
        </text>
      </svg>
    </div>
  );
}
